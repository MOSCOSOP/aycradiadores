import { COMPANY_INFO, COMPROBANTE_ASSETS } from "@/lib/company-info";
import { guideTypeLabel } from "@/lib/dispatch-fields";
import type { DispatchExtraData } from "@/lib/dispatch-fields";

export type GuiaPrintData = {
  number: string;
  guide_type: string;
  date_of_issue: string;
  date_of_transfer?: string;
  customer_name?: string;
  transfer_reason?: string;
  origin_address?: string;
  dest_address?: string;
  vehicle_plate?: string;
  driver_name?: string;
  driver_document?: string;
  total_weight?: number;
  unit_measure?: string;
  package_count?: number;
  purchase_order?: string;
  observations?: string;
  mode_transport?: string;
  extra?: DispatchExtraData;
  items: { description: string; quantity: number; unit_type_id?: string }[];
};

export function buildGuiaPrintData(doc: Record<string, unknown>): GuiaPrintData {
  const extra = (doc.extra_data ?? doc.extraData ?? {}) as DispatchExtraData;
  return {
    number: String(doc.number ?? ""),
    guide_type: String(doc.guide_type ?? doc.guideType ?? "09"),
    date_of_issue: String(doc.date_of_issue ?? doc.date ?? ""),
    date_of_transfer: doc.date_of_transfer ? String(doc.date_of_transfer) : undefined,
    customer_name: String(doc.customer_name ?? extra.recipient_name ?? ""),
    transfer_reason: String(doc.transfer_reason ?? ""),
    origin_address: String(doc.origin_address ?? ""),
    dest_address: String(doc.dest_address ?? ""),
    vehicle_plate: String(doc.vehicle_plate ?? doc.plate ?? ""),
    driver_name: String(doc.driver_name ?? ""),
    driver_document: String(doc.driver_document ?? ""),
    total_weight: Number(doc.total_weight ?? 0),
    unit_measure: String(doc.unit_measure ?? "KGM"),
    package_count: Number(doc.package_count ?? 0),
    purchase_order: doc.purchase_order ? String(doc.purchase_order) : undefined,
    observations: doc.observations ? String(doc.observations) : undefined,
    mode_transport: String(doc.mode_transport ?? ""),
    extra,
    items: ((doc.items as Record<string, unknown>[]) ?? []).map((i) => ({
      description: String(i.description ?? ""),
      quantity: Number(i.quantity ?? 0),
      unit_type_id: String(i.unit_type_id ?? i.unitTypeId ?? "NIU"),
    })),
  };
}

export const GUIA_PRINT_CSS = `
  * { box-sizing: border-box; }
  html, body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 8mm; color: #111; background: #fff; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .guia-print-sheet { width: 100%; max-width: 210mm; margin: 0 auto; }
  .guia-print-header { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .guia-print-header-title { width: 100%; text-align: center; padding-right: 182px; }
  .guia-print-header-body { display: grid; grid-template-columns: minmax(168px, auto) minmax(0, 1fr) 182px; gap: 8px; align-items: start; }
  .guia-print-logo { width: 96px; height: 96px; object-fit: contain; }
  .guia-print-titulo { display: block; max-height: 70px; margin: 0 auto; object-fit: contain; }
  .guia-print-docbox { border: 1px solid #888; border-radius: 6px; padding: 8px 6px; text-align: center; font-size: 9px; }
  .guia-print-doc-type { font-weight: 700; font-size: 8px; line-height: 1.2; background: #c41e3a !important; color: #fff !important; padding: 5px 3px; word-break: break-word; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .guia-print-meta-table { width: 100%; border-collapse: collapse; font-size: 8px; margin-bottom: 8px; }
  .guia-print-meta-table th, .guia-print-meta-table td { border: 1px solid #bbb; padding: 4px 5px; }
  .guia-print-meta-table th { background: #efefef !important; font-weight: 700; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .guia-print-table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 8px; }
  .guia-print-table thead th { background: #555 !important; color: #fff !important; padding: 5px 4px; border: 1px solid #555; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .guia-print-table tbody td { border-bottom: 1px solid #ddd; padding: 4px 5px; }
  .guia-print-section { border: 1px solid #bbb; border-radius: 6px; padding: 8px 10px; font-size: 9px; margin-bottom: 8px; }
  .guia-print-section p { margin: 2px 0; }
  .guia-print-label { font-weight: 700; }
`;

export function pageRuleForGuia(pageSize: "A4" | "A5"): string {
  return pageSize === "A5" ? "@page { size: A5; margin: 6mm; }" : "@page { size: A4; margin: 8mm; }";
}

export function printGuia(elementId = "doc-print-area", pageSize: "A4" | "A5" = "A4") {
  const el = document.getElementById(elementId);
  if (!el) {
    alert("No se encontró la plantilla de impresión.");
    return;
  }
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Permite ventanas emergentes para imprimir la guía.");
    return;
  }
  const html = el.outerHTML;
  const css = `${GUIA_PRINT_CSS} ${pageRuleForGuia(pageSize)}`;
  w.document.open();
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Guía</title><style>${css}</style></head><body>${html}</body></html>`);
  w.document.close();
  w.onload = () => w.print();
  setTimeout(() => w.print(), 800);
}
