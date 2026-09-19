"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { SelectWithAdd } from "@/components/ui/SelectWithAdd";
import { ProductImageField } from "@/components/items/ProductImageField";
import { api } from "@/lib/api/client";
import { mergeCategoriesList } from "@/lib/default-categories";
import { profitPercentFromPrices, saleFromProfitPercent } from "@/lib/items/compress-product-image";
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
  onSaved: (item?: Record<string, unknown>) => void;
};

export function ItemEditModal({ open, editId, initial, onClose, onSaved }: ItemEditModalProps) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<ItemFormData>({ ...emptyItemForm, ...initial });
  const [categories, setCategories] = useState<Record<string, unknown>[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [lines, setLines] = useState<{ id: number; name: string }[]>([]);
  const [establishments, setEstablishments] = useState<Record<string, unknown>[]>([]);
  const [personTypes, setPersonTypes] = useState<Record<string, unknown>[]>([]);
  const [personTypeSearch, setPersonTypeSearch] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyItemForm, ...initial });
    setTab(0);
    api.categories.records().then((r) => setCategories(mergeCategoriesList((r.data ?? []) as { id: number; name: string }[])));
    api.establishments.records().then((r) => setEstablishments(r.data ?? []));
    api.brands.records().then((r) => setBrands((r.data ?? []) as { id: number; name: string }[]));
    api.lines.records().then((r) => setLines((r.data ?? []) as { id: number; name: string }[]));
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

  const patch = (partial: Partial<ItemFormData>) => setForm((prev) => ({ ...prev, ...partial }));

  const setPurchasePrice = (value: string) => {
    const purchase = Number(value) || 0;
    const percent = Number(form.profit_percent) || 0;
    if (purchase > 0 && percent > 0) {
      patch({ purchase_price: value, sale_unit_price: String(saleFromProfitPercent(purchase, percent)) });
      return;
    }
    const sale = Number(form.sale_unit_price) || 0;
    patch({ purchase_price: value, profit_percent: purchase || sale ? String(profitPercentFromPrices(purchase, sale)) : "" });
  };

  const setProfitPercent = (value: string) => {
    const purchase = Number(form.purchase_price) || 0;
    const percent = Number(value) || 0;
    patch({
      profit_percent: value,
      sale_unit_price: purchase > 0 ? String(saleFromProfitPercent(purchase, percent)) : form.sale_unit_price,
    });
  };

  const setSalePrice = (value: string) => {
    const purchase = Number(form.purchase_price) || 0;
    const sale = Number(value) || 0;
    patch({
      sale_unit_price: value,
      profit_percent: purchase || sale ? String(profitPercentFromPrices(purchase, sale)) : "",
    });
  };

  const purchase = Number(form.purchase_price) || 0;
  const sale = Number(form.sale_unit_price) || 0;
  const profitAmount = sale - purchase;
  const profitLabel = Number(form.profit_percent || 0);

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
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        line_id: form.line_id ? Number(form.line_id) : null,
        has_igv: form.sale_affectation_type_id === "10",
        image_url: form.image_base64 ? undefined : form.image_url || null,
        image_base64: form.image_base64 || undefined,
        image_filename: form.image_filename || undefined,
      };
      if (editId) {
        await api.items.update(editId, payload);
        onSaved();
      } else {
        const res = (await api.items.create(payload)) as { data?: Record<string, unknown> };
        const raw = res.data ?? {};
        onSaved({
          id: raw.id,
          local_id: raw.id,
          description: raw.description ?? form.description,
          unit_type_id: raw.unitTypeId ?? form.unit_type_id,
          sale_unit_price: raw.saleUnitPrice ?? Number(form.sale_unit_price),
          stock: raw.stock ?? Number(form.stock),
          has_igv: raw.hasIgv ?? form.sale_affectation_type_id === "10",
          sale_affectation_igv_type_id: raw.saleAffectationTypeId ?? form.sale_affectation_type_id,
          image_url: raw.imageUrl ?? form.image_url,
        });
      }
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
          <ProductImageField
            imageUrl={form.image_url}
            onChange={({ imageUrl, imageBase64, imageFilename }) =>
              patch({ image_url: imageUrl, image_base64: imageBase64, image_filename: imageFilename })
            }
          />
          <Field label="Nombre *" className="sm:col-span-2">
            <input className="ify-input" value={form.description} onChange={(e) => patch({ description: e.target.value })} />
          </Field>
          <Field label="Nombre secundario">
            <input className="ify-input" value={form.secondary_name} onChange={(e) => patch({ secondary_name: e.target.value })} />
          </Field>
          <Field label="Modelo">
            <input className="ify-input" value={form.model} onChange={(e) => patch({ model: e.target.value })} />
          </Field>
          <Field label="Descripción [+ Descripción detallada]" className="sm:col-span-2">
            <textarea className="ify-input min-h-[70px]" value={form.description_detail} onChange={(e) => patch({ description_detail: e.target.value })} />
          </Field>
          <Field label="Unidad">
            <select className="ify-select" value={form.unit_type_id} onChange={(e) => patch({ unit_type_id: e.target.value })}>
              {UNIT_TYPES.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
          <Field label="Moneda">
            <select className="ify-select" value={form.currency_type_id} onChange={(e) => patch({ currency_type_id: e.target.value })}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </Field>
          <Field label="Precio Unitario *">
            <input type="number" step="0.01" min="0" className="ify-input" value={form.sale_unit_price} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
          <Field label="Tipo de afectación">
            <select className="ify-select" value={form.sale_affectation_type_id} onChange={(e) => patch({ sale_affectation_type_id: e.target.value })}>
              {AFFECTATION_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </Field>
          <p className="sm:col-span-2 text-[11px] text-[var(--muted)]">
            Precio de compra y porcentaje de ganancia están en la pestaña <strong>Compra</strong>.
          </p>
          <Field label="Stock Mínimo">
            <input type="number" className="ify-input" value={form.stock_min} onChange={(e) => patch({ stock_min: e.target.value })} />
          </Field>
          <Field label="Stock actual">
            <input type="number" className="ify-input" value={form.stock} onChange={(e) => patch({ stock: e.target.value })} />
          </Field>
          <Field label="Código de barra">
            <input className="ify-input" value={form.barcode} onChange={(e) => patch({ barcode: e.target.value })} />
          </Field>
          <Field label="Código Interno">
            <input className="ify-input" value={form.internal_id} onChange={(e) => patch({ internal_id: e.target.value })} />
          </Field>
          <Field label="Marca">
            <SelectWithAdd
              value={form.brand_id}
              options={brands}
              placeholder="Marca"
              onChange={(id, name) => patch({ brand_id: id, brand: name })}
              onCreate={async (name) => {
                try {
                  const res = (await api.brands.create({ name })) as { data?: { id: number; name: string } };
                  if (res.data) {
                    setBrands((prev) => [...prev, res.data as { id: number; name: string }]);
                    return res.data;
                  }
                  return null;
                } catch (e) {
                  alert(e instanceof Error ? e.message : "No se pudo crear la marca");
                  return null;
                }
              }}
            />
          </Field>
          <Field label="Categoría">
            <select className="ify-select" value={form.category_id} onChange={(e) => patch({ category_id: e.target.value })}>
              <option value="">Sin categoría</option>
              {categories.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
            </select>
          </Field>
          <Field label="Ubicación">
            <input className="ify-input" placeholder="A1, B2, C3, etc." value={form.location} onChange={(e) => patch({ location: e.target.value })} />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" step="0.01" min="0" className="ify-input" placeholder="0.00" value={form.weight_kg} onChange={(e) => patch({ weight_kg: e.target.value })} />
          </Field>
          <Field label="Observaciones" className="sm:col-span-2">
            <textarea className="ify-input min-h-[64px]" placeholder="Notas internas del producto" value={form.observations} onChange={(e) => patch({ observations: e.target.value })} />
          </Field>
          <Field label="Hipervínculo" className="sm:col-span-2">
            <input className="ify-input" placeholder="https://www.producto.com/" value={form.hyperlink} onChange={(e) => patch({ hyperlink: e.target.value })} />
          </Field>
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
          <Field label="Línea de producto">
            <SelectWithAdd
              value={form.line_id}
              options={lines}
              placeholder="Línea"
              onChange={(id, name) => patch({ line_id: id, product_line: name })}
              onCreate={async (name) => {
                try {
                  const res = (await api.lines.create({ name })) as { data?: { id: number; name: string } };
                  if (res.data) {
                    setLines((prev) => [...prev, res.data as { id: number; name: string }]);
                    return res.data;
                  }
                  return null;
                } catch (e) {
                  alert(e instanceof Error ? e.message : "No se pudo crear la línea");
                  return null;
                }
              }}
            />
          </Field>
          <Field label="Especificaciones">
            <input className="ify-input" placeholder="Medidas, material, compatibilidad" value={form.specifications} onChange={(e) => patch({ specifications: e.target.value })} />
          </Field>
          <Field label="Código Sunat">
            <input className="ify-input" placeholder="Código Sunat" value={form.sunat_code} onChange={(e) => patch({ sunat_code: e.target.value })} />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" step="0.01" min="0" className="ify-input" value={form.weight_kg} onChange={(e) => patch({ weight_kg: e.target.value })} />
          </Field>
        </div>
      )}

      {tab === 4 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Costos y ganancia</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Ingrese el precio de compra y el % de ganancia. El precio de venta se calcula solo. También puede escribir el precio de venta y el porcentaje se ajusta.
            </p>
          </div>
          <Field label="Precio unitario (compra) *">
            <input type="number" step="0.01" min="0" className="ify-input" value={form.purchase_price} onChange={(e) => setPurchasePrice(e.target.value)} />
          </Field>
          <Field label="Porcentaje de ganancia (%)">
            <input type="number" step="0.01" className="ify-input" value={form.profit_percent} onChange={(e) => setProfitPercent(e.target.value)} />
          </Field>
          <Field label="Precio unitario (venta)">
            <input type="number" step="0.01" min="0" className="ify-input" value={form.sale_unit_price} onChange={(e) => setSalePrice(e.target.value)} />
          </Field>
          <Field label="Ganancia por unidad">
            <input className="ify-input" readOnly value={`S/ ${profitAmount.toFixed(2)}  ·  ${profitLabel.toFixed(2)}%`} />
          </Field>
          <Field label="Moneda compra">
            <select className="ify-select" value={form.currency_type_id} onChange={(e) => patch({ currency_type_id: e.target.value })}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={form.has_igv} onChange={(e) => patch({ has_igv: e.target.checked })} />
            ¿La compra tiene el 18% de IGV?
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
