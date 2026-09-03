"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { RowActions } from "@/components/ui/RowActions";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { ItemEditModal } from "@/components/items/ItemEditModal";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";
import { rowToItemForm } from "@/components/items/item-form-types";
import { api } from "@/lib/api/client";

const PAGE_SIZE = 20;

export function ItemsList() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editInitial, setEditInitial] = useState<ReturnType<typeof rowToItemForm>>();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ id: number; description: string; stock: number } | null>(null);

  const load = useCallback(async (value = "", p = 1) => {
    setLoading(true);
    try {
      const res = value
        ? await api.items.search(value, 50)
        : await api.items.records({ page: p, limit: PAGE_SIZE });
      setRows(res.data ?? []);
      const meta = res.meta as { total?: number } | undefined;
      setTotal(meta?.total ?? res.data?.length ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditId(null);
    setEditInitial(undefined);
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.local_id ?? r.id));
    setEditInitial(rowToItemForm(r));
    setModalOpen(true);
  };

  useEffect(() => {
    const editParam = searchParams.get("edit");
    if (!editParam || rows.length === 0) return;
    const row = rows.find((r) => String(r.id) === editParam || String(r.local_id) === editParam);
    if (row) openEdit(row);
  }, [searchParams, rows]);

  const handleDelete = async (r: Record<string, unknown>) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      const res = (await api.items.delete(Number(r.local_id ?? r.id))) as {
        soft_deleted?: boolean;
        message?: string;
      };
      if (res.soft_deleted) alert(res.message);
      load(search, page);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se puede eliminar");
    }
  };

  const reactivate = async (r: Record<string, unknown>) => {
    try {
      await api.items.update(Number(r.local_id ?? r.id), { active: true });
      load(search, page);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo reactivar");
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="ify-page">
      <PageHeader
        title="Productos"
        subtitle={`Catálogo — ${total} registros`}
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo producto
          </button>
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onSearch={() => load(search, 1)}
        placeholder="Buscar producto..."
        exportFilename="productos.csv"
        exportTitle="Productos"
        exportRows={rows}
        exportColumns={[
          { key: "internal_id", label: "Código" },
          { key: "description", label: "Nombre" },
          { key: "stock", label: "Stock" },
          { key: "sale_unit_price", label: "Precio venta" },
          { key: "purchase_price", label: "Precio compra" },
        ]}
      />
      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "row_num", label: "#", render: (_r, idx) => (page - 1) * PAGE_SIZE + idx + 1 },
          { key: "internal_id", label: "Cód. Interno" },
          { key: "unit_type_id", label: "Unidad" },
          {
            key: "description",
            label: "Nombre",
            render: (r) => (
              <div className="flex items-center gap-2">
                {r.image_url_small ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={String(r.image_url_small)} alt="" className="h-8 w-8 rounded object-cover" />
                ) : null}
                <span>{String(r.description || r.name)}</span>
                {r.active === false && (
                  <span className="rounded bg-[var(--muted-light)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]" title="Desactivado — ya no aparece al vender">
                    Inactivo
                  </span>
                )}
              </div>
            ),
          },
          { key: "stock", label: "Stock", render: (r) => Number(r.stock ?? 0).toFixed(0) },
          {
            key: "sale_unit_price",
            label: "P.Unitario (Venta)",
            render: (r) => `S/ ${Number(r.sale_unit_price ?? 0).toFixed(2)}`,
          },
          {
            key: "purchase_price",
            label: "P.Unitario (Compra)",
            render: (r) => `S/ ${Number(r.purchase_price ?? 0).toFixed(2)}`,
          },
          {
            key: "has_igv_description",
            label: "Afectación IGV",
            render: (r) => {
              const code = String(r.sale_affectation_igv_type_id ?? "10");
              const label =
                code === "10" ? "Gravado" : code === "20" ? "Exonerado" : code === "30" ? "Inafecto" : code === "40" ? "Exportación" : String(r.has_igv_description ?? "");
              const cls = code === "10" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700";
              return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{label}</span>;
            },
          },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  className="ify-btn-outline px-2 py-1 text-[10px]"
                  onClick={() => {
                    setAdjustItem({
                      id: Number(r.local_id ?? r.id),
                      description: String(r.description ?? r.name),
                      stock: Number(r.stock ?? 0),
                    });
                    setAdjustOpen(true);
                  }}
                >
                  Ajuste
                </button>
                {r.active === false && (
                  <button
                    type="button"
                    className="ify-btn-outline px-2 py-1 text-[10px] text-green-700"
                    onClick={() => reactivate(r)}
                  >
                    Reactivar
                  </button>
                )}
                <RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />
              </div>
            ),
          },
        ]}
      />
      {!search && total > PAGE_SIZE ? (
        <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            Página {page} de {lastPage} — Total {total}
          </span>
          <div className="flex gap-2">
            <button type="button" className="ify-btn-outline" disabled={page <= 1} onClick={() => load("", page - 1)}>
              Anterior
            </button>
            <button type="button" className="ify-btn-outline" disabled={page >= lastPage} onClick={() => load("", page + 1)}>
              Siguiente
            </button>
          </div>
        </div>
      ) : null}

      <ItemEditModal
        open={modalOpen}
        editId={editId}
        initial={editInitial}
        onClose={() => setModalOpen(false)}
        onSaved={() => load(search, page)}
      />

      <StockAdjustModal
        open={adjustOpen}
        item={adjustItem}
        onClose={() => setAdjustOpen(false)}
        onSaved={() => load(search, page)}
      />
    </div>
  );
}
