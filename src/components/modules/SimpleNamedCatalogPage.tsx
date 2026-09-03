"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";

type Api = {
  records: () => Promise<{ data: Record<string, unknown>[] }>;
  create: (payload: Record<string, unknown>) => Promise<unknown>;
  update: (id: number, payload: Record<string, unknown>) => Promise<unknown>;
  delete: (id: number) => Promise<unknown>;
};

/**
 * Catálogo real simple (id + nombre) reutilizado por Marcas, Líneas y Zonas — con conteo de
 * uso real (productos/clientes) en vez del catálogo genérico desconectado de antes.
 */
export function SimpleNamedCatalogPage({
  title,
  subtitle,
  usageLabel,
  api,
}: {
  title: string;
  subtitle: string;
  usageLabel: string;
  api: Api;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const load = () => {
    setLoading(true);
    api.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setName(String(r.name ?? ""));
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    try {
      if (editId) await api.update(editId, { name: name.trim() });
      else await api.create({ name: name.trim() });
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

  const usageKey = Object.keys(rows[0] ?? {}).find((k) => k.endsWith("_count")) ?? "items_count";

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
        emptyMessage={`Sin registros — usa «Nuevo» para agregar el primero`}
        columns={[
          { key: "name", label: "Nombre" },
          { key: usageKey, label: usageLabel, render: (r) => Number(r[usageKey] ?? 0) },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
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
        <Field label="Nombre">
          <input className="ify-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  );
}
