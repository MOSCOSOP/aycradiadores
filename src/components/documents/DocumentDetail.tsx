"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/Modal";
import { DocumentPrintTemplate, printDocument } from "@/components/documents/DocumentPrintTemplate";
import { DocPrintViewport } from "@/components/documents/DocPrintViewport";
import { DocumentSendPanel } from "@/components/documents/DocumentSendPanel";
import { buildReceiptFromApiDoc } from "@/lib/comprobante/build-receipt-data";
import { downloadTextFile } from "@/lib/download-file";

export function DocumentDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [sunatMsg, setSunatMsg] = useState("");
  const [sunatOk, setSunatOk] = useState<boolean | null>(null);
  const [sendingSunat, setSendingSunat] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [copying, setCopying] = useState(false);

  const load = () => {
    api.documents.get(id).then((r) => {
      setDoc(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    load();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      load();
    } catch (e) {
      setSunatOk(false);
      setSunatMsg(e instanceof Error ? e.message : "Error al enviar a SUNAT");
    } finally {
      setSendingSunat(false);
    }
  };

  const voidDocument = async () => {
    const reason = prompt(
      "Motivo de anulación (se envía a SUNAT en la Comunicación de Baja):",
      "Error en la emisión"
    );
    if (reason === null) return;
    try {
      const res = await api.documents.void(id, reason);
      setMsg(res.message);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo anular");
    }
  };

  const checkVoidStatus = async () => {
    try {
      const res = await api.documents.checkVoidStatus(id);
      setMsg(res.message);
      if (res.done) load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo consultar el estado");
    }
  };

  const copyToSaleNote = async () => {
    if (!doc) return;
    setCopying(true);
    try {
      const res = (await api.saleNotes.create({
        customer_id: doc.customer_id,
        currency_type_id: doc.currency_type_id,
        plate: doc.plate,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      })) as { data?: { id?: number } };
      if (res.data?.id) {
        router.push(`/sale-notes/${res.data.id}`);
      } else {
        setMsg("Copiado a una nueva nota de venta.");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo copiar a nota de venta");
    } finally {
      setCopying(false);
    }
  };

  const downloadXml = () => {
    const xml = doc?.xml_content ? String(doc.xml_content) : "";
    if (!xml) {
      alert("Este comprobante todavía no tiene un XML generado (aún no se envió a SUNAT).");
      return;
    }
    downloadTextFile(`${doc?.number ?? id}.xml`, xml, "application/xml;charset=utf-8;");
  };

  const downloadCdr = () => {
    const cdr = doc?.cdr_content ? String(doc.cdr_content) : "";
    if (!cdr) {
      alert("Este comprobante todavía no tiene un CDR de SUNAT (aún no se envió, o fue rechazado).");
      return;
    }
    downloadTextFile(`R-${doc?.number ?? id}.xml`, cdr, "application/xml;charset=utf-8;");
  };

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!doc || !receipt) return <div className="p-5">Comprobante no encontrado</div>;

  const isAccepted = String(doc.state_type_id) === "05";
  const isVoided = String(doc.state_type_id) === "11";
  const isVoidPending = String(doc.state_type_id) === "12";

  return (
    <div className="ify-page">
      <PageHeader
        title={`Comprobante ${doc.number}`}
        subtitle={String(doc.document_type_description)}
        actions={<Link href="/documents" className="ify-btn-outline">← Volver</Link>}
      />

      {isVoided && (
        <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          Este comprobante está anulado ante SUNAT (Comunicación de Baja aceptada).
        </div>
      )}
      {isVoidPending && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span>
            Comunicación de Baja enviada a SUNAT (ticket <strong>{String(doc.void_ticket ?? "")}</strong>) — aún no se
            confirma la respuesta.
          </span>
          <button type="button" className="ify-btn-outline text-xs" onClick={checkVoidStatus}>
            <i className="bi bi-arrow-repeat" /> Consultar estado
          </button>
        </div>
      )}
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
            {Number(doc.total_exonerated ?? 0) > 0 && (
              <div className="flex justify-between"><dt className="text-[var(--muted)]">Exonerado</dt><dd>S/ {Number(doc.total_exonerated).toFixed(2)}</dd></div>
            )}
            <div className="flex justify-between"><dt className="text-[var(--muted)]">IGV</dt><dd>S/ {Number(doc.total_igv).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Total</dt><dd className="font-bold text-[var(--primary)]">S/ {Number(doc.total).toFixed(2)}</dd></div>
          </dl>
        </div>
        <div className="ify-card p-4">
          <h3 className="mb-3 font-bold">Acciones</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className="ify-btn-primary text-xs" onClick={sendSunat} disabled={sendingSunat}>
              {sendingSunat ? "Enviando..." : "Enviar a SUNAT"}
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => printDocument("doc-print-area", "A4")}>
              <i className="bi bi-file-earmark-pdf" /> PDF
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={downloadXml}>
              <i className="bi bi-filetype-xml" /> XML
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={downloadCdr}>
              <i className="bi bi-file-earmark-check" /> CDR
            </button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {!isAccepted && !isVoided && !isVoidPending && (
              <button type="button" className="ify-btn-outline text-xs" onClick={() => router.push(`/documents/create?edit=${id}`)}>
                <i className="bi bi-pencil" /> Editar / rectificar
              </button>
            )}
            <button type="button" className="ify-btn-outline text-xs" onClick={() => router.push(`/documents/create?from=${id}`)}>
              <i className="bi bi-files" /> Duplicar
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={copyToSaleNote} disabled={copying}>
              <i className="bi bi-clipboard-plus" /> {copying ? "Copiando..." : "Copiar a N. Venta"}
            </button>
            {isAccepted && (
              <button type="button" className="ify-btn-outline text-xs text-amber-700" onClick={voidDocument}>
                <i className="bi bi-slash-circle" /> Anular ante SUNAT
              </button>
            )}
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <Link href="/finances/to-collect" className="ify-btn-outline text-xs">
              <i className="bi bi-cash-coin" /> Pagos
            </Link>
            <Link href="/dispatches/create" className="ify-btn-outline text-xs">
              <i className="bi bi-truck" /> Guía de remisión
            </Link>
            <Link href="/order-notes/create" className="ify-btn-outline text-xs">
              <i className="bi bi-box-seam" /> Orden de entrega
            </Link>
            <button type="button" className="ify-btn-ghost text-xs" onClick={() => setShowOptions((v) => !v)}>
              <i className="bi bi-three-dots" /> Opciones
            </button>
          </div>
          {showOptions && (
            <div className="rounded border border-[var(--border-light)] p-3 text-xs text-[var(--muted)]">
              <p>
                Comparte el link público del comprobante desde el panel de abajo (Enviar correo / WhatsApp genera
                el enlace automáticamente).
              </p>
              <p className="mt-1">
                Nota de crédito/débito, guía electrónica y resumen diario con envío real a SUNAT están pendientes
                de implementación — por ahora los accesos de arriba solo abren el módulo correspondiente.
              </p>
            </div>
          )}
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
