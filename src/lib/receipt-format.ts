/** Formato real SUNAT: T001-00000001, B001-00001167 (8 dígitos correlativo) */
export function formatReceiptNumber(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return s;
  if (/^PREVIEW/i.test(s)) return s;
  const m = s.match(/^([A-Z]+\d*)-(\d+)$/i);
  if (m) {
    return `${m[1].toUpperCase()}-${m[2].padStart(8, "0")}`;
  }
  const m2 = s.match(/^([A-Z]+\d*)(\d+)$/i);
  if (m2) {
    return `${m2[1].toUpperCase()}-${m2[2].padStart(8, "0")}`;
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
