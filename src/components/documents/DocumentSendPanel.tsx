"use client";

import { useEffect, useState } from "react";
import { printDocument } from "@/components/documents/DocumentPrintTemplate";
import { openEmailCompose } from "@/lib/email/gmail-compose";
import { buildWhatsAppUrl } from "@/lib/email/whatsapp-compose";
import { api } from "@/lib/api/client";
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
  const [email, setEmail] = useState(defaultEmail || receipt.customer_email || "");
  const [phone, setPhone] = useState(defaultPhone || receipt.customer_phone || "");
  const [printSizeLocal, setPrintSizeLocal] = useState<"A4" | "A5">("A4");
  const printSize = printSizeProp ?? printSizeLocal;
  const setPrintSize = onPrintSizeChange ?? setPrintSizeLocal;
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [shareToken, setShareToken] = useState(receipt.share_token ?? "");
  const [loadingShare, setLoadingShare] = useState(false);

  useEffect(() => {
    setEmail(defaultEmail || receipt.customer_email || "");
  }, [defaultEmail, receipt.customer_email]);

  useEffect(() => {
    setPhone(defaultPhone || receipt.customer_phone || "");
  }, [defaultPhone, receipt.customer_phone]);

  useEffect(() => {
    setShareToken(receipt.share_token ?? "");
  }, [receipt.share_token]);

  async function ensureShareToken(): Promise<string> {
    if (shareToken) return shareToken;
    if (!documentId) throw new Error("Guarda el comprobante antes de compartir.");
    setLoadingShare(true);
    try {
      const res = await api.documents.shareLink(documentId);
      setShareToken(res.share_token);
      return res.share_token;
    } finally {
      setLoadingShare(false);
    }
  }

  const handlePrint = () => printDocument("doc-print-area", printSize);

  const sendEmailGmail = async () => {
    setErr("");
    setMsg("");
    const target = email.trim();
    if (!target) {
      setErr("Escribe el correo del destinatario.");
      return;
    }
    try {
      const token = await ensureShareToken();
      openEmailCompose({ ...receipt, share_token: token }, target, documentId);
      setMsg(`Gmail abierto para ${target}. Revisa el mensaje y pulsa Enviar.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo abrir Gmail");
    }
  };

  const sendWhatsApp = async () => {
    setErr("");
    setMsg("");
    const targetPhone = phone.trim();
    if (!targetPhone) {
      setErr("Escribe el número de WhatsApp (9 dígitos).");
      return;
    }
    try {
      const token = await ensureShareToken();
      const url = buildWhatsAppUrl({
        phone: targetPhone,
        receipt: { ...receipt, share_token: token },
        documentId,
      });
      window.open(url, "_blank");
      setMsg(`WhatsApp abierto para ${targetPhone}.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo abrir WhatsApp");
    }
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

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ify-btn-outline text-xs"
          onClick={sendEmailGmail}
          disabled={loadingShare}
        >
          <i className="bi bi-envelope" /> {loadingShare ? "Preparando..." : "Enviar correo"}
        </button>
        <input
          className="ify-input min-w-[220px] flex-1 text-sm"
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="ify-btn-outline text-xs text-green-700"
          onClick={sendWhatsApp}
          disabled={loadingShare}
        >
          <i className="bi bi-whatsapp" /> {loadingShare ? "Preparando..." : "Enviar WhatsApp"}
        </button>
        <input
          className="ify-input min-w-[160px] flex-1 text-sm"
          type="tel"
          placeholder="999 123 456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {msg ? <p className="mb-2 text-sm text-green-700">{msg}</p> : null}
      {err ? <p className="mb-2 text-sm text-red-700">{err}</p> : null}
    </div>
  );
}
