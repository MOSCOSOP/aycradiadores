"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { ListToolbar } from "@/components/ui/ListToolbar";
import { RowActions } from "@/components/ui/RowActions";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { LineItemsEditor, mapApiItems, serializeLineItems } from "@/components/ui/LineItemsEditor";
import { RecordsCrudList } from "@/components/modules/RecordsCrudList";
import { REPORT_SECTIONS } from "@/lib/reports-catalog";

function useRecords(fetcher: () => Promise<{ data: Record<string, unknown>[] }>) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetcher().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  }, []);
  return { rows, loading };
}

export function ReportsHub() {
  return (
    <div className="ify-page">
      <PageHeader title="Reportes" subtitle="Análisis comercial, ventas, compras e inventario" />
      <div className="space-y-6">
        {REPORT_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">{section.title}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ify-card flex items-center gap-3 p-3 text-sm hover:border-[var(--primary)]"
                >
                  <i className={`bi ${item.icon ?? "bi-file-bar-graph"} text-lg text-[var(--primary)]`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsNotSentList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    api.documents.notSent().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resend = async (id: number) => {
    try {
      const res = await api.documents.resend(id);
      setMsg(res.message || "Comprobante reenviado");
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al reenviar");
    }
  };

  const resendAll = async () => {
    if (!rows.length) return;
    if (!confirm(`¿Reenviar ${rows.length} comprobantes a SUNAT?`)) return;
    let ok = 0;
    for (const r of rows) {
      try {
        await api.documents.resend(Number(r.id));
        ok++;
      } catch {
        /* skip */
      }
    }
    setMsg(`Reenviados ${ok} de ${rows.length} comprobantes`);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Comprobantes no enviados"
        subtitle="Pendientes de envío a SUNAT"
        actions={
          <button type="button" className="ify-btn-primary text-xs" onClick={resendAll} disabled={!rows.length}>
            Reenviar todos
          </button>
        }
      />
      {msg && <div className="mb-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}
      <DataTable loading={loading} rows={rows} columns={[
        { key: "number", label: "Número" }, { key: "document_type_description", label: "Tipo" },
        { key: "customer_name", label: "Cliente" }, { key: "date_of_issue", label: "Fecha" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total).toFixed(2)}` },
        { key: "state_type_description", label: "Estado" },
        {
          key: "id",
          label: "Acciones",
          render: (r) => (
            <div className="flex gap-1">
              <button type="button" className="ify-btn-outline text-xs" onClick={() => resend(Number(r.id))}>
                Reenviar SUNAT
              </button>
              <RowActions onDelete={async () => {
                if (!confirm(`¿Eliminar comprobante ${r.number}?`)) return;
                try {
                  await api.documents.delete(Number(r.id));
                  load();
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Error al eliminar");
                }
              }} />
            </div>
          ),
        },
      ]} emptyMessage="Todos los comprobantes están enviados o no hay registros" />
    </div>
  );
}

export function ServicesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ description: "", internal_id: "", sale_unit_price: "" });

  const load = () => {
    setLoading(true);
    api.services.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(r.description ?? "").toLowerCase().includes(q) ||
      String(r.internal_id ?? "").toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditId(null);
    setForm({ description: "", internal_id: "", sale_unit_price: "" });
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setForm({
      description: String(r.description ?? ""),
      internal_id: String(r.internal_id ?? ""),
      sale_unit_price: String(r.sale_unit_price ?? ""),
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.description.trim()) {
      alert("La descripción es obligatoria");
      return;
    }
    const payload = { ...form, sale_unit_price: Number(form.sale_unit_price || 0) };
    if (editId) await api.services.update(editId, payload);
    else await api.services.create(payload);
    setModalOpen(false);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar servicio?")) return;
    await api.services.delete(id);
    load();
  };

  const exportColumns = [
    { key: "internal_id", label: "Código" },
    { key: "description", label: "Descripción" },
    { key: "category", label: "Categoría" },
    { key: "sale_unit_price", label: "Precio" },
  ];

  return (
    <div className="ify-page">
      <PageHeader title="Servicios" actions={
        <button type="button" className="ify-btn-primary" onClick={openCreate}><i className="bi bi-plus-lg" /> Nuevo servicio</button>
      } />
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Buscar servicio o código..."
        exportFilename="servicios.csv"
        exportTitle="Servicios"
        exportRows={filtered}
        exportColumns={exportColumns}
      />
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "internal_id", label: "Código" }, { key: "description", label: "Descripción" },
        { key: "category", label: "Categoría" },
        { key: "sale_unit_price", label: "Precio", render: (r) => `S/ ${Number(r.sale_unit_price).toFixed(2)}` },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />,
        },
      ]} />
      <Modal open={modalOpen} title={editId ? "Editar servicio" : "Nuevo servicio"} onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }>
        <div className="grid gap-3">
          <Field label="Descripción"><input className="ify-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Código"><input className="ify-input" value={form.internal_id} onChange={(e) => setForm({ ...form, internal_id: e.target.value })} /></Field>
          <Field label="Precio"><input type="number" className="ify-input" value={form.sale_unit_price} onChange={(e) => setForm({ ...form, sale_unit_price: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function DispatchesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    transfer_reason: "Venta",
    origin_address: "",
    dest_address: "",
    vehicle_plate: "",
    driver_name: "",
    driver_document: "",
    state: "Registrado",
  });

  const load = () => {
    setLoading(true);
    api.dispatches.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return String(r.number ?? "").toLowerCase().includes(q) || String(r.customer_name ?? "").toLowerCase().includes(q);
  });

  const openEdit = async (id: number) => {
    setEditId(id);
    setEditOpen(true);
    try {
      const res = await api.dispatches.get(id);
      const d = res.data ?? {};
      setEditForm({
        transfer_reason: String(d.transfer_reason ?? "Venta"),
        origin_address: String(d.origin_address ?? ""),
        dest_address: String(d.dest_address ?? ""),
        vehicle_plate: String(d.vehicle_plate ?? ""),
        driver_name: String(d.driver_name ?? ""),
        driver_document: String(d.driver_document ?? ""),
        state: String(d.state ?? "Registrado"),
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cargar guía");
      setEditOpen(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await api.dispatches.update(editId, editForm);
      setEditOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar guía ${number}?`)) return;
    try {
      await api.dispatches.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader title="Guías de remisión" actions={
        <Link href="/dispatches/create" className="ify-btn-primary"><i className="bi bi-plus-lg" /> Nueva guía</Link>
      } />
      <div className="ify-card mb-3 p-3">
        <input className="ify-input" placeholder="Buscar guía o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "idx", label: "#", render: (_r, i) => i + 1 },
        { key: "number", label: "Número", render: (r) => <Link href={`/dispatches/${r.id}`} className="ify-link">{String(r.number)}</Link> },
        { key: "customer_name", label: "Cliente" },
        { key: "date_of_issue", label: "F. Emisión", render: (r) => String(r.date_of_issue || r.date) },
        { key: "transfer_reason", label: "Motivo traslado" },
        { key: "vehicle_plate", label: "Placa", render: (r) => String(r.vehicle_plate || r.plate || "—") },
        { key: "driver_name", label: "Conductor", render: (r) => String(r.driver_name || "—") },
        { key: "state_type_description", label: "Estado", render: (r) => String(r.state_type_description || r.state || "Registrado") },
        { key: "actions", label: "Acciones", render: (r) => <RowActions onEdit={() => openEdit(Number(r.id))} onDelete={() => remove(Number(r.id), String(r.number ?? ""))} /> },
      ]} emptyMessage="Sin guías — crea la primera" />
      <Modal open={editOpen} title="Editar guía de remisión" onClose={() => setEditOpen(false)}
        footer={<><button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button><button type="button" className="ify-btn-primary" onClick={saveEdit}>Guardar</button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Motivo traslado"><input className="ify-input" value={editForm.transfer_reason} onChange={(e) => setEditForm({ ...editForm, transfer_reason: e.target.value })} /></Field>
          <Field label="Estado">
            <select className="ify-select" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}>
              <option value="Registrado">Registrado</option><option value="Enviado">Enviado</option><option value="Anulado">Anulado</option>
            </select>
          </Field>
          <Field label="Dirección origen" className="sm:col-span-2"><input className="ify-input" value={editForm.origin_address} onChange={(e) => setEditForm({ ...editForm, origin_address: e.target.value })} /></Field>
          <Field label="Dirección destino" className="sm:col-span-2"><input className="ify-input" value={editForm.dest_address} onChange={(e) => setEditForm({ ...editForm, dest_address: e.target.value })} /></Field>
          <Field label="Placa"><input className="ify-input" value={editForm.vehicle_plate} onChange={(e) => setEditForm({ ...editForm, vehicle_plate: e.target.value })} /></Field>
          <Field label="Conductor"><input className="ify-input" value={editForm.driver_name} onChange={(e) => setEditForm({ ...editForm, driver_name: e.target.value })} /></Field>
          <Field label="Doc. conductor"><input className="ify-input" value={editForm.driver_document} onChange={(e) => setEditForm({ ...editForm, driver_document: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function OrderNotesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ state: "Pendiente", customer_name: "" });
  const [editItems, setEditItems] = useState<{ description: string; quantity: string; unit_price: string }[]>([]);

  const load = () => {
    setLoading(true);
    api.orderNotes.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openEdit = async (id: number) => {
    setEditId(id);
    setEditOpen(true);
    try {
      const res = await api.orderNotes.get(id);
      const d = res.data ?? {};
      setEditForm({ state: String(d.state ?? "Pendiente"), customer_name: String(d.customer_name ?? "") });
      setEditItems(mapApiItems(d.items as Record<string, unknown>[] | undefined));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al cargar pedido");
      setEditOpen(false);
    }
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      await api.orderNotes.update(editId, { state: editForm.state, items: serializeLineItems(editItems) });
      setEditOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    }
  };

  const remove = async (id: number, number: string) => {
    if (!confirm(`¿Eliminar pedido ${number}?`)) return;
    try {
      await api.orderNotes.delete(id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader title="Pedidos" actions={
        <Link href="/order-notes/create" className="ify-btn-primary"><i className="bi bi-plus-lg" /> Nuevo pedido</Link>
      } />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "number", label: "Número" }, { key: "customer_name", label: "Cliente" },
        { key: "date", label: "Fecha" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total).toFixed(2)}` },
        { key: "state", label: "Estado" },
        { key: "actions", label: "Acciones", render: (r) => <RowActions onEdit={() => openEdit(Number(r.id))} onDelete={() => remove(Number(r.id), String(r.number ?? ""))} /> },
      ]} />
      <Modal open={editOpen} title={`Editar pedido${editForm.customer_name ? ` — ${editForm.customer_name}` : ""}`} onClose={() => setEditOpen(false)}
        footer={<><button type="button" className="ify-btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button><button type="button" className="ify-btn-primary" onClick={saveEdit}>Guardar</button></>}>
        <Field label="Estado">
          <select className="ify-select" value={editForm.state} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}>
            <option value="Pendiente">Pendiente</option><option value="Atendido">Atendido</option><option value="Anulado">Anulado</option>
          </select>
        </Field>
        <div className="mt-4"><LineItemsEditor items={editItems} onChange={setEditItems} /></div>
      </Modal>
    </div>
  );
}

export function SireSalesList() {
  const { rows, loading } = useRecords(() => api.sire.sales());
  return (
    <div className="ify-page">
      <PageHeader title="SIRE — Ventas" subtitle="Registro para declaración SUNAT" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "period", label: "Periodo" }, { key: "document_type", label: "Tipo" },
        { key: "number", label: "Número" }, { key: "customer", label: "Cliente" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total).toFixed(2)}` },
        { key: "igv", label: "IGV", render: (r) => `S/ ${Number(r.igv).toFixed(2)}` },
      ]} />
    </div>
  );
}

export function SirePurchasesList() {
  const { rows, loading } = useRecords(() => api.sire.purchases());
  return (
    <div className="ify-page">
      <PageHeader title="SIRE — Compras" subtitle="Registro para declaración SUNAT" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "period", label: "Periodo" }, { key: "number", label: "Número" },
        { key: "supplier", label: "Proveedor" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total).toFixed(2)}` },
        { key: "state", label: "Estado" },
      ]} />
    </div>
  );
}

export function SireAnnexesList() {
  const { rows, loading } = useRecords(() => api.sire.annexes());
  return (
    <div className="ify-page">
      <PageHeader title="SIRE — Anexos" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "name", label: "Anexo" }, { key: "records", label: "Registros" }, { key: "status", label: "Estado" },
      ]} />
    </div>
  );
}

export function AccountingChartList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "Activo" });

  const load = () => {
    setLoading(true);
    api.accounting.chart().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editId) return;
    await api.accounting.updateChart(editId, form);
    setModalOpen(false);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader title="Plan de cuentas" subtitle="PCGE simplificado" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "code", label: "Código" }, { key: "name", label: "Cuenta" }, { key: "type", label: "Tipo" },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => (
            <RowActions
              onEdit={() => {
                setEditId(Number(r.id));
                setForm({ code: String(r.code ?? ""), name: String(r.name ?? ""), type: String(r.type ?? "") });
                setModalOpen(true);
              }}
              onDelete={async () => {
                if (!confirm("¿Eliminar cuenta?")) return;
                await api.accounting.deleteChart(Number(r.id));
                load();
              }}
            />
          ),
        },
      ]} />
      <Modal open={modalOpen} title="Editar cuenta" onClose={() => setModalOpen(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>}>
        <div className="grid gap-3">
          <Field label="Código"><input className="ify-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Nombre"><input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Tipo"><input className="ify-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}

export function AccountingDailyList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.accounting.daily().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="ify-page">
      <PageHeader title="Libro diario" subtitle="Asientos generados automáticamente por ventas" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "reference", label: "Referencia" },
        { key: "account_code", label: "Cuenta" }, { key: "account_name", label: "Nombre" },
        { key: "debit", label: "Debe", render: (r) => Number(r.debit) > 0 ? Number(r.debit).toFixed(2) : "" },
        { key: "credit", label: "Haber", render: (r) => Number(r.credit) > 0 ? Number(r.credit).toFixed(2) : "" },
        {
          key: "actions",
          label: "Acciones",
          render: (r) => (
            <RowActions onDelete={async () => {
              if (!confirm("¿Eliminar asiento?")) return;
              await api.accounting.deleteDaily(Number(r.id));
              load();
            }} />
          ),
        },
      ]} />
    </div>
  );
}

export function AccountingEntriesList() {
  const { rows, loading } = useRecords(() => api.accounting.entries());
  return (
    <div className="ify-page">
      <PageHeader title="Asientos automáticos" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "reference", label: "Referencia" }, { key: "entries", label: "Líneas" }, { key: "type", label: "Tipo" },
      ]} emptyMessage="Los asientos se generan al emitir comprobantes" />
    </div>
  );
}

export function FinancesToPayList() {
  return <RecordsCrudList pathname="/finances/to-pay" apiPath="finances/to-pay/records" title="Letras por pagar" subtitle="Obligaciones con proveedores" />;
}

export function FinancesToCollectList() {
  return <RecordsCrudList pathname="/finances/to-collect" apiPath="finances/to-collect/records" title="Letras por cobrar" subtitle="Cuentas por cobrar a clientes" />;
}

export function FinancesIncomeList() {
  return <RecordsCrudList pathname="/finances/income" apiPath="finances/income/records" title="Ingresos diversos" />;
}
