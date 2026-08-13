"use client";

import { useEffect, useState } from "react";
import { printDocument } from "@/components/documents/DocumentPrintTemplate";
import { openEmailCompose } from "@/lib/email/gmail-compose";
import { buildWhatsAppUrl } from "@/lib/email/whatsapp-compose";
import type { ReceiptData } from "@/lib/comprobante/types";

type Props = {
  receipt: ReceiptData;
  documentId?: number;
  defaultEmail?: string;
  defaultPhone?: string;
  compact?: boolean;
  printSize?: "A4" | "A5";
  onPrintSizeChange?: (size: "A4" | "A5") => void;
};

function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 9) return digits.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  if (digits.length === 11 && digits.startsWith("51")) {
    return `+51 ${digits.slice(2).replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}`;
  }
  return phone;
}

export function DocumentSendPanel({
  receipt,
  documentId,
  defaultEmail = "",
  defaultPhone = "",
  compact = false,
  printSize: printSizeProp,
  onPrintSizeChange,
}: Props) {
  const customerEmail = (defaultEmail || receipt.customer_email || "").trim();
  const customerPhone = (defaultPhone || receipt.customer_phone || "").trim();
  const [printSizeLocal, setPrintSizeLocal] = useState<"A4" | "A5">("A4");
  const printSize = printSizeProp ?? printSizeLocal;
  const setPrintSize = onPrintSizeChange ?? setPrintSizeLocal;
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    setMsg("");
    setErr("");
  }, [customerEmail, customerPhone]);

  const handlePrint = () => printDocument("doc-print-area", printSize);

  const sendEmailGmail = () => {
    setErr("");
    setMsg("");
    if (!customerEmail) {
      setErr("Este cliente no tiene correo registrado. Agrégalo en la ficha del cliente.");
      return;
    }
    openEmailCompose(receipt, customerEmail, documentId);
    setMsg(`Gmail abierto para ${customerEmail}. Revisa el mensaje y pulsa Enviar.`);
  };

  const sendWhatsApp = () => {
    setErr("");
    setMsg("");
    const url = buildWhatsAppUrl({
      phone: customerPhone || undefined,
      receipt,
      documentId,
    });
    window.open(url, "_blank");
    setMsg(
      customerPhone
        ? `WhatsApp abierto para ${formatPhoneDisplay(customerPhone)}.`
        : "WhatsApp abierto con el mensaje del comprobante."
    );
  };

  return (
    <div className={compact ? "mt-4" : "pos-panel shrink-0 border-t p-4"}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className="ify-btn-primary px-4 py-2 text-sm font-bold" onClick={handlePrint}>
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
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ify-btn-outline text-xs"
          onClick={sendEmailGmail}
          disabled={!customerEmail}
          title={customerEmail ? `Abrir Gmail para ${customerEmail}` : "Cliente sin correo"}
        >
          <i className="bi bi-envelope" /> Enviar correo
        </button>
        {customerEmail ? (
          <span className="text-sm font-medium text-[var(--foreground)]">{customerEmail}</span>
        ) : (
          <span className="text-sm text-amber-700">Sin correo del cliente</span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={sendWhatsApp}>
          <i className="bi bi-whatsapp" /> Enviar WhatsApp
        </button>
        {customerPhone ? (
          <span className="text-sm font-medium text-[var(--foreground)]">{formatPhoneDisplay(customerPhone)}</span>
        ) : (
          <span className="text-sm text-[var(--muted)]">Se abrirá WhatsApp con el mensaje listo</span>
        )}
      </div>

      {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="mb-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
