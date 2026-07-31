"use client";

import { useState } from "react";
import { DocumentPrintTemplate, printDocument, type ReceiptData } from "@/components/documents/DocumentPrintTemplate";

type Props = {
  receipt: ReceiptData;
  onNewSale: () => void;
};

export function PosSuccessModal({ receipt, onNewSale }: Props) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [printSize, setPrintSize] = useState<"A4" | "A5">("A4");

  const sendEmail = () => {
    if (!email.trim()) return;
    setMsg(`Comprobante ${receipt.number} — envío registrado a ${email}`);
  };

  const whatsapp = (kind: "pdf" | "url") => {
    const text = encodeURIComponent(
      kind === "url"
        ? `${receipt.document_type_label} ${receipt.number}\nhttps://aycradiadores.vercel.app/documents`
        : `${receipt.document_type_label} ${receipt.number}\nCliente: ${receipt.customer_name}\nTotal: S/ ${receipt.total.toFixed(2)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handlePrint = () => printDocument("doc-print-area", printSize);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#eef2f6]">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--primary)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs">✓</span>
          <span className="font-semibold">Venta exitosa : comprobante {receipt.number}</span>
        </div>
        <div className="text-xs opacity-90">Estado: No enviado a Sunat · Envío automático: Activado</div>
      </div>

      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-white px-4 py-3 shadow-sm">
        <button type="button" className="ify-btn-primary px-5 py-2 text-sm font-bold" onClick={handlePrint}>
          <i className="bi bi-printer" /> Imprimir
        </button>
        <button
          type="button"
          className={`ify-btn-outline text-xs ${printSize === "A4" ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
          onClick={() => setPrintSize("A4")}
        >
          Imprimir A4
        </button>
        <button
          type="button"
          className={`ify-btn-outline text-xs ${printSize === "A5" ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}
          onClick={() => setPrintSize("A5")}
        >
          Imprimir A5
        </button>
        <a href="/plantilla.pdf" target="_blank" rel="noreferrer" className="ify-btn-outline ml-auto text-xs">
          Ver plantilla PDF
        </a>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <DocumentPrintTemplate receipt={receipt} scale={printSize === "A5" ? "a5" : "normal"} />
      </div>

      <div className="shrink-0 border-t bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input
            className="ify-input max-w-xs"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="button" className="ify-btn-outline text-xs" onClick={sendEmail}>
            <i className="bi bi-envelope" /> Enviar
          </button>
          <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={() => whatsapp("pdf")}>
            <i className="bi bi-whatsapp" /> WhatsApp PDF
          </button>
          <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={() => whatsapp("url")}>
            <i className="bi bi-whatsapp" /> WhatsApp URL
          </button>
        </div>
        {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}
        <button type="button" className="ify-btn-primary w-full py-3 text-sm font-bold" onClick={onNewSale}>
          Nueva venta
        </button>
      </div>
    </div>
  );
}
