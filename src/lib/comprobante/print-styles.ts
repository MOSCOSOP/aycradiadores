/** Estilos compartidos para vista e impresión del comprobante (A4/A5) — debe coincidir con globals.css */
export const COMPROBANTE_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 8mm; color: #111; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-sheet { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; color: #111; }
  .doc-print-a5 { max-width: 148mm; font-size: 90%; }
  .doc-print-inner { padding: 6mm; }
  .doc-print-header { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
  .doc-print-header-title { width: 100%; display: flex; justify-content: center; align-items: center; text-align: center; }
  .doc-print-header-body { display: grid; grid-template-columns: minmax(168px, auto) minmax(0, 1fr) 182px; gap: 8px; align-items: start; }
  .doc-print-a5 .doc-print-header-body { grid-template-columns: minmax(140px, auto) minmax(0, 1fr) 148px; gap: 5px; }
  .doc-print-header-left { display: flex; align-items: flex-start; gap: 4px; flex-shrink: 0; }
  .doc-print-logo-wrap { flex-shrink: 0; width: 100px; text-align: center; }
  .doc-print-logo { width: 96px; height: 96px; object-fit: contain; display: block; margin: 0 auto; }
  .doc-print-sello-wrap { flex-shrink: 0; width: 72px; display: flex; align-items: center; justify-content: center; padding-top: 8px; }
  .doc-print-sello { width: 68px; height: auto; max-height: 72px; object-fit: contain; }
  .doc-print-brand-center { min-width: 0; max-width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center; overflow: hidden; padding-right: 4px; }
  .doc-print-titulo { display: block; width: auto; max-width: 100%; height: auto; max-height: 70px; object-fit: contain; margin: 0 auto; }
  .doc-print-a5 .doc-print-titulo { max-height: 56px; }
  .doc-print-meta { font-size: 9px; margin: 1px 0; line-height: 1.35; color: #222; }
  .doc-print-contact-box { border: 1px solid #ccc; border-radius: 4px; background: #f5f5f5; padding: 4px 8px; margin: 2px 0 4px; font-size: 9px; }
  .doc-print-email { color: #0d6efd; }
  .doc-print-docbox { width: 100%; max-width: 182px; flex-shrink: 0; border: 1px solid #888; border-radius: 6px; padding: 8px 6px; text-align: center; font-size: 9px; justify-self: end; }
  .doc-print-a5 .doc-print-docbox { max-width: 148px; font-size: 8px; padding: 6px 4px; }
  .doc-print-docbox p { margin: 2px 0; }
  .doc-print-doc-type { font-weight: 700; font-size: 8.5px; margin: 5px 0; line-height: 1.2; background: #c41e3a !important; color: #fff !important; padding: 5px 3px; word-break: break-word; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-a5 .doc-print-doc-type { font-size: 7px; padding: 4px 2px; }
  .doc-print-doc-number { font-weight: 700; font-size: 10px; }
  .doc-print-client-box { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr 160px; gap: 8px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-client-box p { margin: 2px 0; }
  .doc-print-label { font-weight: 700; }
  .doc-print-inline-sep { margin-left: 12px; font-weight: 700; }
  .doc-print-client-right { text-align: right; align-self: start; }
  .doc-print-meta-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 8px; }
  .doc-print-meta-table th, .doc-print-meta-table td { border: 1px solid #bbb; padding: 4px 5px; text-align: center; }
  .doc-print-meta-table th { background: #efefef !important; font-weight: 700; font-size: 7.5px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; }
  .doc-print-table thead th { background: #555 !important; color: #fff !important; font-weight: 700; padding: 5px 4px; text-align: center; border: 1px solid #555; font-size: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table tbody td { border-bottom: 1px solid #ddd; padding: 4px 5px; vertical-align: top; }
  .doc-print-table .col-code { width: 62px; text-align: center; }
  .doc-print-table .col-qty { width: 38px; text-align: center; }
  .doc-print-table .col-unit { width: 42px; text-align: center; }
  .doc-print-table .col-desc { text-align: left; }
  .doc-print-table .col-price { width: 58px; text-align: right; }
  .doc-print-table .col-total { width: 62px; text-align: right; font-weight: 600; }
  .doc-print-summary-row { display: grid; grid-template-columns: 1fr 250px; gap: 10px; margin-bottom: 8px; font-size: 9px; }
  .doc-print-obs { min-height: 48px; }
  .doc-print-totals-table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .doc-print-totals-table th, .doc-print-totals-table td { border: 1px solid #bbb; padding: 4px 6px; }
  .doc-print-totals-table th { background: #d9d9d9 !important; text-align: left; font-weight: 700; width: 58%; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-totals-table td { text-align: right; }
  .doc-print-total-final-row th, .doc-print-total-final-row td { font-weight: 700; background: #ececec !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-words-box { border: 1px solid #bbb; border-radius: 4px; padding: 6px 8px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-bank-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 8px; }
  .doc-print-bank-table th, .doc-print-bank-table td { border: 1px solid #bbb; padding: 4px 6px; text-align: center; }
  .doc-print-bank-table th { background: #efefef !important; font-weight: 700; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-legal-row { display: grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: start; margin-bottom: 8px; font-size: 8px; }
  .doc-print-detraction { border: 1px solid #bbb; padding: 6px 8px; min-height: 90px; }
  .doc-print-qr-wrap { text-align: right; }
  .doc-print-qr { width: 100px; height: 100px; border: 1px solid #ccc; display: block; }
  .doc-print-representation { font-size: 7.5px; color: #555; line-height: 1.35; text-align: center; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; }
  .doc-print-hash { font-size: 7px; word-break: break-all; margin-top: 4px; color: #444; line-height: 1.2; }
  .doc-print-brands { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 12px 0 8px; padding: 0 4px; }
  .doc-print-brand-logo { height: 72px; width: auto; max-width: 23%; object-fit: contain; }
  .doc-print-service-footer { text-align: center; font-size: 8px; font-weight: 700; text-transform: uppercase; line-height: 1.35; margin: 0; }
  .doc-print-guia-section { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-guia-section p { margin: 2px 0; }
`;

export function pageRuleForSize(pageSize: "A4" | "A5"): string {
  return pageSize === "A5"
    ? "@page { size: A5; margin: 6mm; }"
    : "@page { size: A4; margin: 8mm; }";
}
