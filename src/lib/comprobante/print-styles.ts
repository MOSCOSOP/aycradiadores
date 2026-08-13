/** Estilos compartidos para vista e impresión del comprobante (A4/A5) */
export const COMPROBANTE_PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 8mm; color: #111; background: #fff; }
  .doc-print-sheet { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; color: #111; }
  .doc-print-a5 { max-width: 148mm; font-size: 90%; }
  .doc-print-inner { padding: 6mm; }
  .doc-print-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
  .doc-print-logo-wrap { flex-shrink: 0; width: 78px; text-align: center; }
  .doc-print-logo { width: 72px; height: 72px; object-fit: contain; }
  .doc-print-brand-center { flex: 1; min-width: 0; }
  .doc-print-titulo { max-width: 100%; height: auto; max-height: 54px; object-fit: contain; margin-bottom: 4px; }
  .doc-print-meta { font-size: 9px; margin: 1px 0; line-height: 1.35; color: #222; }
  .doc-print-email { color: #0d6efd; }
  .doc-print-docbox { width: 178px; flex-shrink: 0; border: 1px solid #888; border-radius: 6px; padding: 8px 6px; text-align: center; font-size: 9px; }
  .doc-print-doc-type { font-weight: 700; font-size: 9.5px; margin: 5px 0; background: #d9d9d9; padding: 4px 2px; }
  .doc-print-doc-number { font-weight: 700; font-size: 10px; }
  .doc-print-client-box { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr 160px; gap: 8px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-label { font-weight: 700; }
  .doc-print-inline-sep { margin-left: 12px; font-weight: 700; }
  .doc-print-client-right { text-align: right; }
  .doc-print-meta-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 8px; }
  .doc-print-meta-table th, .doc-print-meta-table td { border: 1px solid #bbb; padding: 4px 5px; text-align: center; }
  .doc-print-meta-table th { background: #efefef; font-weight: 700; font-size: 7.5px; }
  .doc-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; }
  .doc-print-table thead th { background: #555; color: #fff; font-weight: 700; padding: 5px 4px; text-align: center; border: 1px solid #555; font-size: 8px; }
  .doc-print-table tbody td { border-bottom: 1px solid #ddd; padding: 4px 5px; }
  .doc-print-table .col-code, .doc-print-table .col-qty, .doc-print-table .col-unit { text-align: center; }
  .doc-print-table .col-price, .doc-print-table .col-total { text-align: right; }
  .doc-print-summary-row { display: grid; grid-template-columns: 1fr 250px; gap: 10px; margin-bottom: 8px; font-size: 9px; }
  .doc-print-totals-table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .doc-print-totals-table th, .doc-print-totals-table td { border: 1px solid #bbb; padding: 4px 6px; }
  .doc-print-totals-table th { background: #d9d9d9; text-align: left; font-weight: 700; width: 58%; }
  .doc-print-totals-table td { text-align: right; }
  .doc-print-total-final-row th, .doc-print-total-final-row td { font-weight: 700; background: #ececec; }
  .doc-print-words-box { border: 1px solid #bbb; border-radius: 4px; padding: 6px 8px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-bank-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 8px; }
  .doc-print-bank-table th, .doc-print-bank-table td { border: 1px solid #bbb; padding: 4px 6px; text-align: center; }
  .doc-print-bank-table th { background: #efefef; font-weight: 700; }
  .doc-print-legal-row { display: grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: start; margin-bottom: 8px; font-size: 8px; }
  .doc-print-detraction { border: 1px solid #bbb; padding: 6px 8px; min-height: 90px; }
  .doc-print-qr { width: 100px; height: 100px; border: 1px solid #ccc; }
  .doc-print-representation { font-size: 7.5px; color: #555; line-height: 1.35; text-align: center; }
  .doc-print-hash { font-size: 7px; word-break: break-all; margin-top: 4px; }
  .doc-print-brands { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 10px 0 6px; }
  .doc-print-brand-logo { height: 42px; width: auto; max-width: 24%; object-fit: contain; }
  .doc-print-service-footer { text-align: center; font-size: 8px; font-weight: 700; text-transform: uppercase; line-height: 1.35; margin: 0; }
`;

export function pageRuleForSize(pageSize: "A4" | "A5"): string {
  return pageSize === "A5"
    ? "@page { size: A5; margin: 6mm; }"
    : "@page { size: A4; margin: 8mm; }";
}
