import nodemailer from "nodemailer";
import type { ReceiptData } from "@/lib/comprobante/types";
import { formatReceiptNumber } from "@/lib/receipt-format";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  };
}

function fmtMoney(n: number) {
  return `S/ ${n.toFixed(2)}`;
}

function buildEmailHtml(receipt: ReceiptData, viewUrl: string) {
  const emisor = receipt.emisor;
  const rows = receipt.items
    .map(
      (it) =>
        `<tr>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:center">${it.code ?? "-"}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:center">${it.unit}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee">${it.description}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${it.unit_price.toFixed(2)}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right">${it.total.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><title>${receipt.document_type_label}</title></head>
<body style="font-family:Arial,sans-serif;color:#111;max-width:720px;margin:0 auto;padding:16px">
  <h2 style="margin:0 0 8px;text-transform:uppercase">${emisor?.nombreComercial ?? "Comprobante"}</h2>
  <p style="margin:0 0 12px;font-size:13px">
    <strong>${receipt.document_type_label}</strong><br>
    Nro. ${formatReceiptNumber(receipt.number)}<br>
    Fecha: ${receipt.date_of_issue}
  </p>
  <p style="font-size:13px;margin:0 0 12px">
    Cliente: <strong>${receipt.customer_name}</strong> (${receipt.customer_number})
  </p>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
    <thead>
      <tr style="background:#555;color:#fff">
        <th style="padding:6px">CÓDIGO</th><th>CANT.</th><th>U.M.</th><th>DESCRIPCIÓN</th><th>P.Unit</th><th>TOTAL</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="text-align:right;font-size:14px"><strong>Total: ${fmtMoney(receipt.total)}</strong></p>
  <p style="font-size:13px">
    <a href="${viewUrl}" style="display:inline-block;background:#0d6efd;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">
      Ver e imprimir comprobante
    </a>
  </p>
  <p style="font-size:11px;color:#666;margin-top:20px">
    Representación impresa del Comprobante de Venta Electrónico.
    Puede verificar en <a href="https://e-consulta.sunat.gob.pe/">e-consulta SUNAT</a>.
  </p>
</body>
</html>`;
}

export async function sendDocumentEmail(input: {
  to: string;
  receipt: ReceiptData;
  documentId?: number;
}): Promise<{ sent: boolean; message: string }> {
  const smtp = getSmtpConfig();
  if (!smtp) {
    return {
      sent: false,
      message:
        "Correo no configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASS en las variables de entorno.",
    };
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const viewUrl =
    input.documentId != null
      ? `${appUrl}/documents/${input.documentId}`
      : `${appUrl}/documents`;

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@local";
  const number = formatReceiptNumber(input.receipt.number);

  const transporter = nodemailer.createTransport(smtp);
  await transporter.sendMail({
    from,
    to: input.to,
    subject: `${input.receipt.document_type_label} ${number}`,
    html: buildEmailHtml(input.receipt, viewUrl),
    text: `${input.receipt.document_type_label} ${number}\nTotal: ${input.receipt.total.toFixed(2)}\nVer: ${viewUrl}`,
  });

  return { sent: true, message: `Comprobante ${number} enviado a ${input.to}` };
}

export function buildWhatsAppUrl(input: {
  phone?: string | null;
  receipt: ReceiptData;
  documentId?: number;
}): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const viewUrl =
    input.documentId != null
      ? `${appUrl}/documents/${input.documentId}`
      : `${appUrl}/documents`;
  const number = formatReceiptNumber(input.receipt.number);
  const text = [
    `${input.receipt.document_type_label} ${number}`,
    `Cliente: ${input.receipt.customer_name}`,
    `Total: S/ ${input.receipt.total.toFixed(2)}`,
    `Ver comprobante: ${viewUrl}`,
  ].join("\n");

  let phone = String(input.phone ?? process.env.COMPANY_WHATSAPP ?? "51998624131").replace(/\D/g, "");
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (!phone.startsWith("51") && phone.length === 9) phone = `51${phone}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
