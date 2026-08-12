import { downloadCsv } from "@/lib/download-csv";

export type ExportColumn = { key: string; label: string };

export function rowsForExport(
  rows: Record<string, unknown>[],
  columns: ExportColumn[]
): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) {
      out[col.label] = row[col.key] ?? "";
    }
    return out;
  });
}

export function exportListCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns: ExportColumn[]
) {
  if (!rows.length) {
    alert("Sin datos para exportar");
    return;
  }
  downloadCsv(filename, rowsForExport(rows, columns));
}

export function exportListPdf(
  title: string,
  rows: Record<string, unknown>[],
  columns: ExportColumn[]
) {
  if (!rows.length) {
    alert("Sin datos para exportar");
    return;
  }
  const head = columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${String(r[c.key] ?? "").replace(/</g, "&lt;")}</td>`).join("")}</tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
th{background:#2493d8;color:#fff}</style></head><body>
<h1>${title}</h1><p style="font-size:11px;color:#666">${new Date().toLocaleString("es-PE")}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    alert("Permite ventanas emergentes para exportar PDF");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
