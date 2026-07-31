/** Formato tipo plantilla: B001-00001128, F001-00000169 */
export function formatReceiptNumber(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return s;
  const m = s.match(/^([A-Z]+\d*)-(\d+)$/i);
  if (m) {
    return `${m[1].toUpperCase()}-${m[2].padStart(8, "0")}`;
  }
  if (/^\d+$/.test(s)) return s.padStart(8, "0");
  return s;
}

export function documentLabel(kind: string): string {
  if (kind === "factura") return "FACTURA ELECTRÓNICA";
  if (kind === "boleta") return "BOLETA DE VENTA ELECTRÓNICA";
  if (kind === "sale_note") return "NOTA DE VENTA";
  if (kind === "quotation") return "COTIZACIÓN";
  return "COMPROBANTE";
}
