"use client";

import type { ExportColumn } from "@/lib/export-list";
import { exportListCsv, exportListPdf } from "@/lib/export-list";

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearch?: () => void;
  placeholder?: string;
  exportFilename: string;
  exportTitle: string;
  exportRows: Record<string, unknown>[];
  exportColumns: ExportColumn[];
};

export function ListToolbar({
  search,
  onSearchChange,
  onSearch,
  placeholder = "Buscar...",
  exportFilename,
  exportTitle,
  exportRows,
  exportColumns,
}: ListToolbarProps) {
  return (
    <div className="ify-card ify-filter-bar mb-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <i className="bi bi-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            className="ify-input pl-8"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
          />
        </div>
        {onSearch ? (
          <button type="button" className="ify-btn-outline" onClick={onSearch}>
            <i className="bi bi-search" /> Buscar
          </button>
        ) : null}
        <button
          type="button"
          className="ify-btn-outline"
          onClick={() => exportListCsv(exportFilename, exportRows, exportColumns)}
        >
          <i className="bi bi-file-earmark-excel" /> Excel
        </button>
        <button
          type="button"
          className="ify-btn-outline"
          onClick={() => exportListPdf(exportTitle, exportRows, exportColumns)}
        >
          <i className="bi bi-file-earmark-pdf" /> PDF
        </button>
      </div>
    </div>
  );
}
