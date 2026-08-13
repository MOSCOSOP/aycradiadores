"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/Modal";
import { DocumentPrintTemplate } from "@/components/documents/DocumentPrintTemplate";
import { DocPrintViewport } from "@/components/documents/DocPrintViewport";
import { DocumentSendPanel } from "@/components/documents/DocumentSendPanel";
import { buildReceiptFromApiDoc } from "@/lib/comprobante/build-receipt-data";

export function DocumentDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sunatMsg, setSunatMsg] = useState("");
  const [sunatOk, setSunatOk] = useState<boolean | null>(null);
  const [sendingSunat, setSendingSunat] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.documents.get(id).then((r) => {
      setDoc(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));

    try {
      const flash = sessionStorage.getItem("ify_sunat_flash");
      if (flash) {
        const parsed = JSON.parse(flash) as { ok?: boolean; message?: string };
        setSunatOk(Boolean(parsed.ok));
        setSunatMsg(String(parsed.message ?? ""));
        sessionStorage.removeItem("ify_sunat_flash");
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  const receipt = useMemo(() => {
    if (!doc) return null;
    return buildReceiptFromApiDoc({ ...doc, items });
  }, [doc, items]);

  const sendSunat = async () => {
    setSendingSunat(true);
    setSunatMsg("");
    try {
      const res = await api.documents.resend(Number(id));
      setSunatOk(true);
      setSunatMsg(res.message || "Enviado a SUNAT");
      const refreshed = await api.documents.get(id);
      setDoc(refreshed.data);
      setItems((refreshed.data.items as Record<string, unknown>[]) || []);
    } catch (e) {
      setSunatOk(false);
      setSunatMsg(e instanceof Error ? e.message : "Error al enviar a SUNAT");
    } finally {
      setSendingSunat(false);
    }
  };

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!doc || !receipt) return <div className="p-5">Comprobante no encontrado</div>;

  return (
    <div className="ify-page">
      <PageHeader
        title={`Comprobante ${doc.number}`}
        subtitle={String(doc.document_type_description)}
        actions={<Link href="/documents" className="ify-btn-outline">← Volver</Link>}
      />

      {msg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
      {sunatMsg && (
        <div className={`mb-3 rounded border p-3 text-sm ${sunatOk ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <strong>SUNAT:</strong> {sunatMsg}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ify-card p-4">
          <h3 className="mb-3 font-bold">Datos generales</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Cliente</dt><dd>{String(doc.customer_name)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">RUC/DNI</dt><dd>{String(doc.customer_number)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Fecha</dt><dd>{String(doc.date_of_issue)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Estado</dt><dd>{String(doc.state_type_description)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">XML</dt><dd>{doc.has_xml ? "Sí" : "No"}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">CDR SUNAT</dt><dd>{doc.has_cdr ? "Sí" : "No"}</dd></div>
            {doc.plate ? (
              <div className="flex justify-between"><dt className="text-[var(--muted)]">Placa</dt><dd>{String(doc.plate)}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Gravado</dt><dd>S/ {Number(doc.total_taxed).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">IGV</dt><dd>S/ {Number(doc.total_igv).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Total</dt><dd className="font-bold text-[var(--primary)]">S/ {Number(doc.total).toFixed(2)}</dd></div>
          </dl>
        </div>
        <div className="ify-card p-4">
          <h3 className="mb-3 font-bold">Acciones SUNAT</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ify-btn-primary text-xs" onClick={sendSunat} disabled={sendingSunat}>
              {sendingSunat ? "Enviando..." : "Enviar a SUNAT"}
            </button>
          </div>
        </div>
      </div>

      <div className="ify-card mt-4 overflow-hidden p-4">
        <DocPrintViewport>
          <DocumentPrintTemplate receipt={receipt} />
        </DocPrintViewport>
      </div>

      <DocumentSendPanel
        receipt={receipt}
        documentId={Number(id)}
        defaultEmail={String(doc.customer_email ?? "")}
        defaultPhone={String(doc.customer_phone ?? "")}
        compact
      />
    </div>
  );
}
