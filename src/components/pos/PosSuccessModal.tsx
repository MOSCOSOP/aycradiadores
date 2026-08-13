"use client";

import { useState } from "react";
import { DocumentPrintTemplate } from "@/components/documents/DocumentPrintTemplate";
import { DocumentSendPanel } from "@/components/documents/DocumentSendPanel";
import type { ReceiptData } from "@/lib/comprobante/types";

type Props = {
  receipt: ReceiptData;
  onNewSale: () => void;
};

export function PosSuccessModal({ receipt, onNewSale }: Props) {
  const [printSize, setPrintSize] = useState<"A4" | "A5">("A4");

  return (
    <div className="pos-checkout-overlay fixed inset-0 z-[250] flex flex-col pos-shell">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--primary)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs">✓</span>
          <span className="font-semibold">Venta exitosa : comprobante {receipt.number}</span>
        </div>
        <div className="text-xs opacity-90">Comprobante emitido correctamente</div>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <DocumentPrintTemplate receipt={receipt} scale={printSize === "A5" ? "a5" : "normal"} />
      </div>

      <DocumentSendPanel
        receipt={receipt}
        documentId={receipt.id}
        defaultEmail={receipt.customer_email}
        defaultPhone={receipt.customer_phone}
        printSize={printSize}
        onPrintSizeChange={setPrintSize}
      />

      <div className="pos-panel shrink-0 border-t p-4 pt-0">
        <button type="button" className="ify-btn-primary w-full py-3 text-sm font-bold" onClick={onNewSale}>
          Nueva venta
        </button>
      </div>
    </div>
  );
}
