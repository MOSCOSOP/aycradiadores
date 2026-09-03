"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

/** Tipos de descuento reales (con %), usables como referencia al negociar precio con un
 * cliente. Reemplaza el catálogo genérico de /discount-types. */
export function DiscountTypesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState(0);

  const load = () => {
    setLoading(true);
    api.discountTypes.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setPercent(0);
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setName(String(r.name ?? ""));
    setPercent(Number(r.percent ?? 0));
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    try {
      if (editId) await api.discountTypes.update(editId, { name: name.trim(), percent });
      else await api.discountTypes.create({ name: name.trim(), percent });
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este tipo de descuento?")) return;
    try {
      await api.discountTypes.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Tipos de descuento"
        subtitle="Categorías de descuento con su porcentaje real (ej. Cliente frecuente, Por volumen)"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin tipos de descuento — crea el primero con «Nuevo»"
        columns={[
          { key: "name", label: "Nombre" },
          { key: "percent", label: "Porcentaje", render: (r) => `${Number(r.percent ?? 0)}%` },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={editId ? "Editar tipo de descuento" : "Nuevo tipo de descuento"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Nombre">
            <input className="ify-input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Porcentaje de descuento (%)">
            <input type="number" step="0.1" className="ify-input" value={percent} onChange={(e) => setPercent(Number(e.target.value) || 0)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
