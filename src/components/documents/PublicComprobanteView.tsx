"use client";

import { useState } from "react";
import { DocumentPrintTemplate, printDocument } from "@/components/documents/DocumentPrintTemplate";
import { DocPrintViewport } from "@/components/documents/DocPrintViewport";
import type { ReceiptData } from "@/lib/comprobante/types";
import { COMPANY_INFO } from "@/lib/company-info";
import { formatReceiptNumber } from "@/lib/receipt-format";

export function PublicComprobanteView({ receipt }: { receipt: ReceiptData }) {
  const [printSize, setPrintSize] = useState<"A4" | "A5">("A4");
  const number = formatReceiptNumber(receipt.number);
  const sunatPayload =
    receipt.qr_payload ?? `${receipt.emisor?.ruc ?? COMPANY_INFO.ruc}|${number}|${receipt.total.toFixed(2)}`;
  const officialUrl =
    typeof window !== "undefined"
      ? window.location.href.split("?")[0]
      : receipt.share_token
        ? `https://aycradiadores.vercel.app/c/${receipt.share_token}`
        : "";

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef1f5] py-4">
      <div className="mx-auto mb-4 max-w-[220mm] px-4">
        <div className="rounded-xl border border-[#d7dde6] bg-white p-4 shadow-sm">
          <p className="text-center text-sm font-bold tracking-wide text-[#1d4ed8]">{COMPANY_INFO.tradeName}</p>
          <p className="mt-1 text-center text-xs font-semibold uppercase text-[#c41e3a]">
            {receipt.document_type_label}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#222]">
            Estos datos son para que los utilice en Consulta SUNAT:
          </p>
          <p className="mt-1 break-all rounded-md bg-[#f4f6f8] px-3 py-2 font-mono text-[11px] text-[#333]">
            {sunatPayload}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#222]">
            Este enlace es el oficial de la boleta en nuestra página:
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
        Comprobante electrónico emitido por A&amp;C Radiadores. Este enlace es de solo consulta.
      </p>
    </div>
  );
}
