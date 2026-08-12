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

type InventoryMarginReportPageProps = {
  title?: string;
  reportPath?: string;
  showSold?: boolean;
};

export function InventoryMarginReportPage({
  title = "Inventario - Margen de ganancia",
  reportPath = "reports/inventory-margin",
  showSold = true,
}: InventoryMarginReportPageProps) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ id: number; description: string; stock: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.reports
      .fetch(reportPath)
      .then((r) => setRows(r.data ?? []))
      .finally(() => setLoading(false));
  }, [reportPath]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      [r.description, r.internal_id, r.category].some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const openAdjust = (r: ReportRow) => {
    setAdjustItem({
      id: Number(r.id),
      description: String(r.description ?? ""),
      stock: Number(r.stock ?? 0),
    });
    setAdjustOpen(true);
  };

  const remove = async (r: ReportRow) => {
    if (!confirm(`¿Poner stock en 0 para «${r.description}»?`)) return;
    await api.inventory.adjust({
      item_id: Number(r.id),
      real_stock: 0,
      modify_kardex: true,
      reference: "AJUSTE-MARGEN",
    });
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        subtitle={`${filtered.length} productos`}
        actions={
          <button type="button" className="ify-btn-outline text-xs" onClick={() => downloadCsv(`${reportPath.replace(/\//g, "-")}.csv`, filtered)}>
            Exportar Excel
          </button>
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto o código..."
        exportFilename={`${reportPath.replace(/\//g, "-")}.csv`}
        exportTitle={title}
        exportRows={filtered}
        exportColumns={[
          { key: "internal_id", label: "Código" },
          { key: "description", label: "Producto" },
          { key: "category", label: "Categoría" },
          { key: "stock", label: "Stock" },
          { key: "sale_unit_price", label: "P. Venta" },
          { key: "purchase_price", label: "P. Compra" },
          { key: "margin", label: "Margen" },
        ]}
      />
      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: "internal_id", label: "Código" },
          { key: "description", label: "Producto" },
          { key: "category", label: "Categoría" },
          { key: "stock", label: "Stock" },
          { key: "stock_min", label: "Stock mín." },
          { key: "sale_unit_price", label: "P. Venta", render: (r) => `S/ ${fmt(r.sale_unit_price)}` },
          { key: "purchase_price", label: "P. Compra", render: (r) => `S/ ${fmt(r.purchase_price)}` },
          { key: "margin", label: "Margen", render: (r) => `S/ ${fmt(r.margin)}` },
          ...(showSold ? [{ key: "products_sold", label: "Vendidos", render: (r: ReportRow) => Number(r.products_sold ?? 0) }] : []),
          { key: "total_profit", label: "Ganancia total", render: (r) => `S/ ${fmt(r.total_profit)}` },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onEdit={() => openAdjust(r)} onDelete={() => remove(r)} />,
          },
        ]}
      />
      <StockAdjustModal open={adjustOpen} item={adjustItem} onClose={() => setAdjustOpen(false)} onSaved={load} />
    </div>
  );
}
