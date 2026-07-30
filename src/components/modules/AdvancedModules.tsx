"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
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
    <div className="p-4 md:p-5">
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
    <div className="p-4 md:p-5">
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
            <button type="button" className="ify-btn-outline text-xs" onClick={() => resend(Number(r.id))}>
              Reenviar SUNAT
            </button>
          ),
        },
      ]} emptyMessage="Todos los comprobantes están enviados o no hay registros" />
    </div>
  );
}

export function ServicesList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ description: "", internal_id: "", sale_unit_price: "" });

  const load = () => {
    setLoading(true);
    api.services.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Servicios" actions={
        <button type="button" className="ify-btn-primary" onClick={() => setModalOpen(true)}><i className="bi bi-plus-lg" /> Nuevo servicio</button>
      } />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "internal_id", label: "Código" }, { key: "description", label: "Descripción" },
        { key: "category", label: "Categoría" },
        { key: "sale_unit_price", label: "Precio", render: (r) => `S/ ${Number(r.sale_unit_price).toFixed(2)}` },
      ]} />
      <Modal open={modalOpen} title="Nuevo servicio" onClose={() => setModalOpen(false)}
        footer={<button type="button" className="ify-btn-primary" onClick={async () => {
          await api.services.create({ ...form, sale_unit_price: Number(form.sale_unit_price) });
          setModalOpen(false); load();
        }}>Guardar</button>}>
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

  useEffect(() => {
    api.dispatches.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      String(r.number ?? "").toLowerCase().includes(q) ||
      String(r.customer_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Guías de remisión" actions={
        <Link href="/dispatches/create" className="ify-btn-primary"><i className="bi bi-plus-lg" /> Nueva guía</Link>
      } />
      <div className="ify-card mb-3 p-3">
        <input className="ify-input" placeholder="Buscar guía o cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable loading={loading} rows={filtered} columns={[
        { key: "idx", label: "#", render: (_r, i) => i + 1 },
        {
          key: "number",
          label: "Número",
          render: (r) => <Link href={`/dispatches/${r.id}`} className="ify-link">{String(r.number)}</Link>,
        },
        { key: "customer_name", label: "Cliente" },
        { key: "date_of_issue", label: "F. Emisión", render: (r) => String(r.date_of_issue || r.date) },
        { key: "transfer_reason", label: "Motivo traslado" },
        { key: "vehicle_plate", label: "Placa", render: (r) => String(r.vehicle_plate || r.plate || "—") },
        { key: "driver_name", label: "Conductor", render: (r) => String(r.driver_name || "—") },
        { key: "state_type_description", label: "Estado", render: (r) => String(r.state_type_description || r.state || "Registrado") },
      ]} emptyMessage="Sin guías — crea la primera" />
    </div>
  );
}

export function OrderNotesList() {
  const { rows, loading } = useRecords(() => api.orderNotes.records());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Pedidos" actions={
        <Link href="/order-notes/create" className="ify-btn-primary"><i className="bi bi-plus-lg" /> Nuevo pedido</Link>
      } />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "number", label: "Número" }, { key: "customer_name", label: "Cliente" },
        { key: "date", label: "Fecha" },
        { key: "total", label: "Total", render: (r) => `S/ ${Number(r.total).toFixed(2)}` },
        { key: "state", label: "Estado" },
      ]} />
    </div>
  );
}

export function SireSalesList() {
  const { rows, loading } = useRecords(() => api.sire.sales());
  return (
    <div className="p-4 md:p-5">
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
    <div className="p-4 md:p-5">
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
    <div className="p-4 md:p-5">
      <PageHeader title="SIRE — Anexos" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "name", label: "Anexo" }, { key: "records", label: "Registros" }, { key: "status", label: "Estado" },
      ]} />
    </div>
  );
}

export function AccountingChartList() {
  const { rows, loading } = useRecords(() => api.accounting.chart());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Plan de cuentas" subtitle="PCGE simplificado" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "code", label: "Código" }, { key: "name", label: "Cuenta" }, { key: "type", label: "Tipo" },
      ]} />
    </div>
  );
}

export function AccountingDailyList() {
  const { rows, loading } = useRecords(() => api.accounting.daily());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Libro diario" subtitle="Asientos generados automáticamente por ventas" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "reference", label: "Referencia" },
        { key: "account_code", label: "Cuenta" }, { key: "account_name", label: "Nombre" },
        { key: "debit", label: "Debe", render: (r) => Number(r.debit) > 0 ? Number(r.debit).toFixed(2) : "" },
        { key: "credit", label: "Haber", render: (r) => Number(r.credit) > 0 ? Number(r.credit).toFixed(2) : "" },
      ]} />
    </div>
  );
}

export function AccountingEntriesList() {
  const { rows, loading } = useRecords(() => api.accounting.entries());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Asientos automáticos" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "reference", label: "Referencia" }, { key: "entries", label: "Líneas" }, { key: "type", label: "Tipo" },
      ]} emptyMessage="Los asientos se generan al emitir comprobantes" />
    </div>
  );
}

export function FinancesToPayList() {
  const { rows, loading } = useRecords(() => api.finances.toPay());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Letras por pagar" subtitle="Obligaciones con proveedores" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "supplier", label: "Proveedor" },
        { key: "document", label: "Documento" },
        { key: "amount", label: "Monto", render: (r) => `S/ ${Number(r.amount).toFixed(2)}` },
        { key: "state", label: "Estado" },
      ]} />
    </div>
  );
}

export function FinancesToCollectList() {
  const { rows, loading } = useRecords(() => api.finances.toCollect());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Letras por cobrar" subtitle="Cuentas por cobrar a clientes" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "customer", label: "Cliente" },
        { key: "document", label: "Documento" },
        { key: "amount", label: "Monto", render: (r) => `S/ ${Number(r.amount).toFixed(2)}` },
        { key: "state", label: "Estado" },
      ]} />
    </div>
  );
}

export function FinancesIncomeList() {
  const { rows, loading } = useRecords(() => api.finances.income());
  return (
    <div className="p-4 md:p-5">
      <PageHeader title="Ingresos diversos" />
      <DataTable loading={loading} rows={rows} columns={[
        { key: "date", label: "Fecha" }, { key: "description", label: "Descripción" },
        { key: "amount", label: "Monto", render: (r) => `S/ ${Number(r.amount).toFixed(2)}` },
      ]} />
    </div>
  );
}
