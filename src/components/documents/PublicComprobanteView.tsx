"use client";

import { useState } from "react";
import { DocumentPrintTemplate, printDocument } from "@/components/documents/DocumentPrintTemplate";
import { DocPrintViewport } from "@/components/documents/DocPrintViewport";
import type { ReceiptData } from "@/lib/comprobante/types";

export function PublicComprobanteView({ receipt }: { receipt: ReceiptData }) {
  const [printSize, setPrintSize] = useState<"A4" | "A5">("A4");

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef1f5] py-4">
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
