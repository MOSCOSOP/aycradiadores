"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

/** Gastos diversos reales (alquiler, servicios, etc.) — reemplaza el catálogo genérico de
 * /expenses. Se suman al cálculo de utilidad del Dashboard. */
export function ExpensesPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    api.expenses.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setDescription("");
    setCategory("");
    setAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setDescription(String(r.description ?? ""));
    setCategory(String(r.category ?? ""));
    setAmount(Number(r.amount ?? 0));
    setDate(String(r.date ?? ""));
    setNote(String(r.note ?? ""));
    setModalOpen(true);
  };

  const save = async () => {
    if (!description.trim() || !amount) {
      alert("Descripción y monto son obligatorios");
      return;
    }
    const payload = { description: description.trim(), category, amount, date, note };
    try {
      if (editId) await api.expenses.update(editId, payload);
      else await api.expenses.create(payload);
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    await api.expenses.delete(id);
    load();
  };

  const total = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  return (
    <div className="ify-page">
      <PageHeader
        title="Gastos diversos"
        subtitle="Alquiler, servicios y otros gastos — se suman al cálculo de utilidad del Dashboard"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo gasto
          </button>
        }
      />
      <div className="ify-card mb-3 p-3">
        <p className="text-xs text-[var(--muted)]">Total registrado</p>
        <p className="text-lg font-bold text-[var(--primary)]">S/ {total.toFixed(2)}</p>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin gastos registrados — agrega el primero con «Nuevo gasto»"
        columns={[
          { key: "date", label: "Fecha" },
          { key: "description", label: "Descripción" },
          { key: "category", label: "Categoría" },
          { key: "supplier_name", label: "Proveedor" },
          { key: "amount", label: "Monto", render: (r) => `S/ ${Number(r.amount ?? 0).toFixed(2)}` },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={editId ? "Editar gasto" : "Nuevo gasto"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Descripción" className="sm:col-span-2">
            <input className="ify-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <input className="ify-input" placeholder="Alquiler, servicios, etc." value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Monto (S/)">
            <input type="number" step="0.01" className="ify-input" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Fecha">
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
