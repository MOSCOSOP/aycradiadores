"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type ReportViewProps = {
  title: string;
  subtitle?: string;
  reportPath: string;
  columns: { key: string; label: string; render?: (r: Record<string, unknown>) => React.ReactNode }[];
};

export function ReportView({ title, subtitle, reportPath, columns }: ReportViewProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    api.reports.fetch(reportPath).then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  }, [reportPath]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [rows, search]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const keys = columns.map((c) => c.key);
    const header = columns.map((c) => c.label).join(",");
    const body = filtered
      .map((r) => keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportPath.replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        subtitle={subtitle ?? `${filtered.length} registros`}
        actions={
          <button type="button" className="ify-btn-outline text-xs" onClick={exportCsv} disabled={!filtered.length}>
            <i className="bi bi-download" /> Exportar CSV
          </button>
        }
      />
      <div className="ify-card mb-3 p-3">
        <input
          className="ify-input"
          placeholder="Buscar en el reporte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable loading={loading} rows={filtered} columns={columns} />
    </div>
  );
}
