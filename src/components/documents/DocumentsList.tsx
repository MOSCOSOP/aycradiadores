"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

type DocRow = Record<string, unknown>;
type SummaryType = { document_type_id: string; label: string; count: number; total: number };
type Summary = { total_count: number; voided_count: number; by_type: SummaryType[] };

const STATE_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "05", label: "Aceptado por SUNAT" },
  { value: "01", label: "Registrado (sin enviar)" },
  { value: "11", label: "Anulado" },
];

export function DocumentsList() {
  const router = useRouter();
  const [rows, setRows] = useState<DocRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (value = search, p = 1, typeId = typeFilter, stateId = stateFilter) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.documents.records({
        page: p,
        limit: 30,
        order: "desc",
        column: value ? "number" : "date_of_issue",
        value,
        document_type_id: typeId || undefined,
        state_type_id: stateId || undefined,
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

  const loadSummary = () => {
    api.documents.summary().then((r) => setSummary(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyTypeFilter = (typeId: string) => {
    const next = typeFilter === typeId ? "" : typeId;
    setTypeFilter(next);
    load(search, 1, next, stateFilter);
  };

  const applyStateFilter = (stateId: string) => {
    setStateFilter(stateId);
    load(search, 1, typeFilter, stateId);
  };

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar el comprobante ${number}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.documents.delete(id);
      load(search, page);
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const voidDocument = async (id: number, number: string) => {
    const reason = prompt(
      `Motivo de anulación del comprobante ${number} (se envía a SUNAT en la Comunicación de Baja):`,
      "Error en la emisión"
    );
    if (reason === null) return;
    try {
      const res = await api.documents.void(id, reason);
      alert(res.message);
      load(search, page);
      loadSummary();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo anular");
    }
  };

  const checkVoidStatus = async (id: number) => {
    try {
      const res = await api.documents.checkVoidStatus(id);
      alert(res.message);
      if (res.done) {
        load(search, page);
        loadSummary();
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo consultar el estado");
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

      {summary && (
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <button
            type="button"
            className={`ify-card p-3 text-left transition ${typeFilter === "" ? "ring-2 ring-[var(--primary)]" : ""}`}
            onClick={() => applyTypeFilter("")}
          >
            <p className="text-[11px] text-[var(--muted)]">Todos</p>
            <p className="text-lg font-bold">{summary.total_count}</p>
          </button>
          {summary.by_type.map((t) => (
            <button
              key={t.document_type_id}
              type="button"
              className={`ify-card p-3 text-left transition ${typeFilter === t.document_type_id ? "ring-2 ring-[var(--primary)]" : ""}`}
              onClick={() => applyTypeFilter(t.document_type_id)}
              title={`S/ ${t.total.toFixed(2)}`}
            >
              <p className="truncate text-[11px] text-[var(--muted)]">{t.label}</p>
              <p className="text-lg font-bold">{t.count}</p>
            </button>
          ))}
          {summary.voided_count > 0 && (
            <div className="ify-card p-3 text-left">
              <p className="text-[11px] text-[var(--muted)]">Anulados</p>
              <p className="text-lg font-bold text-red-600">{summary.voided_count}</p>
            </div>
          )}
        </div>
      )}

      <div className="ify-card mb-3 p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Filtros de búsqueda</p>
        <div className="flex flex-wrap gap-2">
          <input
            className="ify-input flex-1"
            placeholder="Buscar por número o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, 1)}
          />
          <select
            className="ify-select w-auto"
            value={stateFilter}
            onChange={(e) => applyStateFilter(e.target.value)}
          >
            {STATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
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
        emptyMessage={
          search || typeFilter || stateFilter
            ? "Ningún comprobante coincide con los filtros — prueba a limpiarlos"
            : "Aún no hay comprobantes emitidos — genera el primero con «Nuevo comprobante»"
        }
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
            render: (r) => {
              const stateId = String(r.state_type_id);
              const isVoided = stateId === "11";
              const isAccepted = stateId === "05";
              const isVoidPending = stateId === "12";
              const cls = isVoided
                ? "bg-red-50 text-red-700"
                : isVoidPending
                ? "bg-amber-50 text-amber-700"
                : isAccepted
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700";
              return (
                <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>
                  {isVoided ? "Anulado" : isVoidPending ? "Baja en proceso" : String(r.state_type_description || "Aceptado")}
                </span>
              );
            },
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
            render: (r) => {
              const stateId = String(r.state_type_id);
              const isVoided = stateId === "11";
              const isAccepted = stateId === "05";
              const isVoidPending = stateId === "12";
              return (
                <div className="flex items-center gap-1">
                  <Link href={`/documents/${r.id}`} className="ify-btn-ghost px-2" title="Ver / imprimir / más acciones">
                    <i className="bi bi-eye" />
                  </Link>
                  {!isAccepted && !isVoided && !isVoidPending && (
                    <button
                      type="button"
                      className="ify-btn-ghost px-2"
                      title="Editar / rectificar"
                      onClick={() => router.push(`/documents/create?edit=${r.id}`)}
                    >
                      <i className="bi bi-pencil" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="ify-btn-ghost px-2"
                    title="Duplicar como comprobante nuevo"
                    onClick={() => router.push(`/documents/create?from=${r.id}`)}
                  >
                    <i className="bi bi-files" />
                  </button>
                  {isAccepted && (
                    <button
                      type="button"
                      className="ify-btn-ghost px-2 text-amber-600"
                      title="Anular ante SUNAT (Comunicación de Baja)"
                      onClick={() => voidDocument(Number(r.id), String(r.number ?? ""))}
                    >
                      <i className="bi bi-slash-circle" />
                    </button>
                  )}
                  {isVoidPending && (
                    <button
                      type="button"
                      className="ify-btn-ghost px-2 text-amber-600"
                      title="Consultar estado de la baja"
                      onClick={() => checkVoidStatus(Number(r.id))}
                    >
                      <i className="bi bi-arrow-repeat" />
                    </button>
                  )}
                  <RowActions onDelete={() => remove(Number(r.id), String(r.number ?? ""))} />
                </div>
              );
            },
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
