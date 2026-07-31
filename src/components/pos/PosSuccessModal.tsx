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

  const sendEmail = () => {
    if (!email.trim()) return;
    setMsg(`Comprobante ${receipt.number} — envío registrado a ${email}`);
  };

  const whatsapp = () => {
    const text = encodeURIComponent(
      `${receipt.document_type_label} ${receipt.number}\nCliente: ${receipt.customer_name}\nTotal: S/ ${receipt.total.toFixed(2)}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#eef2f6]">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--primary)] px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs">✓</span>
          <span className="font-semibold">Venta exitosa : comprobante {receipt.number}</span>
        </div>
        <div className="text-xs opacity-90">Estado: No enviado a Sunat · Envío automático: Activado</div>
      </div>

      <div className="flex flex-wrap gap-2 border-b bg-white px-4 py-2">
        <button type="button" className="ify-btn-primary text-xs" onClick={() => printDocument()}>Imprimir A4</button>
        <button type="button" className="ify-btn-outline text-xs" onClick={() => printDocument()}>Imprimir A5</button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <DocumentPrintTemplate receipt={receipt} />
      </div>

      <div className="border-t bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input className="ify-input max-w-xs" placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="button" className="ify-btn-outline text-xs" onClick={sendEmail}><i className="bi bi-envelope" /> Enviar</button>
          <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={whatsapp}><i className="bi bi-whatsapp" /> WhatsApp PDF</button>
          <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={whatsapp}><i className="bi bi-whatsapp" /> WhatsApp URL</button>
        </div>
        {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}
        <button type="button" className="ify-btn-primary w-full py-3 text-sm font-bold" onClick={onNewSale}>
          Nueva venta
        </button>
      </div>
    </div>
  );
}
