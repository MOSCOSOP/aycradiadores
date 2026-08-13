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
  const [shareToken, setShareToken] = useState(receipt.share_token ?? "");
  const [loadingShare, setLoadingShare] = useState(false);

  useEffect(() => {
    setShareToken(receipt.share_token ?? "");
  }, [receipt.share_token]);

  const receiptWithShare: ReceiptData = { ...receipt, share_token: shareToken || receipt.share_token };

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
    if (!customerEmail) {
      setErr("Este cliente no tiene correo registrado. Agrégalo en la ficha del cliente.");
      return;
    }
    try {
      const token = await ensureShareToken();
      openEmailCompose({ ...receipt, share_token: token }, customerEmail, documentId);
      setMsg(`Gmail abierto para ${customerEmail}. Revisa el mensaje y pulsa Enviar.`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo abrir Gmail");
    }
  };

  const sendWhatsApp = async () => {
    setErr("");
    setMsg("");
    try {
      const token = await ensureShareToken();
      const url = buildWhatsAppUrl({
        phone: customerPhone || undefined,
        receipt: { ...receipt, share_token: token },
        documentId,
      });
      window.open(url, "_blank");
      setMsg(
        customerPhone
          ? `WhatsApp abierto para ${formatPhoneDisplay(customerPhone)}.`
          : "WhatsApp abierto con el mensaje del comprobante."
      );
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

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ify-btn-outline text-xs"
          onClick={sendEmailGmail}
          disabled={!customerEmail || loadingShare}
        >
          <i className="bi bi-envelope" /> {loadingShare ? "Preparando..." : "Enviar correo"}
        </button>
        {customerEmail ? (
          <span className="text-sm font-medium text-[var(--foreground)]">{customerEmail}</span>
        ) : (
          <span className="text-sm text-amber-700">Sin correo del cliente</span>
        )}
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="ify-btn-outline text-xs text-green-700"
          onClick={sendWhatsApp}
          disabled={loadingShare}
        >
          <i className="bi bi-whatsapp" /> {loadingShare ? "Preparando..." : "Enviar WhatsApp"}
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
