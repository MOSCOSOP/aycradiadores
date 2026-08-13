import { prisma } from "@/lib/db/prisma";
import { buildReceiptFromApiDoc } from "@/lib/comprobante/build-receipt-data";
import { generateShareToken } from "@/lib/comprobante/share-link";
import type { ReceiptData } from "@/lib/comprobante/types";

export async function ensureDocumentShareToken(documentId: number): Promise<string> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { shareToken: true },
  });
  if (!doc) throw new Error("Comprobante no encontrado");
  if (doc.shareToken) return doc.shareToken;

  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      const updated = await prisma.document.update({
        where: { id: documentId },
        data: { shareToken: token },
        select: { shareToken: true },
      });
      return updated.shareToken!;
    } catch {
      /* colisión de token */
    }
  }
  throw new Error("No se pudo generar enlace seguro");
}

export async function getDocumentByShareToken(token: string): Promise<ReceiptData | null> {
  const doc = await prisma.document.findUnique({
    where: { shareToken: token },
    include: {
      customer: true,
      seller: true,
      items: { include: { item: true } },
    },
  });
  if (!doc) return null;

  return buildReceiptFromApiDoc({
    id: doc.id,
    document_type_id: doc.documentTypeId,
    document_type_description: doc.documentTypeId,
    number: doc.fullNumber,
    customer_name: doc.customer.name,
    customer_number: doc.customer.number,
    customer_address: doc.customer.address,
    customer_email: doc.customer.email,
    customer_phone: doc.customer.telephone,
    seller_name: doc.seller?.name ?? "ADMINISTRADOR",
    date_of_issue: doc.dateOfIssue.toISOString().slice(0, 10),
    date_of_due: doc.dateOfDue.toISOString().slice(0, 10),
    currency_type_id: doc.currencyTypeId,
    total: doc.total,
    total_taxed: doc.totalTaxed,
    total_igv: doc.totalIgv,
    total_exonerated: doc.totalExonerated,
    payment_method: "Contado",
    payment_condition: "Contado",
    plate: doc.plate,
    share_token: doc.shareToken ?? token,
    items: doc.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_type_id: i.unitTypeId,
      unit_price: i.unitPrice,
      total: i.totalPrice,
      internal_id: i.item?.internalId,
    })),
  });
}
