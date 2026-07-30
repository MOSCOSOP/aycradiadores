"use client";

import { useEffect, useState } from "react";
import { findNavLabel, findNavParent, pathToRecordsApi } from "@/lib/page-registry";
import { DataTable } from "@/components/ui/DataTable";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type PageMeta = {
  title?: string;
  table_headers?: string[];
  buttons?: string[];
};

type UniversalListPageProps = {
  pathname: string;
};

export function UniversalListPage({ pathname }: UniversalListPageProps) {
  const title = findNavLabel(pathname) || pathname.split("/").pop()?.replace(/-/g, " ") || "Módulo";
  const parent = findNavParent(pathname);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");

  const apiPath = pathToRecordsApi(pathname);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.generic.records(apiPath).catch(() => ({ data: [] as Record<string, unknown>[] })),
      fetch(`/api/page-meta${pathname}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([res, m]) => {
        setRows(res.data ?? []);
        setMeta(m);
      })
      .finally(() => setLoading(false));
  }, [pathname, apiPath]);

  const headers = meta?.table_headers?.filter(Boolean) ?? [];
  const columns =
    headers.length > 0
      ? headers.map((h, i) => ({
          key: `col_${i}`,
          label: h,
          render: (r: Record<string, unknown>) => String(r[`col_${i}`] ?? r[h.toLowerCase()] ?? ""),
        }))
      : rows.length > 0
        ? Object.keys(rows[0])
            .filter((k) => k !== "id")
            .slice(0, 6)
            .map((k) => ({ key: k, label: k.replace(/_/g, " ") }))
        : [
            { key: "col_0", label: "Descripción" },
            { key: "col_1", label: "Estado" },
            { key: "col_2", label: "Fecha" },
          ];

  const handleCreate = async () => {
    if (!formName.trim()) return;
    await api.generic.create(apiPath.replace(/\/records$/, ""), { name: formName, description: formName });
    setModalOpen(false);
    setFormName("");
    const res = await api.generic.records(apiPath);
    setRows(res.data ?? []);
  };

  return (
    <div className="p-4 md:p-5">
      <PageHeader
        title={title}
        subtitle={parent ? `${parent} · Módulo local` : "Módulo local — sin 404"}
        actions={
          <button type="button" className="ify-btn-primary" onClick={() => setModalOpen(true)}>
            <i className="bi bi-plus-lg" /> Nuevo
          </button>
        }
      />

      <div className="ify-card mb-3 p-3">
        <div className="flex flex-wrap gap-2">
          <input className="ify-input max-w-md flex-1" placeholder="Buscar..." readOnly />
          <button type="button" className="ify-btn-outline"><i className="bi bi-search" /> Buscar</button>
          <button type="button" className="ify-btn-outline"><i className="bi bi-funnel" /> Filtros</button>
          <button type="button" className="ify-btn-outline"><i className="bi bi-download" /> Exportar</button>
        </div>
      </div>

      <DataTable
        loading={loading}
        rows={rows}
        columns={columns}
        emptyMessage={`Sin registros en ${title}. Usa «Nuevo» para agregar.`}
      />

      <Modal
        open={modalOpen}
        title={`Nuevo — ${title}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={handleCreate}>Guardar</button>
          </>
        }
      >
        <Field label="Nombre / Descripción">
          <input className="ify-input" value={formName} onChange={(e) => setFormName(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
