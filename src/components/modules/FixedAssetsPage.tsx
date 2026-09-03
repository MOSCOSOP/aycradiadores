"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

const STATUS_OPTIONS = ["Activo", "En reparación", "De baja"];

/** Registro real de activos fijos (herramientas, equipos, vehículo de reparto) — unifica lo
 * que antes eran dos catálogos genéricos separados y desconectados (/fixed-asset/items y
 * /fixed-asset/purchases). */
export function FixedAssetsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [status, setStatus] = useState("Activo");
  const [note, setNote] = useState("");

  const load = () => {
    setLoading(true);
    api.fixedAssets.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setCategory("");
    setPurchaseDate("");
    setPurchasePrice(0);
    setStatus("Activo");
    setNote("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setName(String(r.name ?? ""));
    setCategory(String(r.category ?? ""));
    setPurchaseDate(String(r.purchase_date ?? ""));
    setPurchasePrice(Number(r.purchase_price ?? 0));
    setStatus(String(r.status ?? "Activo"));
    setNote(String(r.note ?? ""));
    setModalOpen(true);
  };

  const save = async () => {
    if (!name.trim()) {
      alert("El nombre del activo es obligatorio");
      return;
    }
    const payload = { name: name.trim(), category, purchase_date: purchaseDate, purchase_price: purchasePrice, status, note };
    try {
      if (editId) await api.fixedAssets.update(editId, payload);
      else await api.fixedAssets.create(payload);
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este activo?")) return;
    await api.fixedAssets.delete(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Activos fijos"
        subtitle="Herramientas, equipos y vehículos de la empresa"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo activo
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin activos registrados — agrega el primero con «Nuevo activo»"
        columns={[
          { key: "name", label: "Nombre" },
          { key: "category", label: "Categoría" },
          { key: "purchase_date", label: "Fecha de compra" },
          { key: "purchase_price", label: "Precio de compra", render: (r) => `S/ ${Number(r.purchase_price ?? 0).toFixed(2)}` },
          {
            key: "status",
            label: "Estado",
            render: (r) => {
              const s = String(r.status ?? "Activo");
              const cls = s === "Activo" ? "bg-green-50 text-green-700" : s === "En reparación" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700";
              return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{s}</span>;
            },
          },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={editId ? "Editar activo" : "Nuevo activo"}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" className="sm:col-span-2">
            <input className="ify-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Categoría">
            <input className="ify-input" placeholder="Herramienta, equipo, vehículo..." value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Estado">
            <select className="ify-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fecha de compra">
            <input type="date" className="ify-input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </Field>
          <Field label="Precio de compra (S/)">
            <input type="number" step="0.01" className="ify-input" value={purchasePrice} onChange={(e) => setPurchasePrice(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Nota" className="sm:col-span-2">
            <input className="ify-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
