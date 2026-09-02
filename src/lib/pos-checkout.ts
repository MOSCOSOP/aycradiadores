import { prisma } from "@/lib/db/prisma";
import { IGV_FACTOR } from "@/lib/tax";
import { formatReceiptNumber } from "@/lib/receipt-format";
import { generateShareToken } from "@/lib/comprobante/share-link";
import { resolvePosCustomerId, resolvePosItemId, ensurePosInfrastructure } from "@/lib/pos-infrastructure";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type CartLine = {
  id?: unknown;
  item_id?: unknown;
  description?: unknown;
  quantity?: unknown;
  sale_unit_price?: unknown;
  unit_type_id?: unknown;
};

export type PosCheckoutResult = {
  success: true;
  receipt: {
    kind: string;
    id: number;
    number: string;
    document_type_id: string;
    document_type_label: string;
    series_label: string;
    customer_name: string;
    customer_number: string;
    customer_address: string;
    items: { code?: string; description: string; quantity: number; unit: string; unit_price: number; total: number }[];
    share_token?: string;
    customer_email?: string;
    customer_phone?: string;
    total: number;
    total_taxed: number;
    total_igv: number;
    total_exonerated: number;
    payment_method: string;
    payment_condition: string;
    date_of_issue: string;
    plate?: string;
    credit_installments?: { amount: number; due_date: string }[];
  };
};

function docLabel(kind: string) {
  if (kind === "factura") return "FACTURA ELECTRÓNICA";
  if (kind === "boleta") return "BOLETA DE VENTA ELECTRÓNICA";
  if (kind === "sale_note") return "NOTA DE VENTA";
  return "COTIZACIÓN";
}

async function resolveCustomer(body: Record<string, unknown>) {
  const id = await resolvePosCustomerId(
    body.customer_id,
    body.customer_number ? String(body.customer_number) : null,
    body.customer_name ? String(body.customer_name) : null
  );
  const c = await prisma.customer.findUnique({ where: { id } });
  if (c) return c;
  throw new Error("Cliente no encontrado");
}

export async function processPosCheckout(body: Record<string, unknown>): Promise<PosCheckoutResult> {
  const cart = (body.items as CartLine[]) || [];
  if (!cart.length) throw new Error("Carrito vacío");

  const kind = String(body.document_kind || "boleta");
  const paymentMethod = String(body.payment_method || "efectivo");
  const paymentCondition = String(body.payment_condition || "contado");
  const creditInstallments = (body.credit_installments as { amount: number; due_date: string }[]) || [];

  const { user, establishment } = await ensurePosInfrastructure();
  const customer = await resolveCustomer(body);

  const lines = await Promise.all(
    cart.map(async (it) => {
      const qty = Number(it.quantity || 1);
      const unitPrice = Number(it.sale_unit_price || 0);
      const itemId = await resolvePosItemId(it.id ?? it.item_id);
      let internalId: string | null = null;
      // La afectación a IGV se toma del ítem real en BD (fuente de verdad), no del carrito del cliente.
      let hasIgv = true;
      let saleAffectationTypeId = "10";
      if (itemId) {
        const dbItem = await prisma.item.findUnique({
          where: { id: itemId },
          select: { internalId: true, hasIgv: true, saleAffectationTypeId: true },
        });
        internalId = dbItem?.internalId ?? null;
        if (dbItem) {
          hasIgv = dbItem.hasIgv;
          saleAffectationTypeId = dbItem.saleAffectationTypeId;
        }
      }
      const unitValue = hasIgv ? Math.round((unitPrice / IGV_FACTOR) * 10000) / 10000 : unitPrice;
      return {
        itemId,
        internalId,
        hasIgv,
        saleAffectationTypeId,
        description: String(it.description || ""),
        unitTypeId: String(it.unit_type_id || "NIU"),
        quantity: qty,
        unitValue,
        unitPrice,
        totalValue: qty * unitValue,
        totalPrice: qty * unitPrice,
      };
    })
  );

  const total = lines.reduce((s, l) => s + l.totalPrice, 0);
  const totalTaxed = round2(lines.filter((l) => l.hasIgv).reduce((s, l) => s + l.totalValue, 0));
  const totalExonerated = round2(lines.filter((l) => !l.hasIgv).reduce((s, l) => s + l.totalValue, 0));
  const totalIgv = round2(lines.filter((l) => l.hasIgv).reduce((s, l) => s + (l.totalPrice - l.totalValue), 0));
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);

  if (kind === "sale_note") {
    const num = await nextNoteNumber();
    const note = await prisma.saleNote.create({
      data: {
        number: num,
        customerId: customer.id,
        total,
        state: paymentCondition === "credito" ? "Crédito" : "Registrado",
        plate: body.plate ? String(body.plate) : null,
        paymentStatus: paymentCondition === "credito" ? "Pendiente" : "Pagado",
        items: {
          create: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.totalPrice,
          })),
        },
      },
    });
    return buildResult("sale_note", note.id, num, "NV", customer, lines, total, totalTaxed, totalIgv, totalExonerated, paymentMethod, paymentCondition, dateStr, body, creditInstallments);
  }

  if (kind === "quotation") {
    const num = await nextQuotationNumber();
    const q = await prisma.quotation.create({
      data: {
        number: num,
        customerId: customer.id,
        total,
        state: "Pendiente",
        items: {
          create: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            total: l.totalPrice,
          })),
        },
      },
    });
    return buildResult("quotation", q.id, num, "COT", customer, lines, total, totalTaxed, totalIgv, totalExonerated, paymentMethod, paymentCondition, dateStr, body, creditInstallments);
  }

  const docTypeId = kind === "factura" ? "01" : "03";
  const series = await prisma.series.findFirst({
    where: { documentTypeId: docTypeId, establishmentId: establishment.id },
  });
  if (!series) throw new Error(`Serie no configurada para ${kind}`);

  const nextNum = series.currentNumber + 1;
  // Evita repetir un número ya usado en el historial importado del sistema anterior (ver
  // src/lib/api/local/router.ts::assertNoNumberCollision — misma verificación, POS es otra
  // vía de emisión).
  const importedDocs = await (await import("@/lib/imported-data")).readImportedModule("documents");
  if (importedDocs?.some((d) => String((d as Record<string, unknown>).number ?? "") === `${series.number}-${nextNum}`)) {
    throw new Error(
      `El número ${series.number}-${nextNum} ya fue usado en el historial del sistema anterior. El contador de la serie está desincronizado — hay que corregirlo antes de emitir.`
    );
  }
  const fullNumber = `${series.number}-${nextNum}`;

  const doc = await prisma.$transaction(async (tx) => {
    await tx.series.update({ where: { id: series.id }, data: { currentNumber: nextNum } });
    const created = await tx.document.create({
      data: {
        documentTypeId: docTypeId,
        series: series.number,
        number: nextNum,
        fullNumber,
        customerId: customer.id,
        sellerId: user.id,
        establishmentId: establishment.id,
        dateOfIssue: today,
        dateOfDue: today,
        currencyTypeId: String(body.currency_type_id || "PEN"),
        exchangeRate: Number(body.exchange_rate || 1),
        operationTypeId: "0101",
        totalTaxed,
        totalIgv,
        totalExonerated,
        total,
        plate: body.plate ? String(body.plate) : null,
        stateTypeId: "01",
        shareToken: generateShareToken(),
        items: {
          create: lines.map((l) => ({
            itemId: l.itemId,
            description: l.description,
            unitTypeId: l.unitTypeId,
            quantity: l.quantity,
            unitValue: l.unitValue,
            unitPrice: l.unitPrice,
            totalValue: l.totalValue,
            totalPrice: l.totalPrice,
            saleAffectationTypeId: l.saleAffectationTypeId,
          })),
        },
      },
      include: { customer: true },
    });

    for (const li of lines) {
      if (li.itemId) {
        await tx.item.update({
          where: { id: li.itemId },
          data: { stock: { decrement: li.quantity } },
        });
      }
    }
    return created;
  });

  try {
    const { autoSendAfterCreate } = await import("@/lib/sunat/send-document");
    await autoSendAfterCreate(doc.id);
  } catch {
    /* opcional */
  }

  return buildResult(
    kind,
    doc.id,
    doc.fullNumber,
    series.number,
    customer,
    lines,
    total,
    totalTaxed,
    totalIgv,
    totalExonerated,
    paymentMethod,
    paymentCondition,
    dateStr,
    body,
    creditInstallments,
    doc.shareToken ?? undefined
  );
}

