import type { ReceiptData } from "@/lib/comprobante/types";
import { formatReceiptNumber } from "@/lib/receipt-format";
import { buildPublicComprobanteUrl } from "@/lib/comprobante/share-link";

function resolvePublicUrl(receipt: ReceiptData, documentId?: number): string {
  if (receipt.share_token) return buildPublicComprobanteUrl(receipt.share_token);
  if (documentId != null) {
    throw new Error("Generando enlace seguro…");
  }
  throw new Error("Enlace público no disponible");
}

export function buildWhatsAppUrl(input: {
  phone?: string | null;
  receipt: ReceiptData;
  documentId?: number;
}): string {
  const viewUrl = resolvePublicUrl(input.receipt, input.documentId);
  const number = formatReceiptNumber(input.receipt.number);
  const text = [
    `${input.receipt.document_type_label} ${number}`,
    `Cliente: ${input.receipt.customer_name}`,
    `Total: S/ ${input.receipt.total.toFixed(2)}`,
    `Ver comprobante: ${viewUrl}`,
  ].join("\n");

  let phone = String(
    input.phone ?? process.env.NEXT_PUBLIC_COMPANY_WHATSAPP ?? process.env.COMPANY_WHATSAPP ?? "51998624131"
  ).replace(/\D/g, "");
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (!phone.startsWith("51") && phone.length === 9) phone = `51${phone}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export { resolvePublicUrl as resolveComprobantePublicUrl };
