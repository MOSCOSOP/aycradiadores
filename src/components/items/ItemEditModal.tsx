"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import {
  AFFECTATION_TYPES,
  UNIT_TYPES,
  emptyItemForm,
  type ItemFormData,
} from "@/components/items/item-form-types";

const TABS = ["General", "Establecimientos", "Presentaciones", "Atributos", "Compra", "Tipo de clientes"] as const;

type ItemEditModalProps = {
  open: boolean;
  editId: number | null;
  initial?: Partial<ItemFormData>;
  onClose: () => void;
  onSaved: () => void;
};

export function ItemEditModal({ open, editId, initial, onClose, onSaved }: ItemEditModalProps) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<ItemFormData>({ ...emptyItemForm, ...initial });
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [establishments, setEstablishments] = useState<Record<string, unknown>[]>([]);
  const [personTypes, setPersonTypes] = useState<Record<string, unknown>[]>([]);
  const [personTypeSearch, setPersonTypeSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyItemForm, ...initial });
    setTab(0);
    api.categories.records().then((r) => setCategories(r.data ?? []));
    api.establishments.records().then((r) => setEstablishments(r.data ?? []));
    fetch("/api/local/person-types/records")
      .then((r) => r.json())
      .then((d) => setPersonTypes(d.data ?? []))
      .catch(() =>
        setPersonTypes([
          { id: 1, description: "Interno", created_at: "2023-06-22 10:58:49" },
          { id: 2, description: "Distribuidor", created_at: "2023-06-22 10:58:49" },
        ])
      );
  }, [open, initial]);

  const handleSave = async () => {
    if (!form.description.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        sale_unit_price: Number(form.sale_unit_price || 0),
        purchase_price: Number(form.purchase_price || 0),
        stock: Number(form.stock || 0),
        stock_min: Number(form.stock_min || 0),
        category_id: form.category_id ? Number(form.category_id) : null,
      };
      if (editId) await api.items.update(editId, payload);
      else await api.items.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editId ? "Editar producto" : "Nuevo producto"}
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`px-3 py-2 text-xs font-semibold ${tab === i ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre *" className="sm:col-span-2">
            <input className="ify-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Nombre secundario">
            <input className="ify-input" value={form.secondary_name} onChange={(e) => setForm({ ...form, secondary_name: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <input className="ify-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </Field>
          <Field label="Descripción [+ Descripción detallada]" className="sm:col-span-2">
            <textarea className="ify-input min-h-[70px]" value={form.description_detail} onChange={(e) => setForm({ ...form, description_detail: e.target.value })} />
          </Field>
          <Field label="Unidad">
            <select className="ify-select" value={form.unit_type_id} onChange={(e) => setForm({ ...form, unit_type_id: e.target.value })}>
              {UNIT_TYPES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Moneda">
            <select className="ify-select" value={form.currency_type_id} onChange={(e) => setForm({ ...form, currency_type_id: e.target.value })}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </Field>
          <Field label="Precio Unitario *">
            <input type="number" step="0.01" className="ify-input" value={form.sale_unit_price} onChange={(e) => setForm({ ...form, sale_unit_price: e.target.value })} />
          </Field>
          <Field label="Tipo de afectación">
            <select className="ify-select" value={form.sale_affectation_type_id} onChange={(e) => setForm({ ...form, sale_affectation_type_id: e.target.value })}>
              {AFFECTATION_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </Field>
          <Field label="Stock Mínimo">
            <input type="number" className="ify-input" value={form.stock_min} onChange={(e) => setForm({ ...form, stock_min: e.target.value })} />
          </Field>
          <Field label="Stock actual">
            <input type="number" className="ify-input" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </Field>
          <Field label="Código de barra">
            <input className="ify-input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </Field>
          <Field label="Código Interno">
            <input className="ify-input" value={form.internal_id} onChange={(e) => setForm({ ...form, internal_id: e.target.value })} />
          </Field>
          <Field label="Marca">
            <input className="ify-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </Field>
          <Field label="Categoría">
            <select className="ify-select" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
            </select>
          </Field>
          <Field label="Ubicación">
            <input className="ify-input" placeholder="A1, B2, C3, etc." value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Hipervínculo" className="sm:col-span-2">
            <input className="ify-input" placeholder="https://www.producto.com/" value={form.hyperlink} onChange={(e) => setForm({ ...form, hyperlink: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.has_igv} onChange={(e) => setForm({ ...form, has_igv: e.target.checked })} />
            ¿Tiene IGV en venta?
          </label>
        </div>
      )}

      {tab === 1 && (
        <div className="overflow-x-auto">
          <table className="ify-table text-xs">
            <thead><tr><th>Establecimiento</th><th>Código</th><th>Stock</th><th>Activo</th></tr></thead>
            <tbody>
              {establishments.map((e) => (
                <tr key={String(e.id)}>
                  <td>{String(e.description)}</td>
                  <td>{String(e.code)}</td>
                  <td>{form.stock || "0"}</td>
                  <td><input type="checkbox" defaultChecked /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 2 && (
        <p className="text-sm text-[var(--muted)]">
          Presentaciones del producto (unidad de venta alternativa). Disponible en configuración avanzada.
        </p>
      )}

      {tab === 3 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Línea de producto"><input className="ify-input" placeholder="Línea" /></Field>
          <Field label="Especificaciones"><input className="ify-input" placeholder="Especificaciones" /></Field>
          <Field label="Código Sunat"><input className="ify-input" placeholder="Código Sunat" /></Field>
          <Field label="Género"><input className="ify-input" placeholder="Género" /></Field>
        </div>
      )}

      {tab === 4 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Precio Unitario (Compra)">
            <input type="number" step="0.01" className="ify-input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
          </Field>
          <Field label="Moneda compra">
            <select className="ify-select" value={form.currency_type_id} onChange={(e) => setForm({ ...form, currency_type_id: e.target.value })}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" defaultChecked />
            ¿La compra tiene el 10% de IGV?
          </label>
        </div>
      )}

      {tab === 5 && (
        <div>
          <div className="mb-3 flex gap-2">
            <input className="ify-input flex-1" placeholder="Buscar" value={personTypeSearch} onChange={(e) => setPersonTypeSearch(e.target.value)} />
            <button type="button" className="ify-btn-outline text-xs" onClick={() => setPersonTypeSearch(personTypeSearch.trim())}>Buscar</button>
          </div>
          <table className="ify-table text-xs">
            <thead><tr><th>#</th><th>Descripción</th><th>Fecha registro</th><th>Acciones</th></tr></thead>
            <tbody>
              {personTypes.filter((pt) => !personTypeSearch || String(pt.description).toLowerCase().includes(personTypeSearch.toLowerCase())).map((pt, idx) => (
                <tr key={String(pt.id)}>
                  <td>{idx + 1}</td>
                  <td>{String(pt.description)}</td>
                  <td>{String(pt.created_at || "—")}</td>
                  <td><button type="button" className="ify-btn-ghost px-2" title="Editar tipo cliente"><i className="bi bi-pencil" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
