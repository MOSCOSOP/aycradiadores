"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { findNavParent } from "@/lib/page-registry";
import { DataTable } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type CatalogListPageProps = {
  pathname: string;
  apiPath: string;
  title: string;
  /** Campo principal del formulario (name o description) */
  labelField?: "name" | "description";
};

function normalizeRow(row: Record<string, unknown>) {
  return {
    ...row,
    name: row.name ?? row.description ?? "",
    description: row.description ?? row.name ?? "",
    state: row.state ?? "Activo",
    date: row.date ?? row.created_at ?? "",
  };
}

export function CatalogListPage({
  pathname,
  apiPath,
  title,
  labelField = "name",
}: CatalogListPageProps) {
  const parent = findNavParent(pathname);
  const modulePath = apiPath.replace(/\/records$/, "");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.generic.records(apiPath);
      setRows((res.data ?? []).map(normalizeRow));
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const columns = useMemo(
    () => [
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "state", label: "Estado" },
      { key: "date", label: "Fecha", render: (r: Record<string, unknown>) => String(r.date || r.created_at || "—") },
      {
        key: "actions",
        label: "Acciones",
        render: (r: Record<string, unknown>) => (
          <RowActions
            onEdit={() => {
              setEditId(Number(r.id));
              setFormName(String(r.name ?? r.description ?? ""));
              setFormDesc(String(r.description ?? r.name ?? ""));
              setModalOpen(true);
            }}
            onDelete={() => remove(Number(r.id))}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows]
  );

  const exportColumns = [
    { key: "name", label: "Nombre" },
    { key: "description", label: "Descripción" },
    { key: "state", label: "Estado" },
    { key: "date", label: "Fecha" },
  ];

  const openCreate = () => {
    setEditId(null);
    setFormName("");
    setFormDesc("");
    setModalOpen(true);
  };

  const save = async () => {
    const val = formName.trim() || formDesc.trim();
    if (!val) {
      alert("El nombre es obligatorio");
      return;
    }
    const payload =
      labelField === "description"
        ? { description: val, name: val }
        : { name: val, description: formDesc.trim() || val };
    if (editId) await api.generic.update(modulePath, editId, payload);
    else await api.generic.create(modulePath, payload);
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este registro?")) return;
    await api.generic.delete(modulePath, id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        subtitle={parent ? `${parent} · Módulo local` : "Módulo local"}
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo
          </button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar por nombre, descripción..."
        exportFilename={`${pathname.replace(/\//g, "_")}.csv`}
        exportTitle={title}
        exportRows={filtered}
        exportColumns={exportColumns}
      />

      <DataTable
        loading={loading}
        rows={filtered}
        columns={columns}
        emptyMessage={`Sin registros en ${title}. Usa «Nuevo» para agregar.`}
      />

      <Modal
        open={modalOpen}
        title={editId ? `Editar — ${title}` : `Nuevo — ${title}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="ify-btn-primary" onClick={save}>
              Guardar
            </button>
          </>
        }
      >
        <Field label={labelField === "description" ? "Descripción *" : "Nombre *"}>
          <input
            className="ify-input"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
        </Field>
        {labelField === "name" ? (
          <Field label="Descripción" className="mt-3">
            <input className="ify-input" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
          </Field>
        ) : null}
      </Modal>
    </div>
  );
}
