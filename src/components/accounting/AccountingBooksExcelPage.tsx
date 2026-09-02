"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { api } from "@/lib/api/client";

const DOC_TYPE_OPTIONS = [
  { value: "", label: "Todos los tipos" },
  { value: "01", label: "Factura" },
  { value: "03", label: "Boleta de venta" },
  { value: "07", label: "Nota de crédito" },
  { value: "08", label: "Nota de débito" },
];

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AccountingBooksExcelPage() {
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.accounting.salesBook({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        document_type_id: documentTypeId || undefined,
      });
      setRows(res.data ?? []);
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo generar el reporte");
    } finally {
      setLoading(false);
    }
  };

  const totals = rows.reduce<{ taxed: number; exonerated: number; igv: number; total: number }>(
    (acc, r) => ({
      taxed: acc.taxed + Number(r.total_taxed ?? 0),
      exonerated: acc.exonerated + Number(r.total_exonerated ?? 0),
      igv: acc.igv + Number(r.total_igv ?? 0),
      total: acc.total + Number(r.total ?? 0),
    }),
    { taxed: 0, exonerated: 0, igv: 0, total: 0 }
  );

  const downloadExcel = async () => {
    if (!rows.length) {
      alert("No hay comprobantes en el periodo/tipo seleccionado.");
      return;
    }
    const XLSX = await import("xlsx");
    const sheetRows = rows.map((r, i) => ({
      "N°": i + 1,
      "Periodo": r.period,
      "Fecha Emisión": r.date_of_issue,
      "Tipo CPE": r.document_type_description,
      "Serie": r.series,
      "Número": r.number,
      "N° Completo": r.full_number,
      "Tipo Doc. Cliente": r.customer_document_type_id,
      "N° Doc. Cliente": r.customer_number,
      "Cliente / Razón Social": r.customer_name,
      "Moneda": r.currency_type_id,
      "T.C.": r.exchange_rate,
      "Op. Gravadas": Number(r.total_taxed ?? 0),
      "Op. Exoneradas": Number(r.total_exonerated ?? 0),
      "IGV": Number(r.total_igv ?? 0),
      "Total": Number(r.total ?? 0),
      "Estado CPE": r.state_type_description,
      "Referencia (Placa/N. Venta)": r.reference,
    }));

    // Fila de totales al final, para que la contadora la vea de inmediato.
    sheetRows.push({
      "N°": "" as unknown as number,
      "Periodo": "",
      "Fecha Emisión": "",
      "Tipo CPE": "",
      "Serie": "",
      "Número": "",
      "N° Completo": "",
      "Tipo Doc. Cliente": "",
      "N° Doc. Cliente": "",
      "Cliente / Razón Social": "TOTALES",
      "Moneda": "",
      "T.C.": "" as unknown as number,
      "Op. Gravadas": Math.round(totals.taxed * 100) / 100,
      "Op. Exoneradas": Math.round(totals.exonerated * 100) / 100,
      "IGV": Math.round(totals.igv * 100) / 100,
      "Total": Math.round(totals.total * 100) / 100,
      "Estado CPE": "",
      "Referencia (Placa/N. Venta)": "",
    });

    const ws = XLSX.utils.json_to_sheet(sheetRows);
    ws["!cols"] = [
      { wch: 4 }, { wch: 9 }, { wch: 12 }, { wch: 16 }, { wch: 6 }, { wch: 10 }, { wch: 14 },
      { wch: 8 }, { wch: 12 }, { wch: 32 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registro de Ventas");
    const label = documentTypeId ? DOC_TYPE_OPTIONS.find((o) => o.value === documentTypeId)?.label : "Todos";
    XLSX.writeFile(wb, `libro-ventas_${dateFrom}_a_${dateTo}_${label}.xlsx`);
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Libros en Excel"
        subtitle="Formato de Registro de Ventas para contabilidad, filtrado por periodo y tipo de comprobante"
      />

      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="ify-label">
            Desde
            <input type="date" className="ify-input mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="ify-label">
            Hasta
            <input type="date" className="ify-input mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
          <label className="ify-label">
            Tipo de comprobante
            <select className="ify-select mt-1" value={documentTypeId} onChange={(e) => setDocumentTypeId(e.target.value)}>
              {DOC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="button" className="ify-btn-primary w-full" onClick={generate} disabled={loading}>
              {loading ? "Generando..." : "Generar libro"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {generated && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="ify-card p-3">
              <p className="text-[11px] text-[var(--muted)]">Comprobantes</p>
              <p className="text-lg font-bold">{rows.length}</p>
            </div>
            <div className="ify-card p-3">
              <p className="text-[11px] text-[var(--muted)]">Op. Gravadas</p>
              <p className="text-lg font-bold">S/ {totals.taxed.toFixed(2)}</p>
            </div>
            <div className="ify-card p-3">
              <p className="text-[11px] text-[var(--muted)]">IGV</p>
              <p className="text-lg font-bold">S/ {totals.igv.toFixed(2)}</p>
            </div>
            <div className="ify-card p-3">
              <p className="text-[11px] text-[var(--muted)]">Total</p>
              <p className="text-lg font-bold text-[var(--primary)]">S/ {totals.total.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-3 flex justify-end">
            <button type="button" className="ify-btn-primary" onClick={downloadExcel}>
              <i className="bi bi-file-earmark-excel" /> Descargar Excel (.xlsx)
            </button>
          </div>

          <DataTable
            loading={loading}
            emptyMessage="No se encontraron comprobantes en el periodo y tipo seleccionados"
            rows={rows}
            columns={[
              { key: "date_of_issue", label: "Fecha" },
              { key: "document_type_description", label: "Tipo" },
              { key: "full_number", label: "N° Comprobante" },
              { key: "customer_name", label: "Cliente" },
              { key: "customer_number", label: "N° Doc." },
              { key: "total_taxed", label: "Gravado", render: (r) => Number(r.total_taxed ?? 0).toFixed(2) },
              { key: "total_exonerated", label: "Exonerado", render: (r) => Number(r.total_exonerated ?? 0).toFixed(2) },
              { key: "total_igv", label: "IGV", render: (r) => Number(r.total_igv ?? 0).toFixed(2) },
              { key: "total", label: "Total", render: (r) => Number(r.total ?? 0).toFixed(2) },
              {
                key: "state_type_description",
                label: "Estado CPE",
                render: (r) => (
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      String(r.state_type_id) === "11"
                        ? "bg-red-50 text-red-700"
                        : String(r.state_type_id) === "05"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {String(r.state_type_description ?? "")}
                  </span>
                ),
              },
              { key: "reference", label: "Referencia" },
            ]}
          />
        </>
      )}
    </div>
  );
}
