"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader, Field } from "@/components/ui/Modal";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { api } from "@/lib/api/client";

type BatchRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_number: string;
  description: string;
  quantity: number;
  unit_price: number;
  plate: string;
};

export function MassDocumentEmission() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [tables, setTables] = useState<Record<string, unknown> | null>(null);
  const [docTypeId, setDocTypeId] = useState("03");
  const [seriesId, setSeriesId] = useState(0);
  const [establishmentId, setEstablishmentId] = useState(0);
  const [sellerId, setSellerId] = useState(0);
  const [dateIssue, setDateIssue] = useState(today);
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState("");
  const [customerModal, setCustomerModal] = useState(false);
  const [activeRowId, setActiveRowId] = useState<number | null>(null);

  useEffect(() => {
    api.documents.tables().then((data) => {
      setTables(data);
      const est = (data.all_establishments as { id: number }[])?.[0];
      const sel = (data.sellers as { id: number }[])?.[0];
      const ser = (data.series as { id: number; document_type_id: string }[])?.find((s) => s.document_type_id === "03");
      if (est) setEstablishmentId(est.id);
      if (sel) setSellerId(sel.id);
      if (ser) setSeriesId(ser.id);
      api.customers.records({ page: 1, limit: 1 }).then((r) => {
        const c = r.data?.[0];
        if (c) {
          setRows([
            {
              id: 1,
              customer_id: Number(c.id),
              customer_name: String(c.name),
              customer_number: String(c.number),
              description: "",
              quantity: 1,
              unit_price: 0,
              plate: "",
            },
          ]);
        }
      });
    });
  }, []);

  const documentTypes = (tables?.document_types as { id: string; description: string }[]) ?? [];
  const series = (tables?.series as { id: number; number: string; document_type_id: string }[]) ?? [];
  const establishments = (tables?.all_establishments as { id: number; description: string }[]) ?? [];
  const sellers = (tables?.sellers as { id: number; name: string }[]) ?? [];

  const addRow = () => {
    const last = rows[rows.length - 1];
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        customer_id: last?.customer_id ?? 0,
        customer_name: last?.customer_name ?? "",
        customer_number: last?.customer_number ?? "",
        description: "",
        quantity: 1,
        unit_price: 0,
        plate: last?.plate ?? "",
      },
    ]);
  };

  const emitAll = async () => {
    const valid = rows.filter((r) => r.customer_id && r.description && r.unit_price > 0);
    if (valid.length === 0) {
      alert("Agrega al menos una fila válida con cliente, descripción y precio");
      return;
    }
    setProcessing(true);
    setResult("");
    try {
      const res = await api.documents.massive({
        document_type_id: docTypeId,
        series_id: seriesId,
        establishment_id: establishmentId,
        seller_id: sellerId,
        date_of_issue: dateIssue,
        rows: valid,
      });
      setResult(`Emitidos ${res.created} comprobantes correctamente.`);
      if (res.created > 0) setTimeout(() => router.push("/documents"), 1500);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error en emisión masiva");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-4 md:p-5">
      <PageHeader
        title="Emisión masiva de comprobantes"
        subtitle="Genera varias boletas/facturas en un solo proceso"
        actions={
          <Link href="/documents" className="ify-btn-outline text-xs">
            ← Listado
          </Link>
        }
      />

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Field label="Tipo comprobante">
            <select
              className="ify-select"
              value={docTypeId}
              onChange={(e) => {
                setDocTypeId(e.target.value);
                const match = series.find((s) => s.document_type_id === e.target.value);
                if (match) setSeriesId(match.id);
              }}
            >
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.description}</option>
              ))}
            </select>
          </Field>
          <Field label="Serie">
            <select className="ify-select" value={seriesId} onChange={(e) => setSeriesId(Number(e.target.value))}>
              {series.filter((s) => s.document_type_id === docTypeId).map((s) => (
                <option key={s.id} value={s.id}>{s.number}</option>
              ))}
            </select>
          </Field>
          <Field label="Fec. emisión">
            <input type="date" className="ify-input" value={dateIssue} onChange={(e) => setDateIssue(e.target.value)} />
          </Field>
          <Field label="Establecimiento">
            <select className="ify-select" value={establishmentId} onChange={(e) => setEstablishmentId(Number(e.target.value))}>
              {establishments.map((e) => <option key={e.id} value={e.id}>{e.description}</option>)}
            </select>
          </Field>
          <Field label="Vendedor">
            <select className="ify-select" value={sellerId} onChange={(e) => setSellerId(Number(e.target.value))}>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="ify-card mb-3 overflow-x-auto">
        <table className="ify-table text-xs">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Placa</th>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>P. Unit</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id}>
                <td>{idx + 1}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <span className="min-w-[120px]">{r.customer_name || "—"}</span>
                    <button
                      type="button"
                      className="ify-link text-[10px]"
                      onClick={() => { setActiveRowId(r.id); setCustomerModal(true); }}
                    >
                      [+]
                    </button>
                  </div>
                </td>
                <td>
                  <input
                    className="ify-input w-24 uppercase"
                    value={r.plate}
                    onChange={(e) =>
                      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, plate: e.target.value.toUpperCase() } : x)))
                    }
                  />
                </td>
                <td>
                  <input
                    className="ify-input min-w-[180px]"
                    value={r.description}
                    onChange={(e) =>
                      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="ify-input w-16"
                    value={r.quantity}
                    onChange={(e) =>
                      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, quantity: Number(e.target.value) } : x)))
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="ify-input w-20"
                    value={r.unit_price}
                    onChange={(e) =>
                      setRows((p) => p.map((x) => (x.id === r.id ? { ...x, unit_price: Number(e.target.value) } : x)))
                    }
                  />
                </td>
                <td className="font-semibold">S/ {(r.quantity * r.unit_price).toFixed(2)}</td>
                <td>
                  <button type="button" className="text-red-500" onClick={() => setRows((p) => p.filter((x) => x.id !== r.id))}>
                    <i className="bi bi-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="ify-btn-outline" onClick={addRow}>
          <i className="bi bi-plus-lg" /> Agregar fila
        </button>
        <button type="button" className="ify-btn-primary" onClick={emitAll} disabled={processing}>
          {processing ? "Emitiendo..." : "Emitir comprobantes masivos"}
        </button>
      </div>

      {result && <p className="mt-3 text-sm text-green-700">{result}</p>}

      <CustomerModal
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        onSaved={(c) => {
          if (activeRowId) {
            setRows((p) =>
              p.map((x) =>
                x.id === activeRowId
                  ? { ...x, customer_id: Number(c.id), customer_name: String(c.name), customer_number: String(c.number) }
                  : x
              )
            );
          }
        }}
      />
    </div>
  );
}
