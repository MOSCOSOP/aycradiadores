/** Estilos compartidos para vista e impresión del comprobante (A4/A5) — debe coincidir con globals.css */
export const COMPROBANTE_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 8mm; color: #111; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-sheet { width: 100%; max-width: 210mm; margin: 0 auto; background: #fff; color: #111; }
  .doc-print-a5 { max-width: 148mm; font-size: 90%; }
  .doc-print-inner { padding: 5mm; }
  .doc-print-header { margin-bottom: 4px; }
  .doc-print-header-main { display: grid; grid-template-columns: 90px minmax(0, 1fr) 158px; gap: 2px 6px; align-items: center; }
  .doc-print-a5 .doc-print-header-main { grid-template-columns: 68px minmax(0, 1fr) 128px; gap: 2px 4px; }
  .doc-print-logo-wrap { flex-shrink: 0; width: 90px; text-align: center; }
  .doc-print-a5 .doc-print-logo-wrap { width: 68px; }
  .doc-print-header-center { min-width: 0; display: flex; flex-direction: column; align-items: stretch; justify-content: center; padding-top: 0; }
  .doc-print-titulo { display: block; width: 100%; height: auto; max-height: 24px; object-fit: contain; object-position: left center; margin: 0 0 1px; }
  .doc-print-a5 .doc-print-titulo { max-height: 18px; }
  .doc-print-header-brand-row { display: flex; align-items: center; justify-content: flex-start; gap: 10px; min-width: 0; }
  .doc-print-sello { height: 44px; width: auto; max-width: 96px; object-fit: contain; flex-shrink: 0; }
  .doc-print-a5 .doc-print-sello { height: 34px; max-width: 72px; }
  .doc-print-logo { width: 86px; height: 86px; object-fit: contain; display: block; margin: 0 auto; }
  .doc-print-a5 .doc-print-logo { width: 64px; height: 64px; }
  .doc-print-brand-center { flex: 1; min-width: 0; padding: 0; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
  .doc-print-brand-center .doc-print-meta { margin: 0; line-height: 1.2; text-align: center; }
  .doc-print-de-line { background: #e8f4fc; padding: 0 6px; border-radius: 3px; display: inline-block; }
  .doc-print-meta { font-size: 9px; margin: 1px 0; line-height: 1.35; color: #222; }
  .doc-print-email { color: #0d6efd; }
  .doc-print-docbox { width: 100%; max-width: 158px; flex-shrink: 0; border: 1px solid #888; border-radius: 6px; padding: 6px 5px; text-align: center; font-size: 9px; justify-self: end; align-self: center; }
  .doc-print-a5 .doc-print-docbox { max-width: 148px; font-size: 8px; padding: 6px 4px; }
  .doc-print-docbox p { margin: 2px 0; }
  .doc-print-doc-type { font-weight: 700; font-size: 8.5px; margin: 5px 0; line-height: 1.2; background: #c41e3a !important; color: #fff !important; padding: 5px 3px; word-break: break-word; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-a5 .doc-print-doc-type { font-size: 7px; padding: 4px 2px; }
  .doc-print-doc-number { font-weight: 700; font-size: 10px; }
  .doc-print-client-box { border: 1px solid #bbb; border-radius: 6px; padding: 5px 8px; display: grid; grid-template-columns: 1fr 160px; gap: 8px; font-size: 9px; margin-bottom: 5px; }
  .doc-print-client-box p { margin: 2px 0; }
  .doc-print-label { font-weight: 700; }
  .doc-print-inline-sep { margin-left: 12px; font-weight: 700; }
  .doc-print-client-right { text-align: right; align-self: start; }
  .doc-print-meta-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 5px; border: 1px solid #bbb; border-radius: 4px; overflow: hidden; }
  .doc-print-meta-table th, .doc-print-meta-table td { border: 1px solid #bbb; padding: 4px 5px; text-align: center; }
  .doc-print-meta-table th { background: #efefef !important; font-weight: 700; font-size: 7.5px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 5px; border: 1px solid #888; border-radius: 4px; overflow: hidden; }
  .doc-print-table thead th { background: #555 !important; color: #fff !important; font-weight: 700; padding: 5px 4px; text-align: center; border: 1px solid #555; font-size: 8px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table tbody td { border: 1px solid #ccc; padding: 4px 5px; vertical-align: top; }
  .doc-print-table .col-code { width: 62px; text-align: center; }
  .doc-print-table .col-qty { width: 38px; text-align: center; }
  .doc-print-table .col-unit { width: 42px; text-align: center; }
  .doc-print-table .col-desc { text-align: left; }
  .doc-print-table .col-price { width: 58px; text-align: right; }
  .doc-print-table .col-total { width: 62px; text-align: right; font-weight: 600; }
  .doc-print-summary-row { display: grid; grid-template-columns: 1fr 250px; gap: 10px; margin-bottom: 5px; font-size: 9px; }
  .doc-print-obs { min-height: 32px; }
  .doc-print-totals-table { width: 100%; border-collapse: separate; border-spacing: 0 3px; font-size: 9px; }
  .doc-print-totals-table th, .doc-print-totals-table td { border: 1px solid #bbb; padding: 4px 6px; }
  .doc-print-totals-table th { background: #d9d9d9 !important; text-align: left; font-weight: 700; width: 58%; border-radius: 4px 0 0 4px; border-right: none; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-totals-table td { text-align: right; border-radius: 0 4px 4px 0; background: #fff; }
  .doc-print-total-final-row th, .doc-print-total-final-row td { font-weight: 700; }
  .doc-print-total-final-row th { background: #c8c8c8 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-total-final-row td { background: #f3f3f3 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-words-box { border: 1px solid #bbb; border-radius: 6px; background: #efefef; padding: 4px 8px; font-size: 9px; margin-bottom: 5px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-bank-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 5px; border: 1px solid #bbb; border-radius: 4px; overflow: hidden; }
  .doc-print-bank-table th, .doc-print-bank-table td { border: 1px solid #bbb; padding: 4px 6px; text-align: center; }
  .doc-print-bank-table th { background: #efefef !important; font-weight: 700; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-legal-row { display: grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: start; margin-bottom: 5px; font-size: 8px; }
  .doc-print-detraction { border: 1px solid #bbb; padding: 6px 8px; min-height: 70px; border-radius: 4px; }
  .doc-print-qr-wrap { text-align: right; }
  .doc-print-qr { width: 100px; height: 100px; border: 1px solid #ccc; display: block; }
  .doc-print-representation { font-size: 7.5px; color: #555; line-height: 1.35; text-align: center; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; }
  .doc-print-hash { font-size: 7px; word-break: break-all; margin-top: 4px; color: #444; line-height: 1.2; }
  .doc-print-brands { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 8px 0 6px; padding: 0 8px; }
  .doc-print-brand-logo { height: 64px; width: auto; max-width: 22%; object-fit: contain; }
  .doc-print-a5 .doc-print-brand-logo { height: 48px; }
  .doc-print-service-footer { text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; line-height: 1.45; margin: 0; padding: 0 4px; }
  .doc-print-a5 .doc-print-service-footer { font-size: 8.5px; }
  .doc-print-guia-section { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; font-size: 9px; margin-bottom: 8px; }
  .doc-print-guia-section p { margin: 2px 0; }
`;

export function pageRuleForSize(pageSize: "A4" | "A5"): string {
  return pageSize === "A5"
    ? "@page { size: A5; margin: 6mm; }"
    : "@page { size: A4; margin: 8mm; }";
}
