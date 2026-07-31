"use client";

import { COMPANY_INFO } from "@/lib/company-info";

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

export function DocumentPrintTemplate({ receipt, printId = "doc-print-area" }: { receipt: ReceiptData; printId?: string }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
    `${COMPANY_INFO.ruc}|${receipt.number}|${receipt.total.toFixed(2)}`
  )}`;

  return (
    <div id={printId} className="doc-print mx-auto max-w-[720px] bg-white p-6 text-[11px] text-black">
      <div className="mb-4 flex gap-4 border-b pb-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold text-[var(--primary)]">
          A&amp;C
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold uppercase">{COMPANY_INFO.tradeName}</h2>
          <p className="text-[10px]">De: {COMPANY_INFO.name}</p>
          <p className="text-[10px]">RUC {COMPANY_INFO.ruc}</p>
          <p className="text-[10px]">{COMPANY_INFO.address}</p>
          <p className="text-[10px]">{COMPANY_INFO.email}</p>
        </div>
        <div className="w-44 shrink-0 border border-gray-400 p-2 text-center text-[10px]">
          <p>R.U.C. {COMPANY_INFO.ruc}</p>
          <p className="my-1 font-bold">{receipt.document_type_label}</p>
          <p className="font-bold">Nro. {receipt.number}</p>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">
        <p><strong>Señor(es):</strong> {receipt.customer_name}</p>
        <p><strong>Fecha Emisión</strong> {fmtDate(receipt.date_of_issue)}</p>
        <p><strong>{receipt.customer_number.length === 11 ? "RUC" : "DNI"}:</strong> {receipt.customer_number}</p>
        <p><strong>Forma de pago:</strong> {receipt.payment_condition === "credito" ? "Crédito" : "Contado"} — {receipt.payment_method}</p>
        {receipt.plate ? <p><strong>Placa:</strong> {receipt.plate}</p> : null}
        <p><strong>Ubicación:</strong> {receipt.customer_address || "HUÁNUCO"}</p>
      </div>

      <table className="mb-3 w-full border-collapse text-[10px]">
        <thead>
          <tr className="border-b border-t">
            <th className="py-1 text-left">Cant.</th>
            <th className="py-1 text-left">Descripción</th>
            <th className="py-1 text-right">P.U.</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {receipt.items.map((it, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-1">{it.quantity}</td>
              <td className="py-1">{it.description}</td>
              <td className="py-1 text-right">{it.unit_price.toFixed(2)}</td>
              <td className="py-1 text-right">{it.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="w-56 text-[10px]">
          <div className="flex justify-between"><span>OP. GRAVADAS:</span><span>S/ {receipt.total_taxed.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>I.G.V. 18%:</span><span>S/ {receipt.total_igv.toFixed(2)}</span></div>
          <div className="mt-1 flex justify-between border-t pt-1 text-sm font-bold"><span>TOTAL:</span><span>S/ {receipt.total.toFixed(2)}</span></div>
        </div>
      </div>

      <p className="mt-3 text-[10px]">Son: {amountWords(receipt.total)}</p>

      <div className="mt-4 flex items-end justify-between border-t pt-3">
        <div className="text-[9px]">
          <p>{COMPANY_INFO.bank}</p>
          <p>Cta. {COMPANY_INFO.bankAccount}</p>
          <p>CCI {COMPANY_INFO.bankCci}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR SUNAT" width={90} height={90} className="border" />
      </div>
    </div>
  );
}

export function printDocument(elementId = "doc-print-area") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<html><head><title>Comprobante</title><style>body{font-family:Arial,sans-serif;margin:16px}table{width:100%}</style></head><body>${el.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  w.print();
}
