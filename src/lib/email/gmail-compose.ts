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

export function buildEmailComposeContent(receipt: ReceiptData, documentId?: number) {
  const number = formatReceiptNumber(receipt.number);
  const viewUrl = resolvePublicUrl(receipt, documentId);
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
    "",
    "Detalle:",
    ...itemLines,
    receipt.items.length > 12 ? `  ... y ${receipt.items.length - 12} ítem(s) más` : "",
    "",
    `TOTAL: S/ ${receipt.total.toFixed(2)}`,
    "",
    "Ver e imprimir comprobante:",
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

export function openGmailCompose(to: string, subject: string, body: string) {
  const url = new URL("https://mail.google.com/mail/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("to", to);
  url.searchParams.set("su", subject);
  url.searchParams.set("body", body);
  window.open(url.toString(), "_blank");
}

export function openEmailCompose(receipt: ReceiptData, to: string, documentId?: number) {
  const { subject, body } = buildEmailComposeContent(receipt, documentId);
  openGmailCompose(to, subject, body);
}
