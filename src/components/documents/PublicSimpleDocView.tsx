"use client";

import { useState } from "react";
import { DocumentPrintTemplate, printDocument } from "@/components/documents/DocumentPrintTemplate";
import { DocPrintViewport } from "@/components/documents/DocPrintViewport";
import type { ReceiptData } from "@/lib/comprobante/types";
import { COMPANY_INFO } from "@/lib/company-info";
import { formatReceiptNumber } from "@/lib/receipt-format";

/** Misma plantilla de impresión que los comprobantes (DocumentPrintTemplate) — usada para
 * notas de venta y cotizaciones. A diferencia de PublicComprobanteView, no muestra el aviso de
 * "datos para Consulta SUNAT": estos documentos no son comprobantes electrónicos, no tiene
 * sentido invitar a verificarlos ahí. */
export function PublicSimpleDocView({ receipt }: { receipt: ReceiptData }) {
  const [printSize, setPrintSize] = useState<"A4" | "A5">("A4");
  const number = formatReceiptNumber(receipt.number);
  const officialUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef1f5] py-4">
      <div className="mx-auto mb-4 max-w-[220mm] px-4">
        <div className="rounded-xl border border-[#d7dde6] bg-white p-4 shadow-sm">
          <p className="text-center text-sm font-bold tracking-wide text-[#1d4ed8]">{COMPANY_INFO.tradeName}</p>
          <p className="mt-1 text-center text-xs font-semibold uppercase text-[#c41e3a]">
            {receipt.document_type_label} {number}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#222]">
            Este es el enlace oficial de consulta de este documento en nuestra página:
          </p>
          {officialUrl ? (
            <a href={officialUrl} className="mt-1 block break-all text-sm font-semibold text-[#1d4ed8] underline">
              {officialUrl}
            </a>
          ) : null}
        </div>
      </div>
      <div className="mx-auto mb-4 flex max-w-[220mm] flex-wrap items-center justify-center gap-2 px-4">
        <button type="button" className="ify-btn-primary text-sm" onClick={() => printDocument("doc-print-area", printSize)}>
          Imprimir
        </button>
        <button
          type="button"
          className={`ify-btn-outline text-xs ${printSize === "A4" ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
          onClick={() => setPrintSize("A4")}
        >
          A4
        </button>
        <button
          type="button"
          className={`ify-btn-outline text-xs ${printSize === "A5" ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
          onClick={() => setPrintSize("A5")}
        >
          A5
        </button>
      </div>
      <div className="px-2">
        <DocPrintViewport pageSize={printSize}>
          <DocumentPrintTemplate receipt={receipt} scale={printSize === "A5" ? "a5" : "normal"} />
        </DocPrintViewport>
      </div>
      <p className="mx-auto mt-4 max-w-[210mm] px-4 text-center text-xs text-[#666]">
        Documento interno de {COMPANY_INFO.tradeName} — no es un comprobante de pago electrónico.
      </p>
    </div>
  );
}
