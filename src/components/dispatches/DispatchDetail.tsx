"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Modal";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";

export function DispatchDetail() {
  const params = useParams();
  const id = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.dispatches.get(id).then((r) => {
      setDoc(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));
  }, [id]);

  const printDoc = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${doc?.number}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px}</style>
      </head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!doc) return <div className="p-5">Guía no encontrada</div>;

  return (
    <div className="p-4 md:p-5">
      <PageHeader
        title={`Guía ${doc.number}`}
        subtitle="Guía de remisión remitente"
        actions={
          <>
            <Link href="/dispatches" className="ify-btn-outline text-xs">← Volver</Link>
            <button type="button" className="ify-btn-primary text-xs" onClick={printDoc}>
              <i className="bi bi-printer" /> Imprimir
            </button>
          </>
        }
      />
      <div className="ify-card mb-4 p-4">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Cliente</dt><dd>{String(doc.customer_name)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Fecha</dt><dd>{String(doc.date_of_issue || doc.date)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Motivo</dt><dd>{String(doc.transfer_reason)}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Placa vehículo</dt><dd>{String(doc.vehicle_plate || doc.plate || "—")}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Conductor</dt><dd>{String(doc.driver_name || "—")}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--muted)]">Estado</dt><dd>{String(doc.state || doc.state_type_description)}</dd></div>
          <div className="flex justify-between md:col-span-2"><dt className="text-[var(--muted)]">Origen</dt><dd>{String(doc.origin_address || "—")}</dd></div>
          <div className="flex justify-between md:col-span-2"><dt className="text-[var(--muted)]">Destino</dt><dd>{String(doc.dest_address || "—")}</dd></div>
        </dl>
      </div>
      <div className="ify-card overflow-x-auto">
        <table className="ify-table">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>Unidad</th></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td>{String(i.description)}</td>
                <td>{Number(i.quantity)}</td>
                <td>{String(i.unit_type_id || "NIU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div ref={printRef} className="hidden">
        <h1>{COMPANY.name}</h1>
        <p>RUC: {COMPANY.ruc}</p>
        <h2>GUÍA DE REMISIÓN {String(doc.number)}</h2>
        <p>Cliente: {String(doc.customer_name)}</p>
        <p>Origen: {String(doc.origin_address)} → Destino: {String(doc.dest_address)}</p>
        <table>
          <thead><tr><th>Descripción</th><th>Cant.</th></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}><td>{String(i.description)}</td><td>{Number(i.quantity)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
