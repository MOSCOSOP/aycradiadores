"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Modal";
import { GuiaPrintTemplate } from "@/components/dispatches/GuiaPrintTemplate";
import { buildGuiaPrintData, printGuia } from "@/lib/comprobante/guia-print";
import { guideTypeLabel } from "@/lib/dispatch-fields";
import { api } from "@/lib/api/client";

export function DispatchDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.dispatches
      .get(id)
      .then((r) => {
        setDoc(r.data);
        setItems((r.data.items as Record<string, unknown>[]) || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!doc) return <div className="p-5">Guía no encontrada</div>;

  const guideType = String(doc.guide_type ?? doc.guideType ?? "09");
  const printData = buildGuiaPrintData({ ...doc, items });
  const listHref = guideType === "31" ? "/dispatches-carrier" : "/dispatches";

  return (
    <div className="ify-page">
      <PageHeader
        title={`Guía ${doc.number}`}
        subtitle={guideTypeLabel(guideType)}
        actions={
          <>
            <Link href={listHref} className="ify-btn-outline text-xs">
              ← Volver
            </Link>
            <button type="button" className="ify-btn-primary text-xs" onClick={() => printGuia("doc-print-area", "A4")}>
              <i className="bi bi-printer" /> Imprimir A4
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => printGuia("doc-print-area", "A5")}>
              Imprimir A5
            </button>
          </>
        }
      />

      <div className="ify-card mb-4 p-4">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Destinatario</dt>
            <dd>{String(doc.customer_name)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">F. emisión</dt>
            <dd>{String(doc.date_of_issue || doc.date)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">F. traslado</dt>
            <dd>{String(doc.date_of_transfer || doc.date_of_issue || "—")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Motivo</dt>
            <dd>{String(doc.transfer_reason)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Placa</dt>
            <dd>{String(doc.vehicle_plate || doc.plate || "—")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Conductor</dt>
            <dd>{String(doc.driver_name || "—")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Peso total</dt>
            <dd>
              {String(doc.total_weight ?? 0)} {String(doc.unit_measure ?? "KGM")}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--muted)]">Estado</dt>
            <dd>{String(doc.state || doc.state_type_description)}</dd>
          </div>
          <div className="flex justify-between md:col-span-2">
            <dt className="text-[var(--muted)]">Origen</dt>
            <dd>{String(doc.origin_address || "—")}</dd>
          </div>
          <div className="flex justify-between md:col-span-2">
            <dt className="text-[var(--muted)]">Destino</dt>
            <dd>{String(doc.dest_address || "—")}</dd>
          </div>
        </dl>
      </div>

      <div className="ify-card mb-4 overflow-x-auto">
        <table className="ify-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Unidad</th>
            </tr>
          </thead>
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

      <div className="pointer-events-none fixed left-[-9999px] top-0" aria-hidden="true">
        <GuiaPrintTemplate data={printData} />
      </div>
    </div>
  );
}
