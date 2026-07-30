import * as XLSX from "xlsx";

export type InventoryImportRow = {
  product: string;
  establishment: string;
  stock: number;
};

export function parseInventoryExcel(buffer: ArrayBuffer): InventoryImportRow[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1, defval: "" });

  let headerIdx = rows.findIndex(
    (r) => String(r[0]).toLowerCase() === "producto" && String(r[2]).toLowerCase().includes("stock")
  );
  if (headerIdx < 0) headerIdx = 6;

  const out: InventoryImportRow[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const product = String(row[0] ?? "").trim();
    if (!product) continue;
    const establishment = String(row[1] ?? "Oficina Principal").trim();
    const stock = Number(String(row[2] ?? "0").replace(",", ".")) || 0;
    out.push({ product, establishment, stock });
  }
  return out;
}
