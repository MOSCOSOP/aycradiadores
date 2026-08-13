import { formatReceiptNumber } from "@/lib/receipt-format";

/** Tipo documento identidad receptor SUNAT */
export function customerDocTypeId(number: string): string {
  const n = String(number ?? "").replace(/\D/g, "");
  if (n.length === 11) return "6";
  if (n.length === 8) return "1";
  if (n === "99999999" || n === "00000000") return "0";
  return n.length > 0 ? "1" : "0";
}

export function formatSunatDate(iso: string): string {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return iso;
  }
}

/** Payload QR SUNAT (pipe-separated) */
export function buildSunatQrPayload(input: {
  ruc: string;
  documentTypeId: string;
  number: string;
  totalIgv: number;
  total: number;
  dateOfIssue: string;
  customerNumber: string;
}): string {
  const formatted = formatReceiptNumber(input.number);
  const m = formatted.match(/^([A-Z0-9]+)-(\d+)$/i);
  const serie = m ? m[1].toUpperCase() : formatted;
  const correlativo = m ? m[2] : "0";

  return [
    input.ruc,
    input.documentTypeId,
    serie,
    correlativo,
    input.totalIgv.toFixed(2),
    input.total.toFixed(2),
    formatSunatDate(input.dateOfIssue),
    customerDocTypeId(input.customerNumber),
    String(input.customerNumber ?? "").replace(/\D/g, "") || "0",
  ].join("|");
}

export function sunatQrImageUrl(payload: string, size = 140): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
