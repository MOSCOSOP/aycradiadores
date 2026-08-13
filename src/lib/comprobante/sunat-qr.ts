import { formatReceiptNumber } from "@/lib/receipt-format";
import { COMPANY_INFO } from "@/lib/company-info";

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

function publicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return origin.replace(/\/$/, "");
    }
  }
  return "https://aycradiadores.vercel.app";
}

function shortDocName(label: string): string {
  const t = label.toLowerCase();
  if (t.includes("factura")) return "factura";
  if (t.includes("crédito") || t.includes("credito")) return "nota de crédito";
  if (t.includes("débito") || t.includes("debito")) return "nota de débito";
  if (t.includes("guía") || t.includes("guia")) return "guía";
  return "boleta";
}

/** Texto que aparece al escanear el QR de impresión */
export function buildPrintQrMessage(input: {
  documentLabel: string;
  sunatPayload: string;
  shareToken?: string;
}): string {
  const kind = shortDocName(input.documentLabel);
  const link = input.shareToken ? `${publicAppUrl()}/c/${input.shareToken}` : "";

  const lines = [
    COMPANY_INFO.tradeName,
    input.documentLabel,
    "",
    "Estos datos son para que los utilice en Consulta SUNAT:",
    input.sunatPayload,
    "",
  ];

  if (link) {
    lines.push(`Este enlace es el oficial de la ${kind} en nuestra página:`);
    lines.push(link);
  }

  return lines.join("\n");
}

export function sunatQrImageUrl(payload: string, size = 140): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}
