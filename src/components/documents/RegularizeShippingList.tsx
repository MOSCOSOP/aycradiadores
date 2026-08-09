"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

export function RegularizeShippingList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    api.documents
      .regularizeShipping()
      .then((r) => setRows(r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const regularize = async (id: number) => {
    try {
      await api.documents.regularize(id);
      setMsg(`Comprobante #${id} marcado como regularizado.`);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(r.number ?? "").toLowerCase().includes(q) ||
      String(r.customer_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="ify-page">
      <PageHeader
        title="CPE por rectificar (envío)"
        subtitle="Comprobantes pendientes de regularización de envío SUNAT"
        actions={
          <Link href="/documents" className="ify-btn-outline text-xs">
            ← Comprobantes
          </Link>
        }
      />
      {msg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
      <div className="ify-card mb-3 p-3">
        <input className="ify-input" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          {
            key: "number",
            label: "Número",
            render: (r) => (
              <Link href={`/documents/${r.id}`} className="ify-link">
                {String(r.number)}
              </Link>
            ),
          },
          { key: "customer_name", label: "Cliente" },
          { key: "date_of_issue", label: "Emisión" },
          {
            key: "message_regularize_shipping",
            label: "Mensaje",
            render: (r) => (
              <span className="text-xs text-amber-700">{String(r.message_regularize_shipping || "Por regularizar")}</span>
            ),
          },
          { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total ?? 0).toFixed(2)}` },
          {
            key: "id",
            label: "Acción",
            render: (r) => (
              <button type="button" className="ify-btn-outline text-xs" onClick={() => regularize(Number(r.id))}>
                Regularizar
              </button>
            ),
          },
        ]}
        emptyMessage="No hay comprobantes pendientes de regularización"
      />
    </div>
  );
}
