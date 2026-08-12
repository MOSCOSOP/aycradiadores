"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { UserModal } from "@/components/users/UserModal";
import { parseInventoryExcel } from "@/lib/inventory-import";
import { downloadCsv } from "@/lib/download-csv";
import { api } from "@/lib/api/client";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { LineItemsEditor, mapApiItems, serializeLineItems } from "@/components/ui/LineItemsEditor";
import { RecordsCrudList } from "@/components/modules/RecordsCrudList";
import { StockAdjustModal } from "@/components/inventory/StockAdjustModal";

function StockTableActions({
  row,
  onAdjust,
}: {
  row: Record<string, unknown>;
  onAdjust: (row: Record<string, unknown>, presetReal?: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        className="ify-btn-outline px-2 py-1 text-[10px] opacity-60"
        onClick={() => onAdjust(row, 0)}
      >
        Remover
      </button>
      <button
        type="button"
        className="ify-btn-outline px-2 py-1 text-[10px]"
        onClick={() => onAdjust(row)}
      >
        <i className="bi bi-info-circle text-warning" /> Ajuste
      </button>
    </div>
  );
}

export function SaleNotesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    plate: "",
    purchase_order: "",
    payment_status: "Pagado",
    state: "Registrado",
    currency_type_id: "PEN",
    modified_price: "NO",
    customer_name: "",
  });
  const [editItems, setEditItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = (value = "") => {
    setLoading(true);
    api.saleNotes
      .records()
      .then((r) => {
        let data = r.data ?? [];
        if (value) {
          const q = value.toLowerCase();
          data = data.filter(
            (n) =>
              String(n.number ?? "").toLowerCase().includes(q) ||
              String(n.customer_name ?? "").toLowerCase().includes(q)
          );
        }
        setRows(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = async (id: number) => {
    setEditId(id);
    setEditOpen(true);
    try {
      const res = await api.saleNotes.get(id);
      const d = res.data ?? {};
      setEditForm({
        plate: String(d.plate ?? ""),
        purchase_order: String(d.purchase_order ?? ""),
        payment_status: String(d.payment_status ?? "Pagado"),
        state: String(d.state ?? "Registrado"),
        currency_type_id: String(d.currency_type_id ?? "PEN"),
        modified_price: String(d.modified_price ?? "NO"),
        customer_name: String(d.customer_name ?? ""),
      });
      const items = (d.items as Record<string, unknown>[]) ?? [];
      setEditItems(
        items.length
          ? items.map((it) => ({
              description: String(it.description ?? ""),
              quantity: String(it.quantity ?? 1),
              unit_price: String(it.unit_price ?? 0),
            }))
          : [{ description: "", quantity: "1", unit_price: "0" }]
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cargar la nota");
      setEditOpen(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.saleNotes.update(editId, {
        ...editForm,
        items: editItems.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
        })),
      });
      setEditOpen(false);
      load(search);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar la nota de venta ${number}?`)) return;
    try {
      await api.saleNotes.delete(id);
      load(search);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Notas de Venta"
        actions={
          <Link href="/sale-notes/create" className="ify-btn-primary">
            <i className="bi bi-plus-lg" /> Nueva nota
          </Link>
        }
      />
      <div className="ify-card mb-3 p-3">
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Filtros de búsqueda</p>
        <div className="flex gap-2">
          <input
            className="ify-input flex-1"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
          <button type="button" className="ify-btn-primary" onClick={() => load(search)}>
            Buscar
          </button>
        </div>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          {
            key: "date_of_issue",
            label: "Fecha Emisión",
            render: (r) => (
              <div className="text-xs whitespace-pre-line">
                {String(r.date_of_issue || r.date || "").split(" ").join("\n")}
              </div>
            ),
          },
          {
            key: "customer_name",
            label: "Cliente",
            render: (r) => (
              <div className="text-xs">
                {String(r.customer_name)}
                <br />
                <span className="text-[var(--muted)]">{String(r.customer_number)}</span>
              </div>
            ),
          },
          {
            key: "number",
            label: "Nota de Venta",
            render: (r) => (
              <Link href={`/sale-notes/${r.id}`} className="ify-link">
                {String(r.number)}
              </Link>
            ),
          },
          { key: "state_type_description", label: "Estado", render: (r) => String(r.state_type_description || r.state || "Registrado") },
          { key: "currency_type_id", label: "Moneda" },
          { key: "total", label: "Total", render: (r) => `${r.currency_type_id === "USD" ? "$" : "S/"} ${Number(r.total ?? 0).toFixed(2)}` },
          { key: "modified_price", label: "Precio modificado", render: (r) => String(r.modified_price || "NO") },
          { key: "payment_status", label: "Estado pago", render: (r) => String(r.payment_status || "—") },
          { key: "purchase_order", label: "Orden de compra", render: (r) => String(r.purchase_order || "—") },
          { key: "plate", label: "Placa", render: (r) => String(r.plate || "—") },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <RowActions
                onEdit={() => openEdit(Number(r.id))}
                onDelete={() => remove(Number(r.id), String(r.number ?? ""))}
              />
            ),
          },
        ]}
        emptyMessage="Sin notas de venta"
      />

      <Modal
        open={editOpen}
        title={`Editar nota de venta${editForm.customer_name ? ` — ${editForm.customer_name}` : ""}`}
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>
              Cancelar
            </button>
            <button type="button" className="ify-btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Placa">
            <input className="ify-input" value={editForm.plate} onChange={(e) => setEditForm({ ...editForm, plate: e.target.value })} />
          </Field>
          <Field label="Orden de compra">
            <input className="ify-input" value={editForm.purchase_order} onChange={(e) => setEditForm({ ...editForm, purchase_order: e.target.value })} />
          </Field>
          <Field label="Estado pago">
            <select className="ify-select" value={editForm.payment_status} onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}>
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Parcial">Parcial</option>
            </select>
          </Field>
          <Field label="Estado">
            <select className="ify-select" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}>
              <option value="Registrado">Registrado</option>
              <option value="Anulado">Anulado</option>
              <option value="Enviado">Enviado</option>
            </select>
          </Field>
          <Field label="Moneda">
            <select className="ify-select" value={editForm.currency_type_id} onChange={(e) => setEditForm({ ...editForm, currency_type_id: e.target.value })}>
              <option value="PEN">PEN — Soles</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </Field>
          <Field label="Precio modificado">
            <select className="ify-select" value={editForm.modified_price} onChange={(e) => setEditForm({ ...editForm, modified_price: e.target.value })}>
              <option value="NO">NO</option>
              <option value="SI">SI</option>
            </select>
          </Field>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Ítems</p>
          <div className="space-y-2">
            {editItems.map((it, idx) => (
              <div key={idx} className="grid gap-2 rounded border border-[var(--border)] p-2 sm:grid-cols-[1fr_80px_100px_32px]">
                <input
                  className="ify-input text-xs"
                  placeholder="Descripción"
                  value={it.description}
                  onChange={(e) => {
                    const next = [...editItems];
                    next[idx] = { ...next[idx], description: e.target.value };
                    setEditItems(next);
                  }}
                />
                <input
                  className="ify-input text-xs"
                  type="number"
                  placeholder="Cant."
                  value={it.quantity}
                  onChange={(e) => {
                    const next = [...editItems];
                    next[idx] = { ...next[idx], quantity: e.target.value };
                    setEditItems(next);
                  }}
                />
                <input
                  className="ify-input text-xs"
                  type="number"
                  placeholder="P. unit."
                  value={it.unit_price}
                  onChange={(e) => {
                    const next = [...editItems];
                    next[idx] = { ...next[idx], unit_price: e.target.value };
                    setEditItems(next);
                  }}
                />
                <button
                  type="button"
                  className="ify-btn-ghost text-red-600"
                  onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                  title="Quitar línea"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ify-btn-outline mt-2 text-xs"
            onClick={() => setEditItems([...editItems, { description: "", quantity: "1", unit_price: "0" }])}
          >
            <i className="bi bi-plus" /> Agregar ítem
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function QuotationsList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ state: "Pendiente", customer_name: "" });
  const [editItems, setEditItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.quotations.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (id: number) => {
    setEditId(id);
    setEditOpen(true);
    try {
      const res = await api.quotations.get(id);
      const d = res.data ?? {};
      setEditForm({ state: String(d.state ?? "Pendiente"), customer_name: String(d.customer_name ?? "") });
      setEditItems(mapApiItems(d.items as Record<string, unknown>[] | undefined));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cargar");
      setEditOpen(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.quotations.update(editId, { state: editForm.state, items: serializeLineItems(editItems) });
      setEditOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar cotización ${number}?`)) return;
    try {
      await api.quotations.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader title="Cotizaciones" actions={
        <Link href="/quotations/create" className="ify-btn-primary"><i className="bi bi-plus-lg" /> Nueva cotización</Link>
      } />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "number", label: "Número", render: (r) => <Link href={`/quotations/${r.id}`} className="ify-link">{String(r.number)}</Link> },
        { key: "customer_name", label: "Cliente" }, { key: "date", label: "Fecha" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total ?? 0).toFixed(2)}` },
        { key: "state", label: "Estado" },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => (
            <RowActions
              onEdit={() => openEdit(Number(r.id))}
              onDelete={() => remove(Number(r.id), String(r.number ?? ""))}
            />
          ),
        },
      ]} emptyMessage="Sin cotizaciones" />
      <Modal open={editOpen} title={`Editar cotización${editForm.customer_name ? ` — ${editForm.customer_name}` : ""}`} onClose={() => setEditOpen(false)}
        footer={<><button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button><button type="button" className="ify-btn-primary" onClick={saveEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button></>}>
        <Field label="Estado">
          <select className="ify-select" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}>
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobada">Aprobada</option>
            <option value="Rechazada">Rechazada</option>
            <option value="Anulada">Anulada</option>
          </select>
        </Field>
        <div className="mt-4"><LineItemsEditor items={editItems} onChange={setEditItems} /></div>
      </Modal>
    </div>
  );
}

export function PurchasesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = (value = "") => {
    setLoading(true);
    api.purchases
      .records()
      .then((r) => {
        let data = r.data ?? [];
        if (value) {
          const q = value.toLowerCase();
          data = data.filter(
            (p) =>
              String(p.number ?? "").toLowerCase().includes(q) ||
              String(p.supplier_name ?? "").toLowerCase().includes(q)
          );
        }
        setRows(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar esta compra?")) return;
    try {
      await api.purchases.delete(id);
      load(search);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se puede eliminar");
    }
  };

  const exportColumns = [
    { key: "number", label: "Número" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "date_of_issue", label: "Fecha" },
    { key: "total", label: "Total" },
    { key: "state_type_description", label: "Estado" },
  ];

  return (
    <div className="ify-page">
      <PageHeader
        title="Compras"
        actions={
          <Link href="/purchases/create" className="ify-btn-primary">
            <i className="bi bi-plus-lg" /> Nueva compra
          </Link>
        }
      />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        onSearch={() => load(search)}
        placeholder="Buscar número o proveedor..."
        exportFilename="compras.csv"
        exportTitle="Listado de compras"
        exportRows={rows}
        exportColumns={exportColumns}
      />
      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          { key: "date_of_issue", label: "F. Emisión", render: (r) => String(r.date_of_issue || r.date) },
          {
            key: "supplier_name",
            label: "Proveedor",
            render: (r) => (
              <div className="max-w-xs text-xs">
                {String(r.supplier_name)}
                <br />
                <span className="text-[var(--muted)]">{String(r.supplier_number)}</span>
              </div>
            ),
          },
          { key: "state_type_description", label: "Estado", render: (r) => String(r.state_type_description || r.state || "Registrado") },
          { key: "payment_status", label: "Estado de pago", render: (r) => String(r.payment_status || "—") },
          {
            key: "number",
            label: "Número",
            render: (r) => (
              <div className="text-xs">
                <Link href={`/purchases/${r.id}`} className="ify-link">
                  {String(r.number)}
                </Link>
                <br />
                <span className="text-[var(--muted)]">{String(r.document_type_description || "")}</span>
              </div>
            ),
          },
          { key: "currency_type_id", label: "Moneda" },
          { key: "total", label: "Total", render: (r) => `${r.currency_type_id === "USD" ? "$" : "S/"} ${Number(r.total ?? 0).toFixed(2)}` },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <RowActions
                onEdit={() => window.location.assign(`/purchases/${r.id}`)}
                onDelete={() => remove(Number(r.id))}
              />
            ),
          },
        ]}
        emptyMessage="Sin compras"
      />
    </div>
  );
}

export function InventoryList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ type: "in", quantity: "", reference: "", description: "" });
  const [importMsg, setImportMsg] = useState("");
  const [importing, setImporting] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ item_id: "", quantity: "", type: "in", reference: "" });

  const load = () => {
    setLoading(true);
    Promise.all([api.inventory.records(), api.inventory.stock()])
      .then(([mov, stock]) => { setRows(mov.data ?? []); setItems(stock.data ?? []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const adjust = async () => {
    if (!form.item_id || !form.quantity) {
      setAdjustMsg("Selecciona producto y cantidad");
      return;
    }
    setAdjusting(true);
    setAdjustMsg("");
    try {
      await api.inventory.adjust({
        item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        type: form.type,
        reference: form.reference,
      });
      setModalOpen(false);
      setForm({ item_id: "", quantity: "", type: "in", reference: "" });
      setAdjustMsg("Ajuste aplicado correctamente");
      load();
    } catch (e) {
      setAdjustMsg(e instanceof Error ? e.message : "Error al ajustar stock");
    } finally {
      setAdjusting(false);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportMsg("");
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseInventoryExcel(buffer);
      const res = await api.inventory.import(parsed);
      setImportMsg(`Importados ${res.updated} de ${res.total} productos.`);
      load();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Error al importar");
    } finally {
      setImporting(false);
    }
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditId(Number(row.id));
    setEditForm({
      type: String(row.type ?? "in"),
      quantity: String(row.quantity ?? row.stock ?? ""),
      reference: String(row.reference ?? ""),
      description: String(row.description ?? ""),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await api.inventory.updateMovement(editId, {
        type: editForm.type,
        quantity: Number(editForm.quantity),
        reference: editForm.reference,
        description: editForm.description,
      });
      setEditOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al editar movimiento");
    }
  };

  const removeMovement = async (id: number, label: string) => {
    if (!confirm(`¿Eliminar el registro «${label}»?`)) return;
    try {
      await api.inventory.deleteMovement(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(r.item ?? "").toLowerCase().includes(q) || String(r.internal_id ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="ify-page">
      <PageHeader title="Movimientos de inventario" subtitle="Kardex y stock por almacén" actions={
        <div className="flex flex-wrap gap-2">
          <label className="ify-btn-outline cursor-pointer text-xs">
            <i className="bi bi-file-earmark-excel" /> {importing ? "Importando..." : "Importar Excel"}
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={importing}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
          </label>
          <button type="button" className="ify-btn-primary text-xs" onClick={() => setModalOpen(true)}>Ajustar stock</button>
        </div>
      } />
      {importMsg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{importMsg}</div>}
      {adjustMsg && <div className={`mb-3 rounded border p-3 text-sm ${adjustMsg.includes("Error") || adjustMsg.includes("Selecciona") ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{adjustMsg}</div>}
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto o código..."
        exportFilename="movimientos_inventario.csv"
        exportTitle="Movimientos de inventario"
        exportRows={filtered}
        exportColumns={[
          { key: "date", label: "Fecha" },
          { key: "internal_id", label: "Código" },
          { key: "item", label: "Producto" },
          { key: "warehouse", label: "Almacén" },
          { key: "type", label: "Tipo" },
          { key: "quantity", label: "Cantidad" },
          { key: "reference", label: "Referencia" },
        ]}
      />
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "date", label: "Fecha" },
        { key: "internal_id", label: "Código" },
        { key: "item", label: "Producto" },
        { key: "warehouse", label: "Almacén" },
        { key: "stock", label: "Stock" },
        { key: "type", label: "Tipo" },
        { key: "quantity", label: "Cantidad" },
        { key: "reference", label: "Referencia" },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => (
            <RowActions
              onEdit={() => openEdit(r)}
              onDelete={() => removeMovement(Number(r.id), String(r.item ?? r.reference ?? r.id))}
            />
          ),
        },
      ]} />
      <Modal open={editOpen} title="Editar movimiento" onClose={() => setEditOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={saveEdit}>Guardar</button>
          </>
        }>
        <div className="grid gap-3">
          <Field label="Tipo">
            <select className="ify-select" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjust">Ajuste</option>
              <option value="Stock">Stock</option>
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
      <Modal open={modalOpen} title="Ajuste de inventario" onClose={() => setModalOpen(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={adjust} disabled={adjusting}>{adjusting ? "Aplicando..." : "Aplicar"}</button>}>
        <div className="grid gap-3">
          <Field label="Producto">
            <select className="ify-select" value={form.item_id} onChange={(e) => setForm({ ...form, item_id: e.target.value })}>
              <option value="">Seleccionar...</option>
              {items.map((i) => <option key={String(i.id)} value={String(i.id)}>{String(i.description)} (Stock: {Number(i.stock)})</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className="ify-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="in">Entrada</option>
              <option value="out">Salida</option>
              <option value="adjust">Ajuste</option>
            </select>
          </Field>
          <Field label="Cantidad"><input type="number" className="ify-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Referencia"><input className="ify-input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function InventoryValidateList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<{ id: number; description: string; stock: number } | null>(null);
  const [initialReal, setInitialReal] = useState<number | undefined>();

  const load = () => {
    setLoading(true);
    api.inventory.stock().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdjust = (row: Record<string, unknown>, presetReal?: number) => {
    setAdjustItem({
      id: Number(row.id),
      description: String(row.description),
      stock: Number(row.stock ?? 0),
    });
    setInitialReal(presetReal);
    setAdjustOpen(true);
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(r.description ?? "").toLowerCase().includes(q) ||
      String(r.internal_id ?? "").toLowerCase().includes(q) ||
      String(r.category ?? "").toLowerCase().includes(q)
    );
  });

  const totalValue = filtered.reduce((s, r) => s + Number(r.value || 0), 0);

  const exportColumns = [
    { key: "internal_id", label: "Código" },
    { key: "description", label: "Producto" },
    { key: "category", label: "Categoría" },
    { key: "stock", label: "Stock" },
    { key: "sale_unit_price", label: "Precio" },
    { key: "value", label: "Valor" },
  ];

  return (
    <div className="ify-page">
      <PageHeader title="Validar inventario" subtitle={`Valor total: S/ ${totalValue.toFixed(2)}`} />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar producto, código o categoría..."
        exportFilename="validar_inventario.csv"
        exportTitle="Validar inventario"
        exportRows={filtered}
        exportColumns={exportColumns}
      />
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "internal_id", label: "Código" },
        { key: "description", label: "Producto" },
        { key: "category", label: "Categoría" },
        { key: "establishment", label: "Establecimiento", render: () => "Oficina Principal" },
        { key: "stock", label: "Stock" },
        { key: "sale_unit_price", label: "Precio", render: (r) => `S/ ${Number(r.sale_unit_price).toFixed(2)}` },
        { key: "value", label: "Valor", render: (r) => `S/ ${Number(r.value).toFixed(2)}` },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => <StockTableActions row={r} onAdjust={openAdjust} />,
        },
      ]} />
      <StockAdjustModal
        open={adjustOpen}
        item={adjustItem}
        initialRealStock={initialReal}
        onClose={() => { setAdjustOpen(false); setInitialReal(undefined); }}
        onSaved={load}
      />
    </div>
  );
}

