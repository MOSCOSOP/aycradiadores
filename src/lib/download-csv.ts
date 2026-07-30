export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert("Sin datos para exportar");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) =>
    headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
