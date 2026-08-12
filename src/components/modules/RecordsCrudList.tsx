"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import {
  emptyCatalogForm,
  getCatalogDisplayColumns,
  getCatalogFields,
  rowToCatalogForm,
  type CatalogField,
} from "@/lib/catalog-form-config";

type RecordsCrudListProps = {
  pathname: string;
  apiPath: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  extraColumns?: { key: string; label: string; render?: (r: Record<string, unknown>) => React.ReactNode }[];
};

function FieldInput({
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
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return <textarea className="ify-input min-h-[72px]" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <input
      className="ify-input"
      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Listado con CRUD genérico para módulos de finanzas, contabilidad, etc. */
export function RecordsCrudList({
  pathname,
  apiPath,
  title,
  subtitle,
  actions,
  extraColumns = [],
}: RecordsCrudListProps) {
  const modulePath = apiPath.replace(/\/records$/, "");
  const recordsPath = apiPath.endsWith("/records") ? apiPath : `${apiPath}/records`;
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
      const res = await api.generic.records(recordsPath);
      setRows(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [recordsPath]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [rows, search]);

  const displayCols = useMemo(() => {
    const base = getCatalogDisplayColumns(pathname, rows[0]).map((c) => ({
      key: c.key,
      label: c.label,
      render: (r: Record<string, unknown>) => {
        const val = r[c.key];
        return val == null || val === "" ? "—" : String(val);
      },
    }));
    return [...extraColumns, ...base, {
      key: "actions",
      label: "Acciones",
      render: (r: Record<string, unknown>) => (
        <RowActions
          onEdit={() => {
            setEditId(Number(r.id));
            setForm(rowToCatalogForm(r, formFields));
            setModalOpen(true);
          }}
          onDelete={async () => {
            if (!confirm("¿Eliminar este registro?")) return;
            await api.generic.delete(modulePath, Number(r.id));
            load();
          }}
        />
      ),
    }];
  }, [pathname, rows, extraColumns, formFields, modulePath, load]);

  const save = async () => {
    const payload: Record<string, unknown> = { ...form };
    if (!payload.name && payload.description) payload.name = payload.description;
    if (!payload.description && payload.name) payload.description = payload.name;
    if (!payload.state) payload.state = "Activo";
    if (editId) await api.generic.update(modulePath, editId, payload);
    else await api.generic.create(modulePath, payload);
    setModalOpen(false);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          actions ?? (
            <button type="button" className="ify-btn-primary" onClick={() => {
              setEditId(null);
              setForm(emptyCatalogForm(formFields));
              setModalOpen(true);
            }}>
              <i className="bi bi-plus-lg" /> Nuevo
            </button>
          )
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar..."
        exportFilename={`${pathname.replace(/\//g, "_")}.csv`}
        exportTitle={title}
        exportRows={filtered}
        exportColumns={getCatalogDisplayColumns(pathname, rows[0]).map((c) => ({ key: c.key, label: c.label }))}
      />
      <DataTable loading={loading} rows={filtered} columns={displayCols} emptyMessage={`Sin registros en ${title}.`} />
      <Modal
        open={modalOpen}
        title={editId ? `Editar — ${title}` : `Nuevo — ${title}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {formFields.map((field) => (
            <Field key={field.key} label={`${field.label}${field.required ? " *" : ""}`} className={field.type === "textarea" ? "sm:col-span-2" : undefined}>
              <FieldInput field={field} value={form[field.key] ?? ""} onChange={(v) => setForm({ ...form, [field.key]: v })} />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  );
}
