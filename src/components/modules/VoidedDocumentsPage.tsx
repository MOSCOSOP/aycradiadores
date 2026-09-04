"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api/client";

/** Comprobantes realmente anulados (o con baja en proceso) — de solo lectura: la anulación se
 * hace desde el propio comprobante ("Anular"), no tiene sentido "crear" una aquí. */
export function VoidedDocumentsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.generic
      .records("voided/records")
      .then((r) => setRows(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ify-page">
      <div className="mb-4">
        <h1 className="text-lg font-bold">Anulaciones</h1>
        <p className="text-xs text-[var(--muted)]">
          Comprobantes anulados o con baja ante SUNAT en proceso. La anulación se hace desde el propio comprobante.
        </p>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="No hay comprobantes anulados"
        columns={[
          {
            key: "number",
            label: "Comprobante",
            render: (r) => (
              <Link href={`/documents/${r.id}`} className="ify-link">
                {String(r.number)}
              </Link>
            ),
          },
          { key: "customer_name", label: "Cliente" },
          { key: "date", label: "Fecha" },
          {
            key: "state",
            label: "Estado",
            render: (r) => <Badge tone={r.state === "Anulado" ? "error" : "warning"}>{String(r.state)}</Badge>,
          },
          { key: "reference", label: "Motivo", render: (r) => String(r.reference || "—") },
          { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total ?? 0).toFixed(2)}` },
        ]}
      />
    </div>
  );
}
