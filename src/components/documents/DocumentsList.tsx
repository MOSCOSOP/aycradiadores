"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

type DocRow = Record<string, unknown>;

export function DocumentsList() {
  const [rows, setRows] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (value = "", p = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.documents.records({
        page: p,
        limit: 30,
        order: "desc",
        column: value ? "number" : "date_of_issue",
        value,
      });
      setRows(res.data ?? []);
      setTotal((res.meta as { total?: number })?.total ?? res.data?.length ?? 0);
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando comprobantes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar el comprobante ${number}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.documents.delete(id);
      load(search, page);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Facturas - Boletas</h1>
          <p className="text-xs text-[var(--muted)]">Listado de comprobantes emitidos</p>
        </div>
        <div className="flex gap-2">
          <Link href="/documents/massive" className="ify-btn-outline">
            Emisión masiva
          </Link>
          <Link href="/documents/create" className="ify-btn-primary">
            <i className="bi bi-plus-lg" /> Nuevo comprobante
          </Link>
        </div>
      </div>

      <div className="ify-card mb-3 p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Filtros de búsqueda</p>
        <div className="flex gap-2">
          <input
            className="ify-input flex-1"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, 1)}
          />
          <button type="button" className="ify-btn-primary" onClick={() => load(search, 1)}>
            <i className="bi bi-search" /> Buscar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => (page - 1) * 30 + i + 1 },
          {
            key: "date_of_issue",
            label: "Emisión",
            render: (r) => (
              <div className="text-xs">
                {String(r.date_of_issue)}
                <br />
                <span className="text-[var(--muted)]">{String(r.send_type || "Env. Individual")}</span>
              </div>
            ),
          },
          {
            key: "customer_name",
            label: "Cliente",
            render: (r) => (
              <div className="text-xs">
                {String(r.customer_name)}
                <br />
                <span className="text-[var(--muted)]">{String(r.customer_number)}</span>
              </div>
            ),
          },
          {
            key: "number",
            label: "Número",
            render: (r) => (
              <Link href={`/documents/${r.id}`} className="ify-link">
                {String(r.number)}
              </Link>
            ),
          },
          {
            key: "state_type_description",
            label: "Estado",
            render: (r) => (
              <span className="rounded bg-green-50 px-2 py-0.5 text-[11px] text-green-700">
                {String(r.state_type_description || "Aceptado")}
              </span>
            ),
          },
          { key: "total_taxed", label: "T.Gravado", render: (r) => Number(r.total_taxed ?? 0).toFixed(2) },
          { key: "total_igv", label: "T.Igv", render: (r) => Number(r.total_igv ?? 0).toFixed(2) },
          {
            key: "total",
            label: "Total",
            render: (r) => (
              <span className="font-semibold">
                {r.currency_type_id === "USD" ? "$" : "S/"}{" "}
                {Number(r.total ?? 0).toFixed(2)}
              </span>
            ),
          },
          { key: "balance", label: "Saldo", render: (r) => Number(r.balance ?? 0).toFixed(2) },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <div className="flex items-center gap-1">
                <Link href={`/documents/${r.id}`} className="ify-btn-ghost px-2" title="Ver / imprimir">
                  <i className="bi bi-printer" />
                </Link>
                <RowActions onDelete={() => remove(Number(r.id), String(r.number ?? ""))} />
              </div>
            ),
          },
        ]}
      />

      {total > 30 && (
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            className="ify-btn-outline text-xs"
            disabled={page <= 1}
            onClick={() => load(search, page - 1)}
          >
            Anterior
          </button>
          <span className="px-2 py-1 text-xs text-[var(--muted)]">
            Página {page} · {total} registros
          </span>
          <button
            type="button"
            className="ify-btn-outline text-xs"
            disabled={page * 30 >= total}
            onClick={() => load(search, page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
