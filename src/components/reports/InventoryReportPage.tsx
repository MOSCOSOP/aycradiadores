"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { PageHeader } from "@/components/ui/Modal";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";
import { api } from "@/lib/api/client";
import { downloadCsv } from "@/lib/download-csv";

type ReportRow = Record<string, unknown>;

function fmt(n: unknown) {
  return Number(n ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InventoryReportPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBestsellers, setSortBestsellers] = useState(false);
  const [currency, setCurrency] = useState("PEN");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ id: number; description: string; stock: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.reports
      .fetch("reports/inventory")
      .then((r) => setRows(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        [r.name, r.description, r.internal_id, r.barcode, r.category, r.brand]
          .some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (stockFilter === "with") list = list.filter((r) => Number(r.stock) > 0);
    if (stockFilter === "without") list = list.filter((r) => Number(r.stock) <= 0);
    if (stockFilter === "low") list = list.filter((r) => Number(r.stock_min) > 0 && Number(r.stock) <= Number(r.stock_min));
    if (sortBestsellers) list.sort((a, b) => Number(b.products_sold ?? 0) - Number(a.products_sold ?? 0));
    else list.sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
    return list;
  }, [rows, search, stockFilter, sortBestsellers]);

  const exportColumns = [
    { key: "name", label: "Nombre" },
    { key: "category", label: "Categoría" },
    { key: "stock_min", label: "Stock mínimo" },
    { key: "stock", label: "Stock actual" },
    { key: "products_sold", label: "Productos vendidos" },
    { key: "sale_unit_price", label: "Precio venta" },
    { key: "purchase_price", label: "Costo" },
    { key: "profit", label: "Ganancia" },
    { key: "total_profit", label: "Ganancia total" },
    { key: "brand", label: "Marca" },
    { key: "establishment", label: "Establecimiento" },
    { key: "barcode", label: "Cód. barras" },
  ];

  const openAdjust = (r: ReportRow) => {
    setAdjustItem({
      id: Number(r.id),
      description: String(r.name ?? r.description ?? ""),
      stock: Number(r.stock ?? 0),
    });
    setAdjustOpen(true);
  };

  const remove = async (r: ReportRow) => {
    if (!confirm(`¿Poner stock en 0 para «${r.name}»?`)) return;
    await api.inventory.adjust({
      item_id: Number(r.id),
      real_stock: 0,
      modify_kardex: true,
      reference: "AJUSTE-REPORTE",
    });
    load();
  };

  const sym = currency === "USD" ? "$" : "S/";

  return (
    <div className="ify-page">
      <PageHeader
        title="Reporte inventario"
        subtitle={`${filtered.length} productos · stock unificado en todo el sistema`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ify-btn-outline text-xs" onClick={() => downloadCsv("reporte_inventario.csv", filtered)}>
              Exportar Excel
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => window.print()}>
              Exportar PDF
            </button>
            <button type="button" className="ify-btn-primary text-xs">Reportes</button>
          </div>
        }
      />

      <div className="ify-card mb-3 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-[var(--muted)]">Por stock</span>
            <select className="ify-select text-xs" value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="with">Con stock</option>
              <option value="without">Sin stock</option>
              <option value="low">Bajo mínimo</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs pb-1">
            <input type="checkbox" checked={sortBestsellers} onChange={(e) => setSortBestsellers(e.target.checked)} />
            Ordenar por más vendidos
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-semibold text-[var(--muted)]">Moneda</span>
            <select className="ify-select text-xs" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </label>
        </div>
      </div>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto, código, marca..."
        exportFilename="reporte_inventario.csv"
        exportTitle="Reporte inventario"
        exportRows={filtered}
        exportColumns={exportColumns}
      />

      <DataTable
        loading={loading}
        rows={filtered}
        wide
        stickyLastColumn
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          { key: "name", label: "Nombre", render: (r) => <span className="text-xs">{String(r.name ?? "")}</span> },
          { key: "category", label: "Categoría", render: (r) => String(r.category || "—") },
          { key: "stock_min", label: "Stock mínimo", render: (r) => fmt(r.stock_min) },
          {
            key: "stock",
            label: "Stock actual",
            render: (r) => (
              <span className={Number(r.stock_min) > 0 && Number(r.stock) <= Number(r.stock_min) ? "font-semibold text-red-600" : ""}>
                {Number(r.stock ?? 0)}
              </span>
            ),
          },
          { key: "products_sold", label: "Productos vendidos", render: (r) => Number(r.products_sold ?? 0) },
          { key: "sale_unit_price", label: "Precio de venta", render: (r) => `${sym} ${fmt(r.sale_unit_price)}` },
          { key: "purchase_price", label: "Costo", render: (r) => `${sym} ${fmt(r.purchase_price)}` },
          { key: "profit", label: "Ganancia", render: (r) => `${sym} ${fmt(r.profit)}` },
          { key: "total_profit", label: "Ganancia total", render: (r) => `${sym} ${fmt(r.total_profit)}` },
          { key: "brand", label: "Marca", render: (r) => String(r.brand || "—") },
          { key: "expiration_date", label: "F. vencimiento", render: (r) => String(r.expiration_date || "—") },
          { key: "establishment", label: "Establecimiento", render: (r) => String(r.establishment || "Oficina Principal") },
          { key: "barcode", label: "Cód. Barras", render: (r) => String(r.barcode || r.internal_id || "—") },
          {
            key: "actions",
            label: "Acciones",
            className: "ify-table-col-actions",
            render: (r) => (
              <RowActions
                showLabels
                onEdit={() => openAdjust(r)}
                onDelete={() => remove(r)}
              />
            ),
          },
        ]}
      />

      <StockAdjustModal
        open={adjustOpen}
        item={adjustItem}
        onClose={() => setAdjustOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
