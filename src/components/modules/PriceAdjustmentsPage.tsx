"use client";

import { useEffect, useState } from "react";
import { PageHeader, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { api } from "@/lib/api/client";
import { mergeCategoriesList } from "@/lib/default-categories";

type FilterType = "all" | "category" | "brand" | "line";

/** Herramienta real de ajuste masivo de precios (no solo un catálogo) — aplica un % a todos
 * los productos o a los de una categoría/marca/línea, y deja historial de lo aplicado.
 * Reemplaza /price-adjustments. */
export function PriceAdjustmentsPage() {
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: number; name: string }[]>([]);
  const [lines, setLines] = useState<{ id: number; name: string }[]>([]);

  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterId, setFilterId] = useState("");
  const [percent, setPercent] = useState(0);
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  const loadHistory = () => {
    setLoading(true);
    api.priceAdjustments.records().then((r) => setHistory(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
    api.categories.records().then((r) => setCategories(mergeCategoriesList((r.data ?? []) as { id: number; name: string }[])));
    api.brands.records().then((r) => setBrands((r.data ?? []) as { id: number; name: string }[]));
    api.lines.records().then((r) => setLines((r.data ?? []) as { id: number; name: string }[]));
  }, []);

  useEffect(() => {
    setPreview(null);
  }, [filterType, filterId]);

  const currentOptions = filterType === "category" ? categories : filterType === "brand" ? brands : filterType === "line" ? lines : [];
  const filterLabel = () => {
    if (filterType === "all") return "Todos los productos";
    const opt = currentOptions.find((o) => String(o.id) === filterId);
    return opt ? `${filterType === "category" ? "Categoría" : filterType === "brand" ? "Marca" : "Línea"}: ${opt.name}` : "";
  };

  const doPreview = async () => {
    const res = await api.priceAdjustments.preview({ filter_type: filterType, filter_id: filterId || undefined });
    setPreview(res.count);
  };

  const apply = async () => {
    if (!percent) {
      alert("Ingresa el porcentaje (usa negativo para rebajar precios)");
      return;
    }
    if (filterType !== "all" && !filterId) {
      alert("Elige una opción del filtro");
      return;
    }
    if (preview === null) await doPreview();
    if (!confirm(`¿Aplicar ${percent > 0 ? "+" : ""}${percent}% a ${preview ?? "?"} producto(s)? Esta acción cambia precios reales.`)) return;
    setApplying(true);
    try {
      const res = await api.priceAdjustments.apply({
        filter_type: filterType,
        filter_id: filterId || undefined,
        filter_label: filterLabel(),
        percent,
        description: description || undefined,
      });
      alert(`Listo — se actualizó el precio de ${res.items_affected} producto(s).`);
      setPercent(0);
      setDescription("");
      setPreview(null);
      loadHistory();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo aplicar el ajuste");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Ajustes de precio"
        subtitle="Sube o baja precios de venta en bloque, por categoría, marca, línea o a todo el catálogo"
      />

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Aplicar a">
            <select className="ify-select" value={filterType} onChange={(e) => { setFilterType(e.target.value as FilterType); setFilterId(""); }}>
              <option value="all">Todos los productos</option>
              <option value="category">Una categoría</option>
              <option value="brand">Una marca</option>
              <option value="line">Una línea</option>
            </select>
          </Field>
          {filterType !== "all" && (
            <Field label="Elige cuál">
              <select className="ify-select" value={filterId} onChange={(e) => setFilterId(e.target.value)}>
                <option value="">Selecciona...</option>
                {currentOptions.map((o) => <option key={o.id} value={String(o.id)}>{o.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Porcentaje (+ sube, - baja)">
            <input type="number" step="0.1" className="ify-input" value={percent} onChange={(e) => setPercent(Number(e.target.value) || 0)} placeholder="Ej. 10 o -5" />
          </Field>
          <Field label="Descripción (opcional)">
            <input className="ify-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. Reajuste por tipo de cambio" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" className="ify-btn-outline text-sm" onClick={doPreview}>
            <i className="bi bi-eye" /> Ver cuántos productos afecta
          </button>
          {preview !== null && (
            <span className="text-sm text-[var(--muted)]">
              Afectaría a <strong className="text-[var(--primary)]">{preview}</strong> producto(s)
            </span>
          )}
          <button type="button" className="ify-btn-primary ml-auto text-sm" onClick={apply} disabled={applying}>
            {applying ? "Aplicando..." : "Aplicar ajuste"}
          </button>
        </div>
      </div>

      <h2 className="mb-2 text-sm font-bold">Historial de ajustes aplicados</h2>
      <DataTable
        loading={loading}
        rows={history}
        emptyMessage="Sin ajustes aplicados todavía"
        columns={[
          { key: "date", label: "Fecha" },
          { key: "description", label: "Descripción" },
          { key: "filter_label", label: "Aplicado a" },
          { key: "percent", label: "Porcentaje", render: (r) => `${Number(r.percent) > 0 ? "+" : ""}${r.percent}%` },
          { key: "items_affected", label: "Productos afectados" },
        ]}
      />
    </div>
  );
}
