import type { ReceiptData } from "@/lib/comprobante/types";
import { formatReceiptNumber } from "@/lib/receipt-format";

function appBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function buildWhatsAppUrl(input: {
  phone?: string | null;
  receipt: ReceiptData;
  documentId?: number;
}): string {
  const viewUrl =
    input.documentId != null
      ? `${appBaseUrl()}/documents/${input.documentId}`
      : `${appBaseUrl()}/documents`;
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
