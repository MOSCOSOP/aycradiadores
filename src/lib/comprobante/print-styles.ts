/** Estilos compartidos para vista e impresión del comprobante (A4/A5) — debe coincidir con globals.css */
export const COMPROBANTE_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-sheet { width: 210mm; max-width: 210mm; margin: 0 auto; background: #fff; color: #111; }
  .doc-print-a5 { width: 148mm; max-width: 148mm; font-size: 90%; }
  .doc-print-inner { padding: 5mm; }
  .doc-print-a5 .doc-print-inner { padding: 4mm; }
  .doc-print-header { margin-bottom: 6px; }
  .doc-print-header-main { position: relative; display: grid; grid-template-columns: 108px minmax(0, 1fr) 162px; gap: 0 4px; align-items: center; }
  .doc-print-a5 .doc-print-header-main { grid-template-columns: 78px minmax(0, 1fr) 132px; gap: 0 3px; }
  .doc-print-header-left { display: flex; flex-direction: row; align-items: center; gap: 0; flex-shrink: 0; }
  .doc-print-logo-wrap { width: 108px; text-align: center; line-height: 0; }
  .doc-print-a5 .doc-print-logo-wrap { width: 78px; }
  .doc-print-sello { position: absolute; left: calc(108px + 7mm); top: calc(58% + 2mm); transform: translateY(-50%); height: 52px; width: auto; max-width: 108px; object-fit: contain; z-index: 1; pointer-events: none; }
  .doc-print-a5 .doc-print-sello { left: calc(78px + 4mm); top: calc(58% + 2mm); height: 38px; max-width: 80px; }
  .doc-print-header-center { min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-align: center; }
  .doc-print-titulo { display: block; width: auto; max-width: 100%; height: auto; max-height: 32px; object-fit: contain; object-position: center center; margin: 0 auto; }
  .doc-print-a5 .doc-print-titulo { max-height: 24px; }
  .doc-print-contact { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0; min-width: 0; }
  .doc-print-contact .doc-print-meta { margin: 0; line-height: 1.35; text-align: center; font-size: 11.5px; font-weight: 700; color: #111; }
  .doc-print-contact .doc-print-phone { color: #1d4ed8; }
  .doc-print-contact .doc-print-email { color: #1d4ed8; }
  .doc-print-contact .doc-print-address { padding-left: 1.4em; }
  .doc-print-logo { width: 104px; height: 104px; object-fit: contain; display: block; margin: 0 auto; }
  .doc-print-a5 .doc-print-logo { width: 74px; height: 74px; }
  .doc-print-meta { font-size: 10.5px; margin: 1px 0; line-height: 1.35; color: #222; }
  .doc-print-email { color: #0d6efd; }
  .doc-print-docbox { width: 100%; max-width: 162px; flex-shrink: 0; border: 1px solid #888; border-radius: 6px; padding: 6px 5px; text-align: center; font-size: 10.5px; justify-self: end; align-self: center; }
  .doc-print-a5 .doc-print-docbox { max-width: 132px; font-size: 9px; padding: 5px 3px; }
  .doc-print-docbox p { margin: 2px 0; }
  .doc-print-doc-type { font-weight: 700; font-size: 9.5px; margin: 5px 0; line-height: 1.2; background: #c41e3a !important; color: #fff !important; padding: 5px 3px; word-break: break-word; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-a5 .doc-print-doc-type { font-size: 8px; padding: 4px 2px; }
  .doc-print-doc-number { font-weight: 700; font-size: 11.5px; }
  .doc-print-client-box { border: 1px solid #bbb; border-radius: 10px; padding: 6px 10px; display: grid; grid-template-columns: 1fr 160px; gap: 8px; font-size: 10.5px; margin-bottom: 6px; }
  .doc-print-client-box p { margin: 2px 0; }
  .doc-print-label { font-weight: 700; }
  .doc-print-inline-sep { margin-left: 12px; font-weight: 700; }
  .doc-print-client-right { text-align: right; align-self: start; }
  .doc-print-meta-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #bbb; border-radius: 10px; overflow: hidden; }
  .doc-print-meta-table th, .doc-print-meta-table td { border-right: 1px solid #bbb; border-bottom: 1px solid #bbb; padding: 4px 5px; text-align: center; }
  .doc-print-meta-table th:last-child, .doc-print-meta-table td:last-child { border-right: none; }
  .doc-print-meta-table tbody tr:last-child td { border-bottom: none; }
  .doc-print-meta-table th:first-child { border-top-left-radius: 9px; }
  .doc-print-meta-table th:last-child { border-top-right-radius: 9px; }
  .doc-print-meta-table tbody tr:last-child td:first-child { border-bottom-left-radius: 9px; }
  .doc-print-meta-table tbody tr:last-child td:last-child { border-bottom-right-radius: 9px; }
  .doc-print-meta-table th { background: #efefef !important; font-weight: 700; font-size: 8.5px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10.5px; margin-bottom: 6px; border: 1px solid #888; border-radius: 10px; overflow: hidden; }
  .doc-print-table thead th { background: #555 !important; color: #fff !important; font-weight: 700; padding: 6px 4px; text-align: center; border-right: 1px solid #666; font-size: 9px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-table thead th:last-child { border-right: none; }
  .doc-print-table thead th:first-child { border-top-left-radius: 9px; }
  .doc-print-table thead th:last-child { border-top-right-radius: 9px; }
  .doc-print-table tbody td { border-right: 1px solid #ccc; border-top: 1px solid #ccc; padding: 5px 5px; vertical-align: top; }
  .doc-print-table tbody td:last-child { border-right: none; }
  .doc-print-table tbody tr:last-child td:first-child { border-bottom-left-radius: 9px; }
  .doc-print-table tbody tr:last-child td:last-child { border-bottom-right-radius: 9px; }
  .doc-print-table .col-code { width: 62px; text-align: center; }
  .doc-print-table .col-qty { width: 38px; text-align: center; }
  .doc-print-table .col-unit { width: 42px; text-align: center; }
  .doc-print-table .col-desc { text-align: left; }
  .doc-print-table .col-price { width: 58px; text-align: right; }
  .doc-print-table .col-total { width: 62px; text-align: right; font-weight: 600; }
  .doc-print-summary-row { display: grid; grid-template-columns: 1fr 250px; gap: 10px; margin-bottom: 5px; font-size: 10.5px; }
  .doc-print-obs { min-height: 32px; }
  .doc-print-totals-table { width: 100%; border-collapse: separate; border-spacing: 0 3px; font-size: 10.5px; }
  .doc-print-totals-table th, .doc-print-totals-table td { border: 1px solid #bbb; padding: 4px 6px; }
  .doc-print-totals-table th { background: #d9d9d9 !important; text-align: left; font-weight: 700; width: 58%; border-radius: 8px 0 0 8px; border-right: none; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-totals-table td { text-align: right; border-radius: 0 8px 8px 0; background: #fff; }
  .doc-print-total-final-row th, .doc-print-total-final-row td { font-weight: 700; }
  .doc-print-total-final-row th { background: #c8c8c8 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-total-final-row td { background: #f3f3f3 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-words-box { border: 1px solid #bbb; border-radius: 10px; background: #efefef; padding: 5px 10px; font-size: 10.5px; margin-bottom: 6px; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-bank-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 9.5px; margin-bottom: 6px; border: 1px solid #bbb; border-radius: 10px; overflow: hidden; }
  .doc-print-bank-table th, .doc-print-bank-table td { border-right: 1px solid #bbb; border-bottom: 1px solid #bbb; padding: 4px 6px; text-align: center; }
  .doc-print-bank-table th:last-child, .doc-print-bank-table td:last-child { border-right: none; }
  .doc-print-bank-table tbody tr:last-child td { border-bottom: none; }
  .doc-print-bank-table th:first-child { border-top-left-radius: 9px; }
  .doc-print-bank-table th:last-child { border-top-right-radius: 9px; }
  .doc-print-bank-table tbody tr:last-child td:first-child { border-bottom-left-radius: 9px; }
  .doc-print-bank-table tbody tr:last-child td:last-child { border-bottom-right-radius: 9px; }
  .doc-print-bank-table th { background: #efefef !important; font-weight: 700; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .doc-print-legal-row { display: grid; grid-template-columns: 1fr 120px; gap: 10px; align-items: start; margin-bottom: 5px; font-size: 9px; }
  .doc-print-detraction { border: 1px solid #bbb; padding: 6px 8px; min-height: 70px; border-radius: 10px; }
  .doc-print-qr-wrap { text-align: right; }
  .doc-print-qr { width: 100px; height: 100px; border: 1px solid #ccc; display: block; }
  .doc-print-representation { font-size: 8.5px; color: #555; line-height: 1.35; text-align: center; border-top: 1px solid #ccc; padding-top: 6px; margin-top: 6px; }
  .doc-print-hash { font-size: 8px; word-break: break-all; margin-top: 4px; color: #444; line-height: 1.2; }
  .doc-print-brands { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 10px 0 8px; padding: 0 4px; }
  .doc-print-brand-logo { height: 92px; width: auto; max-width: 23%; object-fit: contain; }
  .doc-print-a5 .doc-print-brand-logo { height: 70px; }
  .doc-print-service-footer { text-align: center; font-size: 11.5px; font-weight: 700; text-transform: uppercase; line-height: 1.45; margin: 0; padding: 0 4px; }
  .doc-print-a5 .doc-print-service-footer { font-size: 9.5px; }
  .doc-print-guia-section { border: 1px solid #bbb; border-radius: 10px; padding: 8px 10px; font-size: 10.5px; margin-bottom: 8px; }
  .doc-print-guia-section p { margin: 2px 0; }
`;

export function pageRuleForSize(pageSize: "A4" | "A5"): string {
  return pageSize === "A5"
    ? "@page { size: A5; margin: 6mm; }"
    : "@page { size: A4; margin: 8mm; }";
}
