import type { ReceiptData } from "@/lib/comprobante/types";
import { formatReceiptNumber } from "@/lib/receipt-format";

function appBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function buildEmailComposeContent(receipt: ReceiptData, documentId?: number) {
  const number = formatReceiptNumber(receipt.number);
  const viewUrl =
    documentId != null ? `${appBaseUrl()}/documents/${documentId}` : `${appBaseUrl()}/documents`;
  const emisor = receipt.emisor?.nombreComercial ?? "A&C RADIADORES";

  const subject = `${receipt.document_type_label} ${number}`;

  const itemLines = receipt.items
    .slice(0, 12)
    .map(
      (it) =>
        `  • ${it.code ? `[${it.code}] ` : ""}${it.description} — ${it.quantity} ${it.unit} x S/ ${it.unit_price.toFixed(2)} = S/ ${it.total.toFixed(2)}`
    );

  const body = [
    `Estimado(a) ${receipt.customer_name},`,
    "",
    "Le compartimos su comprobante electrónico:",
    "",
    receipt.document_type_label,
    `Nro. ${number}`,
    `Fecha de emisión: ${receipt.date_of_issue}`,
    `Cliente: ${receipt.customer_name} (${receipt.customer_number})`,
    "",
    "Detalle:",
    ...itemLines,
    receipt.items.length > 12 ? `  ... y ${receipt.items.length - 12} ítem(s) más` : "",
    "",
    `Subtotal gravado: S/ ${receipt.total_taxed.toFixed(2)}`,
    `IGV (18%): S/ ${receipt.total_igv.toFixed(2)}`,
    `TOTAL: S/ ${receipt.total.toFixed(2)}`,
    "",
    "Ver e imprimir comprobante (PDF):",
    viewUrl,
    "",
    "Representación impresa del Comprobante de Venta Electrónico.",
    "Consulte su validez en https://e-consulta.sunat.gob.pe/",
    "",
    "Atentamente,",
    emisor,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, body, viewUrl };
}

/** Abre Gmail con destinatario, asunto y mensaje listos — solo falta pulsar Enviar */
export function openGmailCompose(to: string, subject: string, body: string) {
  const url = new URL("https://mail.google.com/mail/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("to", to);
  url.searchParams.set("su", subject);
  url.searchParams.set("body", body);
  window.open(url.toString(), "_blank");
}

/** Fallback mailto para otros clientes de correo */
export function openMailtoCompose(to: string, subject: string, body: string) {
  const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

export function openEmailCompose(receipt: ReceiptData, to: string, documentId?: number) {
  const { subject, body } = buildEmailComposeContent(receipt, documentId);
  openGmailCompose(to, subject, body);
}