export function CashList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Ingresos");
  const [search, setSearch] = useState("");
  const [includeBank, setIncludeBank] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editModal, setEditModal] = useState<Record<string, unknown> | null>(null);
  const [openForm, setOpenForm] = useState({ description: "Caja chica POS", balance: "0", pos: true });
  const [editForm, setEditForm] = useState({ description: "", reference: "", opening_balance: "", real_balance: "" });
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    api.cash.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: number) => {
    await api.cash.toggle(id);
    load();
  };

  const openCash = async () => {
    try {
      await api.cash.open({
        description: openForm.description,
        balance: Number(openForm.balance || 0),
        pos: openForm.pos,
      });
      setOpenModal(false);
      setMsg("Caja aperturada correctamente");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al aperturar caja");
    }
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      await api.cash.update(Number(editModal.id), {
        description: editForm.description,
        reference: editForm.reference,
        opening_balance: Number(editForm.opening_balance || 0),
        real_balance: Number(editForm.real_balance || 0),
      });
      setEditModal(null);
      setMsg("Caja actualizada");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al editar caja");
    }
  };

  const downloadReport = async (id: number, type: string, label: string) => {
    try {
      const res = await api.cash.report(id, type);
      downloadCsv(`caja_${id}_${label}.csv`, res.data ?? []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al generar reporte");
    }
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      String(r.reference ?? "").toLowerCase().includes(q) ||
      String(r.seller_name ?? "").toLowerCase().includes(q) ||
      String(r.description ?? "").toLowerCase().includes(q);
    if (!matchSearch) return false;
    if (!includeBank && String(r.reference ?? "").toLowerCase().includes("banco")) return false;
    if (filter === "Ingresos") return Number(r.real_balance ?? 0) >= Number(r.opening_balance ?? 0);
    if (filter === "Egresos") return Number(r.real_balance ?? 0) < Number(r.opening_balance ?? 0);
    return true;
  });

  return (
    <div className="ify-page">
      <PageHeader
        title="CAJAS"
        actions={
          <>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => downloadCsv("reporte_general_cajas.csv", rows)}>
              <i className="bi bi-cart3" /> Reporte general
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => setOpenModal(true)}>
              <i className="bi bi-cart3" /> Aperturar caja chica POS
            </button>
          </>
        }
      />
      {msg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
      <div className="ify-card mb-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="ify-select w-40 text-xs" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option>Ingresos</option>
            <option>Egresos</option>
          </select>
          <input className="ify-input flex-1 min-w-[180px]" placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="button" className="ify-btn-primary text-xs" onClick={() => setSearch(search.trim())}>
            <i className="bi bi-search" /> Buscar
          </button>
          <label className="ml-auto flex items-center gap-1 text-xs">
            <input type="checkbox" checked={includeBank} onChange={(e) => setIncludeBank(e.target.checked)} /> Incluir los ingresos a banco
          </label>
        </div>
      </div>
      <h2 className="mb-2 text-sm font-bold">Listado de cajas</h2>
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "idx", label: "#", render: (_r, i) => i + 1 },
        { key: "reference", label: "# Referencia" },
        { key: "seller_name", label: "Vendedor" },
        {
          key: "opening_date",
          label: "Apertura",
          render: (r) => <span className="whitespace-pre-line text-xs">{String(r.opening_date ?? "—").replace(" ", "\n")}</span>,
        },
        {
          key: "closing_date",
          label: "Cierre",
          render: (r) => <span className="text-xs">{String(r.closing_date ?? "—")}</span>,
        },
        { key: "opening_balance", label: "Saldo inicial", render: (r) => Number(r.opening_balance ?? 0).toFixed(2) },
        { key: "closing_balance", label: "Saldo final", render: (r) => Number(r.closing_balance ?? 0).toFixed(2) },
        { key: "real_balance", label: "Saldo real", render: (r) => Number(r.real_balance ?? 0).toFixed(2) },
        {
          key: "state",
          label: "Estado",
          render: (r) => (
            <span className={`rounded px-2 py-0.5 text-[11px] ${r.is_open ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {String(r.state ?? (r.is_open ? "Aperturada" : "Cerrada"))}
            </span>
          ),
        },
        {
          key: "id",
          label: "Acciones",
          render: (r) => (
            <div className="flex max-w-[280px] flex-wrap gap-1">
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px]" onClick={() => downloadReport(Number(r.id), "general", "general")}>Reporte &gt;</button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px]" onClick={() => downloadReport(Number(r.id), "cash", "efectivo")}>Reporte Efectivo &gt;</button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px]" onClick={() => downloadReport(Number(r.id), "products", "productos")}>Reporte Productos &gt;</button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px] text-green-700 border-green-300" onClick={() => downloadReport(Number(r.id), "income", "ingreso")}>R. Ingreso</button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px] text-amber-700 border-amber-300" onClick={() => toggle(Number(r.id))}>
                {r.is_open ? "Cerrar caja" : "Abrir caja"}
              </button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px]" onClick={() => {
                setEditModal(r);
                setEditForm({
                  description: String(r.description ?? r.reference ?? ""),
                  reference: String(r.reference ?? ""),
                  opening_balance: String(r.opening_balance ?? 0),
                  real_balance: String(r.real_balance ?? 0),
                });
              }}>Editar</button>
              <button type="button" className="ify-btn-outline px-2 py-0.5 text-[10px] text-red-600" onClick={async () => {
                if (!confirm("¿Eliminar esta caja?")) return;
                try {
                  await api.cash.delete(Number(r.id));
                  load();
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Error al eliminar");
                }
              }}>Eliminar</button>
            </div>
          ),
        },
      ]} />

      <Modal open={openModal} title="Aperturar caja chica POS" onClose={() => setOpenModal(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={openCash}>Aperturar</button>}>
        <div className="grid gap-3">
          <Field label="Descripción"><input className="ify-input" value={openForm.description} onChange={(e) => setOpenForm({ ...openForm, description: e.target.value })} /></Field>
          <Field label="Saldo inicial"><input type="number" className="ify-input" value={openForm.balance} onChange={(e) => setOpenForm({ ...openForm, balance: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal open={!!editModal} title="Editar caja" onClose={() => setEditModal(null)}
        footer={<button type="button" className="ify-btn-primary" onClick={saveEdit}>Guardar</button>}>
        <div className="grid gap-3">
          <Field label="Descripción"><input className="ify-input" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></Field>
          <Field label="Referencia"><input className="ify-input" value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} /></Field>
          <Field label="Saldo inicial"><input type="number" className="ify-input" value={editForm.opening_balance} onChange={(e) => setEditForm({ ...editForm, opening_balance: e.target.value })} /></Field>
          <Field label="Saldo real"><input type="number" className="ify-input" value={editForm.real_balance} onChange={(e) => setEditForm({ ...editForm, real_balance: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function CategoriesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = () => {
    setLoading(true);
    api.categories.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return String(r.name ?? "").toLowerCase().includes(q) || String(r.description ?? "").toLowerCase().includes(q);
  });

  const openCreate = () => { setEditId(null); setForm({ name: "", description: "" }); setModalOpen(true); };
  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setForm({ name: String(r.name), description: String(r.description || "") });
    setModalOpen(true);
  };

  const save = async () => {
    if (editId) await api.categories.update(editId, form);
    else await api.categories.create(form);
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar categoría?")) return;
    await api.categories.delete(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader title="Categorías" actions={
        <button type="button" className="ify-btn-primary" onClick={openCreate}><i className="bi bi-plus-lg" /> Nueva</button>
      } />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar categoría..."
        exportFilename="categorias.csv"
        exportTitle="Categorías"
        exportRows={filtered}
        exportColumns={[
          { key: "name", label: "Nombre" },
          { key: "items_count", label: "Productos" },
          { key: "description", label: "Descripción" },
        ]}
      />
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "name", label: "Nombre" }, { key: "items_count", label: "Productos" },
        { key: "actions", label: "Acciones", render: (r) => (
          <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />
        )},
      ]} />
      <Modal open={modalOpen} title={editId ? "Editar categoría" : "Nueva categoría"} onClose={() => setModalOpen(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>}>
        <div className="grid gap-3">
          <Field label="Nombre"><input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Descripción"><input className="ify-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function UsersList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [initial, setInitial] = useState<Partial<import("@/components/users/UserModal").UserFormData>>();

  const load = (value = "") => {
    setLoading(true);
    api.users.records().then((r) => {
      let data = r.data ?? [];
      if (value) {
        const q = value.toLowerCase();
        data = data.filter(
          (u) => String(u.name ?? "").toLowerCase().includes(q) || String(u.email ?? "").toLowerCase().includes(q)
        );
      }
      setRows(data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="ify-page">
      <PageHeader title="Usuarios" actions={
        <button type="button" className="ify-btn-primary" onClick={() => { setEditId(null); setInitial(undefined); setModalOpen(true); }}>
          <i className="bi bi-plus-lg" /> Nuevo usuario
        </button>
      } />
      <div className="ify-card mb-3 p-3">
        <input className="ify-input" placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)} />
      </div>
      <DataTable loading={loading} rows={rows} columns={[
        { key: "name", label: "Nombre" },
        { key: "email", label: "Email" },
        { key: "type", label: "Tipo", render: (r) => String(r.type) },
        { key: "establishment", label: "Local", render: (r) => String(r.establishment ?? "—") },
        { key: "active", label: "Activo", render: (r) => (r.active !== false ? "Sí" : "No") },
        {
          key: "permissions_count",
          label: "Permisos",
          render: (r) => (r.type === "admin" ? "Todos" : String(r.permissions_count ?? 0)),
        },
        {
          key: "id",
          label: "Acciones",
          render: (r) => (
            <div className="flex gap-1">
              <button type="button" className="ify-btn-outline text-xs" onClick={() => {
                setEditId(Number(r.id));
                setInitial({
                  name: String(r.name), email: String(r.email), type: String(r.type),
                  establishment_id: String(r.establishment_id ?? ""), permissions: (r.permissions as string[]) ?? [],
                  active: r.active !== false, password: "",
                });
                setModalOpen(true);
              }}>Editar</button>
              <RowActions onDelete={async () => {
                if (!confirm(`¿Eliminar usuario ${r.name}?`)) return;
                try {
                  await api.users.delete(Number(r.id));
                  load(search);
                } catch (e) {
                  alert(e instanceof Error ? e.message : "No se pudo eliminar");
                }
              }} />
            </div>
          ),
        },
      ]} />
      <UserModal open={modalOpen} editId={editId} initial={initial} onClose={() => setModalOpen(false)} onSaved={() => load(search)} />
    </div>
  );
}

export function EstablishmentsList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "0000", description: "", address: "", email: "", telephone: "", active: true });

  const load = () => {
    setLoading(true);
    api.establishments.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm({ code: "0000", description: "", address: "", email: "", telephone: "", active: true });
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setForm({
      code: String(r.code ?? "0000"),
      description: String(r.description ?? ""),
      address: String(r.address ?? ""),
      email: String(r.email ?? ""),
      telephone: String(r.telephone ?? ""),
      active: r.active !== false,
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) { alert("Descripción obligatoria"); return; }
    if (editId) await api.establishments.update(editId, form);
    else await api.establishments.create(form);
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Desactivar este local?")) return;
    await api.establishments.delete(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader title="Locales / Establecimientos" actions={
        <button type="button" className="ify-btn-primary" onClick={openCreate}><i className="bi bi-plus-lg" /> Nuevo local</button>
      } />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "code", label: "Código" }, { key: "description", label: "Descripción" },
        { key: "address", label: "Dirección", render: (r) => String(r.address || "—") },
        { key: "telephone", label: "Teléfono", render: (r) => String(r.telephone || "—") },
        { key: "active", label: "Activo", render: (r) => (r.active ? "Sí" : "No") },
        { key: "actions", label: "Acciones", render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} /> },
      ]} />
      <Modal open={modalOpen} title={editId ? "Editar local" : "Nuevo local"} onClose={() => setModalOpen(false)}
        footer={<><button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button><button type="button" className="ify-btn-primary" onClick={save}>Guardar</button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código"><input className="ify-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Descripción *"><input className="ify-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Dirección" className="sm:col-span-2"><input className="ify-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <Field label="Email"><input className="ify-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Teléfono"><input className="ify-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function ExchangeRatesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [rate, setRate] = useState("");

  const load = () => {
    setLoading(true);
    api.exchangeRates.records().then((r) => {
      setRows(r.data ?? []);
      if (r.data?.[0]) setRate(String(r.data[0].sale));
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    await api.exchangeRates.update(rate);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader title="Tipo de cambio" />
      <div className="ify-card mb-4 p-4">
        <Field label="Tipo de cambio venta (USD)">
          <div className="flex gap-2">
            <input className="ify-input flex-1" value={rate} onChange={(e) => setRate(e.target.value)} />
            <button type="button" className="ify-btn-primary" onClick={save}>Actualizar</button>
          </div>
        </Field>
      </div>
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "sale", label: "Venta" }, { key: "purchase", label: "Compra" },
      ]} />
    </div>
  );
}

export function FinancesMovementsList() {
  return (
    <RecordsCrudList
      pathname="/finances/movements"
      apiPath="finances/movements/records"
      title="Movimientos financieros"
      subtitle="Ingresos, egresos y movimientos de caja"
    />
  );
}