function buildResult(
  kind: string,
  id: number,
  number: string,
  seriesLabel: string,
  customer: { name: string; number: string; address: string | null; email?: string | null; telephone?: string | null },
  lines: { itemId: number | null; description: string; quantity: number; unitTypeId: string; unitPrice: number; totalPrice: number; internalId?: string | null }[],
  total: number,
  totalTaxed: number,
  totalIgv: number,
  totalExonerated: number,
  paymentMethod: string,
  paymentCondition: string,
  dateStr: string,
  body: Record<string, unknown>,
  creditInstallments: { amount: number; due_date: string }[],
  shareToken?: string
): PosCheckoutResult {
  const docTypeId = kind === "factura" ? "01" : kind === "boleta" ? "03" : kind === "sale_note" ? "NV" : "COT";
  return {
    success: true,
    receipt: {
      kind,
      id,
      number: formatReceiptNumber(number),
      document_type_id: docTypeId,
      document_type_label: docLabel(kind),
      series_label: seriesLabel,
      customer_name: customer.name,
      customer_number: customer.number,
      customer_address: customer.address || "HUÁNUCO - HUÁNUCO - HUÁNUCO",
      customer_email: customer.email ?? undefined,
      customer_phone: customer.telephone ?? undefined,
      share_token: shareToken,
      items: lines.map((l) => ({
        code: l.internalId ?? undefined,
        description: l.description,
        quantity: l.quantity,
        unit: l.unitTypeId,
        unit_price: l.unitPrice,
        total: l.totalPrice,
      })),
      total,
      total_taxed: totalTaxed,
      total_igv: totalIgv,
      total_exonerated: totalExonerated,
      payment_method: paymentMethod,
      payment_condition: paymentCondition,
      date_of_issue: dateStr,
      plate: body.plate ? String(body.plate) : undefined,
      credit_installments: creditInstallments.length ? creditInstallments : undefined,
    },
  };
}

async function nextNoteNumber() {
  const count = await prisma.saleNote.count();
  return `NV01-${String(count + 1).padStart(4, "0")}`;
}

async function nextQuotationNumber() {
  const count = await prisma.quotation.count();
  return `COT-${String(count + 1).padStart(4, "0")}`;
}
