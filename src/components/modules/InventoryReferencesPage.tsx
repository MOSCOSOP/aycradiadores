"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { ItemPicker } from "@/components/ui/ItemPicker";
import { api } from "@/lib/api/client";

/** Códigos equivalentes/alternos de un repuesto (ej. mismo filtro con código OEM distinto al
 * del fabricante) — muy útil para buscar repuestos por el código que trae el cliente.
 * Reemplaza el catálogo genérico de /inventory-references. */
export function InventoryReferencesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [itemId, setItemId] = useState<number | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    api.itemReferences.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setItemId(null);
    setItemLabel("");
    setCode("");
    setNote("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setItemId(Number(r.item_id));
    setItemLabel(String(r.item_description ?? ""));
    setCode(String(r.code ?? ""));
    setNote(String(r.note ?? ""));
    setModalOpen(true);
  };

  const save = async () => {
    if (editId) {
      if (!code.trim()) {
        alert("El código es obligatorio");
        return;
      }
      await api.itemReferences.update(editId, { code: code.trim(), note });
    } else {
      if (!itemId || !code.trim()) {
        alert("Elige el producto y escribe el código equivalente");
        return;
      }
      await api.itemReferences.create({ item_id: itemId, code: code.trim(), note });
    }
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta referencia?")) return;
    await api.itemReferences.delete(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Referencias de inventario"
        subtitle="Códigos equivalentes/alternos de un producto (OEM, código de otra marca, etc.)"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nueva referencia
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin referencias — agrega la primera con «Nueva referencia»"
        columns={[
          { key: "item_description", label: "Producto" },
          { key: "code", label: "Código equivalente" },
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
        title={editId ? "Editar referencia" : "Nueva referencia"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Producto">
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
          <Field label="Código equivalente">
            <input className="ify-input" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Field label="Nota (ej. de qué marca/proveedor es este código)">
            <input className="ify-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
