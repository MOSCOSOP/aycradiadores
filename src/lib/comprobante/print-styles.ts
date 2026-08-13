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
  .doc-print-brand-center { flex: 1; min-width: 0; padding-top: 2px; }
  .doc-print-company { font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.02em; }
  .doc-print-meta { font-size: 9px; margin: 1px 0; line-height: 1.35; color: #222; }
  .doc-print-docbox { width: 178px; flex-shrink: 0; border: 1px solid #888; border-radius: 6px; padding: 8px 6px; text-align: center; font-size: 9px; }
  .doc-print-docbox p { margin: 2px 0; }
  .doc-print-doc-type { font-weight: 700; font-size: 9.5px; margin: 5px 0 !important; line-height: 1.25; }
  .doc-print-doc-number { font-weight: 700; font-size: 10px; }
  .doc-print-client-box { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr 160px; gap: 8px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-client-box p { margin: 2px 0; }
  .doc-print-client-right { text-align: right; align-self: start; }
  .doc-print-label { font-weight: 700; }
  .doc-print-meta-bar { display: grid; grid-template-columns: repeat(6, 1fr); border: 1px solid #bbb; border-radius: 4px; overflow: hidden; font-size: 8px; margin-bottom: 8px; }
  .doc-print-meta-cell { padding: 5px 6px; border-right: 1px solid #ccc; }
  .doc-print-meta-cell:last-child { border-right: none; }
  .doc-print-meta-cell .lbl { display: block; font-weight: 700; margin-bottom: 2px; font-size: 7.5px; text-transform: uppercase; }
  .doc-print-meta-cell .val { display: block; font-size: 8.5px; }
  .doc-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; }
  .doc-print-table thead th { background: #555; color: #fff; font-weight: 700; padding: 5px 4px; text-align: center; border: 1px solid #555; font-size: 8px; }
  .doc-print-table tbody td { border-bottom: 1px solid #ddd; padding: 4px 5px; vertical-align: top; }
  .doc-print-table .col-code { width: 62px; text-align: center; }
  .doc-print-table .col-qty { width: 38px; text-align: center; }
  .doc-print-table .col-unit { width: 42px; text-align: center; }
  .doc-print-table .col-desc { text-align: left; }
  .doc-print-table .col-price { width: 58px; text-align: right; }
  .doc-print-table .col-total { width: 62px; text-align: right; font-weight: 600; }
  .doc-print-bottom { display: flex; gap: 12px; align-items: flex-start; margin-top: 4px; }
  .doc-print-qr-block { flex-shrink: 0; width: 110px; }
  .doc-print-qr { width: 100px; height: 100px; border: 1px solid #ccc; display: block; }
  .doc-print-hash { font-size: 7px; word-break: break-all; margin-top: 4px; color: #444; line-height: 1.2; }
  .doc-print-totals-wrap { flex: 1; display: flex; justify-content: flex-end; }
  .doc-print-totals { width: 240px; font-size: 9px; border: 1px solid #bbb; border-radius: 4px; overflow: hidden; }
  .doc-print-total-row { display: flex; justify-content: space-between; padding: 4px 8px; border-bottom: 1px solid #eee; }
  .doc-print-total-row:last-child { border-bottom: none; }
  .doc-print-total-final { background: #f3f3f3; font-size: 11px; font-weight: 700; }
  .doc-print-words { font-size: 9px; margin: 8px 0 6px; font-style: italic; }
  .doc-print-bank { font-size: 8px; line-height: 1.4; margin-bottom: 6px; }
  .doc-print-representation { font-size: 7.5px; color: #555; line-height: 1.35; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; text-align: center; }
  .text-right { text-align: right; }
`;

export function pageRuleForSize(pageSize: "A4" | "A5"): string {
  return pageSize === "A5"
    ? "@page { size: A5; margin: 6mm; }"
    : "@page { size: A4; margin: 8mm; }";
}
