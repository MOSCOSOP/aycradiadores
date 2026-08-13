"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { printDocument } from "@/components/documents/DocumentPrintTemplate";
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

export function DocumentSendPanel({
  receipt,
  documentId,
  defaultEmail = "",
  defaultPhone = "",
  compact = false,
  printSize: printSizeProp,
  onPrintSizeChange,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [printSizeLocal, setPrintSizeLocal] = useState<"A4" | "A5">("A4");
  const printSize = printSizeProp ?? printSizeLocal;
  const setPrintSize = onPrintSizeChange ?? setPrintSizeLocal;
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    setPhone(defaultPhone);
  }, [defaultPhone]);

  const handlePrint = () => printDocument("doc-print-area", printSize);

  const sendEmail = async () => {
    const target = email.trim();
    if (!target) {
      setErr("Ingresa un correo electrónico.");
      return;
    }
    if (!documentId) {
      setErr("Guarda el comprobante antes de enviar por correo.");
      return;
    }
    setSending(true);
    setErr("");
    setMsg("");
    try {
      const res = await api.documents.email(documentId, target);
      setMsg(res.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo enviar el correo");
    } finally {
      setSending(false);
    }
  };

  const sendWhatsApp = async (mode: "pdf" | "url") => {
    setErr("");
    setMsg("");
    if (documentId) {
      try {
        const res = await api.documents.whatsapp(documentId, phone || undefined, mode);
        window.open(res.url, "_blank");
        setMsg(res.message);
        return;
      } catch (e) {
        setErr(e instanceof Error ? e.message : "No se pudo abrir WhatsApp");
        return;
      }
    }
    const text = encodeURIComponent(
      `${receipt.document_type_label} ${receipt.number}\nCliente: ${receipt.customer_name}\nTotal: S/ ${receipt.total.toFixed(2)}`
    );
    const waPhone = (phone || "51998624131").replace(/\D/g, "");
    window.open(`https://wa.me/${waPhone}?text=${text}`, "_blank");
  };

  return (
    <div className={compact ? "" : "pos-panel shrink-0 border-t p-4"}>
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

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="ify-input max-w-xs"
          placeholder="Correo del cliente"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="button" className="ify-btn-outline text-xs" onClick={sendEmail} disabled={sending}>
          <i className="bi bi-envelope" /> {sending ? "Enviando..." : "Enviar correo"}
        </button>
        {defaultEmail ? (
          <button
            type="button"
            className="ify-btn-primary text-xs"
            onClick={async () => {
              setEmail(defaultEmail);
              if (!documentId) {
                setErr("Guarda el comprobante antes de enviar por correo.");
                return;
              }
              setSending(true);
              setErr("");
              setMsg("");
              try {
                const res = await api.documents.email(documentId, defaultEmail);
                setMsg(res.message);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "No se pudo enviar el correo");
              } finally {
                setSending(false);
              }
            }}
            disabled={sending}
          >
            Enviar a {defaultEmail}
          </button>
        ) : null}
        <input
          className="ify-input max-w-[140px]"
          placeholder="WhatsApp (9 dígitos)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={() => sendWhatsApp("url")}>
          <i className="bi bi-whatsapp" /> WhatsApp
        </button>
      </div>

      {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="mb-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
