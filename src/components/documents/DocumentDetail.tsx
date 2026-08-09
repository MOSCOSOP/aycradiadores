"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { COMPANY } from "@/lib/constants";

export function DocumentDetail() {
  const params = useParams();
  const id = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!id) return;
    api.documents.get(id).then((r) => {
      setDoc(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const printDoc = () => {
    const external = doc?.format_default_print as string | undefined;
    if (external?.startsWith("http")) {
      window.open(external, "_blank");
      return;
    }
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${doc?.number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{font-size:18px;margin:0}.header{display:flex;justify-content:space-between;margin-bottom:20px}</style>
      </head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const downloadPdf = () => {
    printDoc();
  };

  const sendEmail = async () => {
    try {
      const res = await api.documents.email(id, email);
      setMsg(res.message);
      setEmailOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  };

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!doc) return <div className="p-5">Comprobante no encontrado</div>;

  return (
    <div className="ify-page">
      <PageHeader
        title={`Comprobante ${doc.number}`}
        subtitle={String(doc.document_type_description)}
        actions={<Link href="/documents" className="ify-btn-outline">← Volver</Link>}
      />

      {msg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ify-card p-4">
          <h3 className="mb-3 font-bold">Datos generales</h3>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Cliente</dt><dd>{String(doc.customer_name)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">RUC/DNI</dt><dd>{String(doc.customer_number)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Fecha</dt><dd>{String(doc.date_of_issue)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Estado</dt><dd>{String(doc.state_type_description)}</dd></div>
            {doc.plate ? (
              <div className="flex justify-between"><dt className="text-[var(--muted)]">Placa</dt><dd>{String(doc.plate)}</dd></div>
            ) : null}
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Gravado</dt><dd>S/ {Number(doc.total_taxed).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">IGV</dt><dd>S/ {Number(doc.total_igv).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Total</dt><dd className="font-bold text-[var(--primary)]">S/ {Number(doc.total).toFixed(2)}</dd></div>
          </dl>
        </div>
        <div className="ify-card p-4">
          <h3 className="mb-3 font-bold">Acciones</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ify-btn-outline" onClick={printDoc}><i className="bi bi-printer" /> Imprimir</button>
            <button type="button" className="ify-btn-outline" onClick={() => setEmailOpen(true)}><i className="bi bi-envelope" /> Enviar email</button>
            <button type="button" className="ify-btn-outline" onClick={downloadPdf}><i className="bi bi-file-pdf" /> Descargar PDF</button>
          </div>
        </div>
      </div>

      <div className="ify-card mt-4 overflow-x-auto">
        <table className="ify-table">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td>{String(i.description)}</td>
                <td>{Number(i.quantity)}</td>
                <td>S/ {Number(i.unit_price).toFixed(2)}</td>
                <td>S/ {Number(i.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div ref={printRef} className="hidden">
        <div className="header">
          <div><h1>{COMPANY.name}</h1><p>RUC: {COMPANY.ruc}</p><p>{COMPANY.address}</p></div>
          <div style={{ textAlign: "right" }}>
            <strong>{String(doc.document_type_description)}</strong><br />
            {String(doc.number)}<br />
            Fecha: {String(doc.date_of_issue)}
          </div>
        </div>
        <p><strong>Cliente:</strong> {String(doc.customer_name)} ({String(doc.customer_number)})</p>
        <table>
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P.Unit</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td>{String(i.description)}</td>
                <td>{Number(i.quantity)}</td>
                <td>{Number(i.unit_price).toFixed(2)}</td>
                <td>{Number(i.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ textAlign: "right", marginTop: 16 }}>
          <strong>Total: S/ {Number(doc.total).toFixed(2)}</strong>
        </p>
      </div>

      <Modal open={emailOpen} title="Enviar comprobante por email" onClose={() => setEmailOpen(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={sendEmail}>Enviar</button>}>
        <Field label="Email destino">
          <input className="ify-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />
        </Field>
      </Modal>
    </div>
  );
}
