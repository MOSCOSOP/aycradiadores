"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { ItemPicker } from "@/components/ui/ItemPicker";
import { api } from "@/lib/api/client";

/** Lotes de compra por producto, para trazabilidad/garantía — reemplaza /item-lots. */
export function ItemLotsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    api.itemLots.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setItemId(null);
    setItemLabel("");
    setCode("");
    setQuantity(0);
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setItemId(Number(r.item_id));
    setItemLabel(String(r.item_description ?? ""));
    setCode(String(r.code ?? ""));
    setQuantity(Number(r.quantity ?? 0));
    setDate(String(r.date ?? ""));
    setNote(String(r.note ?? ""));
    setModalOpen(true);
  };

  const save = async () => {
    if (!code.trim()) {
      alert("El código de lote es obligatorio");
      return;
    }
    if (editId) {
      await api.itemLots.update(editId, { code: code.trim(), quantity, date, note });
    } else {
      if (!itemId) {
        alert("Elige el producto");
        return;
      }
      await api.itemLots.create({ item_id: itemId, code: code.trim(), quantity, date, note });
    }
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este lote?")) return;
    await api.itemLots.delete(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Lotes"
        subtitle="Lotes de compra por producto — trazabilidad y garantía"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo lote
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin lotes registrados — agrega el primero con «Nuevo lote»"
        columns={[
          { key: "item_description", label: "Producto" },
          { key: "code", label: "Código de lote" },
          { key: "quantity", label: "Cantidad" },
          { key: "date", label: "Fecha de compra" },
          { key: "note", label: "Nota" },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={editId ? "Editar lote" : "Nuevo lote"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Producto" className="sm:col-span-2">
            {editId ? (
              <input className="ify-input" value={itemLabel} disabled />
            ) : (
              <ItemPicker
                selectedLabel={itemLabel || "Buscar producto..."}
                onSelect={(it) => {
                  setItemId(it.id);
                  setItemLabel(it.description);
                }}
              />
            )}
          </Field>
          <Field label="Código de lote">
            <input className="ify-input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Cantidad">
            <input type="number" className="ify-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Fecha de compra">
            <input type="date" className="ify-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Nota">
            <input className="ify-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
