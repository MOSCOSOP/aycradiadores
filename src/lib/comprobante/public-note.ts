import { prisma } from "@/lib/db/prisma";
import { generateShareToken, getPublicAppUrl } from "@/lib/comprobante/share-link";
import { buildReceiptFromApiDoc } from "@/lib/comprobante/build-receipt-data";
import type { ReceiptData } from "@/lib/comprobante/types";

export function buildPublicNoteUrl(token: string): string {
  return `${getPublicAppUrl()}/n/${token}`;
}

export function buildPublicQuotationUrl(token: string): string {
  return `${getPublicAppUrl()}/q/${token}`;
}

export async function ensureSaleNoteShareToken(id: number): Promise<string> {
  const row = await prisma.saleNote.findUnique({ where: { id }, select: { shareToken: true } });
  if (!row) throw new Error("Nota de venta no encontrada");
  if (row.shareToken) return row.shareToken;
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      const updated = await prisma.saleNote.update({ where: { id }, data: { shareToken: token }, select: { shareToken: true } });
      return updated.shareToken!;
    } catch {
      /* colisión de token */
    }
  }
  throw new Error("No se pudo generar enlace seguro");
}

export async function ensureQuotationShareToken(id: number): Promise<string> {
  const row = await prisma.quotation.findUnique({ where: { id }, select: { shareToken: true } });
  if (!row) throw new Error("Cotización no encontrada");
  if (row.shareToken) return row.shareToken;
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      const updated = await prisma.quotation.update({ where: { id }, data: { shareToken: token }, select: { shareToken: true } });
      return updated.shareToken!;
    } catch {
      /* colisión de token */
    }
  }
  throw new Error("No se pudo generar enlace seguro");
}

/** Usa la MISMA plantilla de impresión que los comprobantes (DocumentPrintTemplate) — se arma
 * un ReceiptData a partir de la nota/cotización, tratando el total como no gravado (estos
 * documentos no calculan IGV real, no son comprobantes electrónicos). */
export async function getSaleNoteByShareToken(token: string): Promise<ReceiptData | null> {
  const n = await prisma.saleNote.findUnique({
    where: { shareToken: token },
    include: { customer: true, items: true },
  });
  if (!n) return null;
  return buildReceiptFromApiDoc({
    document_type_id: "NV",
    document_type_description: "NOTA DE VENTA",
    number: n.number,
    customer_name: n.customer.name,
    customer_number: n.customer.number,
    customer_address: n.customer.address,
    currency_type_id: n.currencyTypeId,
    date_of_issue: n.date.toISOString().slice(0, 10),
    plate: n.plate,
    purchase_order: n.purchaseOrder,
    total: n.total,
    total_taxed: 0,
    total_igv: 0,
    total_exonerated: n.total,
    share_token: token,
    items: n.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_type_id: "NIU",
      unit_price: i.unitPrice,
      total: i.total,
    })),
  });
}

export async function getQuotationByShareToken(token: string): Promise<ReceiptData | null> {
  const q = await prisma.quotation.findUnique({
    where: { shareToken: token },
    include: { customer: true, items: true },
  });
  if (!q) return null;
  return buildReceiptFromApiDoc({
    document_type_id: "COT",
    document_type_description: "COTIZACIÓN",
    number: q.number,
    customer_name: q.customer.name,
    customer_number: q.customer.number,
    customer_address: q.customer.address,
    date_of_issue: q.date.toISOString().slice(0, 10),
    total: q.total,
    total_taxed: 0,
    total_igv: 0,
    total_exonerated: q.total,
    share_token: token,
    items: q.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_type_id: "NIU",
      unit_price: i.unitPrice,
      total: i.total,
    })),
  });
}
