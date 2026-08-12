"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type KardexRow = Record<string, unknown>;

export function KardexReportPage() {
  const [rows, setRows] = useState<KardexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ type: "in", quantity: "", reference: "", description: "" });

  const load = useCallback(() => {
    setLoading(true);
    api.reports
      .fetch("reports/kardex")
      .then((r) => setRows(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      [r.item, r.internal_id, r.reference, r.type].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const openEdit = (row: KardexRow) => {
    setEditId(Number(row.id));
    setEditForm({
      type: String(row.type ?? "in"),
      quantity: String(row.quantity ?? ""),
      reference: String(row.reference ?? ""),
      description: String(row.description ?? ""),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    await api.inventory.updateMovement(editId, {
      type: editForm.type,
      quantity: Number(editForm.quantity),
      reference: editForm.reference,
      description: editForm.description,
    });
    setEditOpen(false);
    load();
  };

  const remove = async (row: KardexRow) => {
    if (!confirm(`¿Eliminar movimiento de «${row.item}»?`)) return;
    await api.inventory.deleteMovement(Number(row.id));
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader title="Reporte kardex" subtitle={`${filtered.length} movimientos`} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto, código o referencia..."
        exportFilename="reporte_kardex.csv"
        exportTitle="Reporte kardex"
        exportRows={filtered}
        exportColumns={[
          { key: "date", label: "Fecha" },
          { key: "internal_id", label: "Código" },
          { key: "item", label: "Producto" },
          { key: "type", label: "Tipo" },
          { key: "quantity", label: "Cantidad" },
          { key: "reference", label: "Referencia" },
          { key: "stock", label: "Stock actual" },
        ]}
      />
      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: "date", label: "Fecha" },
          { key: "internal_id", label: "Código" },
          { key: "item", label: "Producto" },
          { key: "warehouse", label: "Almacén", render: (r) => String(r.warehouse ?? "Oficina Principal") },
          { key: "type", label: "Tipo" },
          { key: "quantity", label: "Cantidad" },
          { key: "reference", label: "Referencia" },
          { key: "stock", label: "Stock actual" },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(r)} />,
          },
        ]}
      />

      <Modal
        open={editOpen}
        title="Editar movimiento kardex"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={saveEdit}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Tipo">
            <select className="ify-select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjust">Ajuste</option>
            </select>
          </Field>
          <Field label="Cantidad">
            <input type="number" className="ify-input" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })} />
          </Field>
          <Field label="Referencia">
            <input className="ify-input" value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} />
          </Field>
          <Field label="Descripción">
            <input className="ify-input" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
