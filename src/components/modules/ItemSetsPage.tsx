"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

type SetLine = { item_id: number; description: string; quantity: number };

/** Packs y promociones reales: agrupa varios productos a un precio fijo, vendible como una
 * sola línea desde /documents/create o el POS. Reemplaza el catálogo genérico de /item-sets. */
export function ItemSetsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0);
  const [lines, setLines] = useState<SetLine[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);

  const load = () => {
    setLoading(true);
    api.itemSets.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (search.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(search, 8).then((r) => setResults(r.data ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setDescription("");
    setPrice(0);
    setLines([]);
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setName(String(r.name ?? ""));
    setDescription(String(r.description ?? ""));
    setPrice(Number(r.price ?? 0));
    setLines(((r.items as SetLine[]) ?? []).map((l) => ({ ...l })));
    setModalOpen(true);
  };

  const addLine = (p: Record<string, unknown>) => {
    const itemId = Number(p.local_id ?? p.id);
    if (lines.some((l) => l.item_id === itemId)) return;
    setLines((prev) => [...prev, { item_id: itemId, description: String(p.description ?? ""), quantity: 1 }]);
    setSearch("");
    setResults([]);
  };

  const save = async () => {
    if (!name.trim()) {
      alert("El nombre del pack es obligatorio");
      return;
    }
    if (lines.length === 0) {
      alert("Agrega al menos un producto al pack");
      return;
    }
    const payload = { name: name.trim(), description, price, items: lines };
    try {
      if (editId) await api.itemSets.update(editId, payload);
      else await api.itemSets.create(payload);
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar el pack");
    }
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar este pack?")) return;
    try {
      await api.itemSets.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Packs y promociones"
        subtitle="Combos de productos a un precio fijo — úsalos como atajo al armar un comprobante"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo pack
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin packs — crea el primero con «Nuevo pack»"
        columns={[
          { key: "name", label: "Nombre" },
          { key: "description", label: "Descripción" },
          { key: "items_count", label: "Productos", render: (r) => Number(r.items_count ?? 0) },
          { key: "price", label: "Precio pack", render: (r) => `S/ ${Number(r.price ?? 0).toFixed(2)}` },
          {
            key: "active",
            label: "Estado",
            render: (r) => (r.active === false ? <span className="text-[var(--muted)]">Inactivo</span> : <span className="text-green-700">Activo</span>),
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
        title={editId ? "Editar pack" : "Nuevo pack"}
        size="lg"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre del pack">
            <input className="ify-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Precio del pack (S/)">
            <input type="number" step="0.01" className="ify-input" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Descripción" className="sm:col-span-2">
            <input className="ify-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Agregar productos al pack">
            <div className="relative">
              <input
                className="ify-input"
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {results.length > 0 && (
                <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md shadow-lg">
                  {results.map((p) => (
                    <li key={String(p.id)}>
                      <button type="button" className="ify-autocomplete-item w-full text-left" onMouseDown={(e) => e.preventDefault()} onClick={() => addLine(p)}>
                        {String(p.description)} — S/ {Number(p.sale_unit_price ?? 0).toFixed(2)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>

          <table className="ify-table mt-2 text-sm">
            <thead><tr><th>Producto</th><th style={{ width: 100 }}>Cantidad</th><th /></tr></thead>
            <tbody>
              {lines.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[var(--muted)]">Sin productos agregados</td></tr>
              ) : (
                lines.map((l, i) => (
                  <tr key={l.item_id}>
                    <td>{l.description}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className="ify-input input-sm"
                        value={l.quantity}
                        onChange={(e) => setLines((prev) => prev.map((x, idx) => (idx === i ? { ...x, quantity: Number(e.target.value) || 1 } : x)))}
                      />
                    </td>
                    <td>
                      <button type="button" className="text-red-500" onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}>
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {lines.length > 0 && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Define el precio del pack manualmente arriba — puede ser distinto a la suma de precios individuales.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
