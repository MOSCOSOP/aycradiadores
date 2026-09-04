"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";

type FieldConfig = { key: string; label: string; type?: "text" | "number"; required?: boolean };

type Api = {
  records: () => Promise<{ data: Record<string, unknown>[] }>;
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
  delete: (id: number) => Promise<unknown>;
};

/**
 * Catálogo real con varios campos propios (a diferencia de CatalogListPage, que solo conoce
 * name/description/state) — usado por Conductores, Vehículos y Direcciones de partida, con
 * etiquetas siempre en español (CatalogListPage generaba encabezados en inglés a partir del
 * nombre técnico del campo cuando no había uno configurado).
 */
export function MultiFieldCatalogPage({
  title,
  subtitle,
  fields,
  api,
}: {
  title: string;
  subtitle: string;
  fields: FieldConfig[];
  api: Api;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    api.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emptyForm = () => Object.fromEntries(fields.map((f) => [f.key, ""]));

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setForm(Object.fromEntries(fields.map((f) => [f.key, String(r[f.key] ?? "")])));
    setModalOpen(true);
  };

  const save = async () => {
    const missing = fields.find((f) => f.required && !form[f.key]?.trim());
    if (missing) {
      alert(`${missing.label} es obligatorio`);
      return;
    }
    try {
      if (editId) await api.update(editId, form);
      else await api.create(form);
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await api.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin registros — usa «Nuevo» para agregar el primero"
        columns={[
          ...fields.map((f) => ({ key: f.key, label: f.label })),
          {
            key: "actions",
            label: "Acciones",
            render: (r: Record<string, unknown>) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />
            ),
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={editId ? "Editar" : "Nuevo"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((f, idx) => (
            <Field key={f.key} label={`${f.label}${f.required ? " *" : ""}`}>
              <input
                className="ify-input"
                type={f.type === "number" ? "number" : "text"}
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                autoFocus={idx === 0}
              />
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  );
}
