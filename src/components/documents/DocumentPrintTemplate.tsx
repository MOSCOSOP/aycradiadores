"use client";

import Image from "next/image";
import { COMPANY_INFO } from "@/lib/company-info";
import { formatReceiptNumber } from "@/lib/receipt-format";

export type ReceiptData = {
  kind: string;
  number: string;
  document_type_label: string;
  customer_name: string;
  customer_number: string;
  customer_address?: string;
  items: { description: string; quantity: number; unit_price: number; total: number }[];
  total: number;
  total_taxed: number;
  total_igv: number;
  payment_method: string;
  payment_condition: string;
  date_of_issue: string;
  plate?: string;
};

function fmtDate(iso: string) {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function amountWords(total: number) {
  const ent = Math.floor(total);
  const dec = Math.round((total - ent) * 100);
  return `${ent} CON ${String(dec).padStart(2, "0")}/100 Soles`;
}

function payMethodLabel(method: string) {
  const map: Record<string, string> = {
    efectivo: "Efectivo",
    yape: "Yape",
    transferencia: "Transferencia",
    contado: "Contado",
  };
  return map[method] ?? method;
}

export function DocumentPrintTemplate({
  receipt,
  printId = "doc-print-area",
  scale = "normal",
}: {
  receipt: ReceiptData;
  printId?: string;
  scale?: "normal" | "a5";
}) {
  const number = formatReceiptNumber(receipt.number);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
    `${COMPANY_INFO.ruc}|${number}|${receipt.total.toFixed(2)}`
  )}`;
  const idDoc = receipt.customer_number.length === 11 ? "RUC" : "DNI";

  return (
    <div
      id={printId}
      className={`doc-print-sheet mx-auto bg-white text-black shadow-sm ${scale === "a5" ? "doc-print-a5" : "doc-print-a4"}`}
    >
      <div className="doc-print-inner">
        <header className="doc-print-header">
          <div className="doc-print-brand">
            <Image
              src="/images/logo-client.png"
              alt={COMPANY_INFO.tradeName}
              width={72}
              height={72}
              className="doc-print-logo"
              unoptimized
            />
            <div>
              <h1 className="doc-print-company">{COMPANY_INFO.tradeName}</h1>
              <p className="doc-print-meta">De: {COMPANY_INFO.name}</p>
              <p className="doc-print-meta">RUC {COMPANY_INFO.ruc}</p>
              <p className="doc-print-meta">{COMPANY_INFO.address}</p>
              <p className="doc-print-meta">{COMPANY_INFO.email}</p>
            </div>
          </div>
          <div className="doc-print-docbox">
            <p>R.U.C. {COMPANY_INFO.ruc}</p>
            <p className="doc-print-doc-type">{receipt.document_type_label}</p>
            <p className="doc-print-doc-number">Nro. {number}</p>
          </div>
        </header>

        <section className="doc-print-customer">
          <div>
            <p><span className="doc-print-label">Señor(es):</span> {receipt.customer_name}</p>
            <p><span className="doc-print-label">{idDoc}:</span> {receipt.customer_number}</p>
            <p><span className="doc-print-label">Ubicación:</span> {receipt.customer_address || "HUÁNUCO - HUÁNUCO - HUÁNUCO"}</p>
            {receipt.plate ? <p><span className="doc-print-label">Placa:</span> {receipt.plate}</p> : null}
          </div>
          <div>
            <p><span className="doc-print-label">Fecha Emisión</span> {fmtDate(receipt.date_of_issue)}</p>
            <p>
              <span className="doc-print-label">Forma de pago:</span>{" "}
              {receipt.payment_condition === "credito" ? "Crédito" : "Contado"} — {payMethodLabel(receipt.payment_method)}
            </p>
          </div>
        </section>

        <table className="doc-print-table">
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th className="text-right">P.U.</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((it, i) => (
              <tr key={i}>
                <td>{it.quantity}</td>
                <td>{it.description}</td>
                <td className="text-right">{it.unit_price.toFixed(2)}</td>
                <td className="text-right">{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-print-totals-wrap">
          <div className="doc-print-totals">
            <div className="doc-print-total-row"><span>OP. GRAVADAS:</span><span>S/ {receipt.total_taxed.toFixed(2)}</span></div>
            <div className="doc-print-total-row"><span>I.G.V. 18%:</span><span>S/ {receipt.total_igv.toFixed(2)}</span></div>
            <div className="doc-print-total-row doc-print-total-final"><span>TOTAL:</span><span>S/ {receipt.total.toFixed(2)}</span></div>
          </div>
        </div>

        <p className="doc-print-words">Son: {amountWords(receipt.total)}</p>

        <footer className="doc-print-footer">
          <div className="doc-print-bank">
            <p>{COMPANY_INFO.bank}</p>
            <p>Cta. {COMPANY_INFO.bankAccount}</p>
            <p>CCI {COMPANY_INFO.bankCci}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR SUNAT" width={100} height={100} className="doc-print-qr" />
        </footer>
      </div>
    </div>
  );
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 12mm; color: #111; }
  .doc-print-sheet { width: 100%; max-width: 210mm; margin: 0 auto; }
  .doc-print-inner { padding: 8mm; border: 1px solid #ddd; }
  .doc-print-header { display: flex; gap: 12px; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px; }
  .doc-print-brand { display: flex; gap: 10px; flex: 1; align-items: flex-start; }
  .doc-print-logo { width: 64px; height: 64px; object-fit: contain; }
  .doc-print-company { font-size: 15px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px; }
  .doc-print-meta { font-size: 9px; margin: 1px 0; line-height: 1.3; }
  .doc-print-docbox { width: 170px; border: 1px solid #666; padding: 8px; text-align: center; font-size: 9px; flex-shrink: 0; }
  .doc-print-doc-type { font-weight: 700; margin: 6px 0; font-size: 10px; }
  .doc-print-doc-number { font-weight: 700; font-size: 10px; }
  .doc-print-customer { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 9px; margin-bottom: 10px; }
  .doc-print-label { font-weight: 700; }
  .doc-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 10px; }
  .doc-print-table th, .doc-print-table td { border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 4px 6px; }
  .doc-print-table th { text-align: left; font-weight: 700; }
  .text-right { text-align: right; }
  .doc-print-totals-wrap { display: flex; justify-content: flex-end; }
  .doc-print-totals { width: 220px; font-size: 9px; }
  .doc-print-total-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .doc-print-total-final { font-size: 12px; font-weight: 700; border-top: 1px solid #333; margin-top: 4px; padding-top: 4px; }
  .doc-print-words { font-size: 9px; margin: 10px 0; }
  .doc-print-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #ccc; padding-top: 10px; }
  .doc-print-bank { font-size: 8px; line-height: 1.4; }
  .doc-print-qr { width: 90px; height: 90px; border: 1px solid #ccc; }
  @page { size: A4; margin: 10mm; }
`;

export function printDocument(elementId = "doc-print-area", pageSize: "A4" | "A5" = "A4") {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Permite ventanas emergentes para imprimir el comprobante.");
    return;
  }
  const pageRule = pageSize === "A5" ? "@page { size: A5; margin: 8mm; }" : "@page { size: A4; margin: 10mm; }";
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante</title><style>${PRINT_CSS}${pageRule}</style></head><body>${el.outerHTML}</body></html>`
  );
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}
