"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { findNavParent } from "@/lib/page-registry";
import {
  emptyCatalogForm,
  getCatalogDisplayColumns,
  getCatalogFields,
  rowToCatalogForm,
  type CatalogField,
} from "@/lib/catalog-form-config";
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
    state: row.state ?? row.state_type_description ?? "Activo",
    date: row.date ?? row.created_at ?? row.date_of_issue ?? "",
  };
}

function CatalogFieldInput({
  field,
  value,
  onChange,
}: {
  field: CatalogField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.type === "select" && field.options?.length) {
    return (
      <select className="ify-select" value={value} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        className="ify-input min-h-[72px]"
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      className="ify-input"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function CatalogListPage({
  pathname,
  apiPath,
  title,
  labelField = "name",
}: CatalogListPageProps) {
  const parent = findNavParent(pathname);
  const modulePath = apiPath.replace(/\/records$/, "");
  const formFields = useMemo(() => getCatalogFields(pathname), [pathname]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>(() => emptyCatalogForm(formFields));

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

  const displayColumns = useMemo(() => {
    const cols = getCatalogDisplayColumns(pathname, rows[0]);
    return [
      ...cols.map((c) => ({
        key: c.key,
        label: c.label,
        render: (r: Record<string, unknown>) => {
          const val = r[c.key];
          if (val == null || val === "") return "—";
          return String(val);
        },
      })),
      {
        key: "actions",
        label: "Acciones",
        render: (r: Record<string, unknown>) => (
          <RowActions
            onEdit={() => openEdit(r)}
            onDelete={() => remove(Number(r.id))}
          />
        ),
      },
    ];
  }, [pathname, rows]);

  const exportColumns = useMemo(
    () => getCatalogDisplayColumns(pathname, rows[0]).map((c) => ({ key: c.key, label: c.label })),
    [pathname, rows]
  );

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyCatalogForm(formFields));
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditId(Number(row.id));
    setForm(rowToCatalogForm(row, formFields));
    setModalOpen(true);
  };

  const save = async () => {
    const primaryKey = labelField === "description" ? "description" : "name";
    const primary = form[primaryKey]?.trim() || form.name?.trim() || form.description?.trim();
    if (!primary) {
      alert("El nombre o descripción es obligatorio");
      return;
    }
    const payload: Record<string, unknown> = { ...form };
    if (!payload.name) payload.name = primary;
    if (!payload.description) payload.description = form.description?.trim() || primary;
    if (!payload.state) payload.state = "Activo";
    if (payload.date && !payload.created_at) payload.date = payload.date;

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
          <button
            type="button"
            className="ify-btn-primary"
            onClick={() => {
              openCreate();
              setModalOpen(true);
            }}
          >
            <i className="bi bi-plus-lg" /> Nuevo
          </button>
        }
      />

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar por nombre, código, referencia..."
        exportFilename={`${pathname.replace(/\//g, "_")}.csv`}
        exportTitle={title}
        exportRows={filtered}
        exportColumns={exportColumns}
      />

      <DataTable
        loading={loading}
        rows={filtered}
        columns={displayColumns}
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
        <div className="grid gap-3 sm:grid-cols-2">
          {formFields.map((field) => (
            <Field
              key={field.key}
              label={`${field.label}${field.required ? " *" : ""}`}
              className={field.type === "textarea" ? "sm:col-span-2" : undefined}
            >
              <CatalogFieldInput
                field={field}
                value={form[field.key] ?? ""}
                onChange={(v) => setField(field.key, v)}
              />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  );
}
