import { COMPANY_INFO } from "@/lib/company-info";
import { buildSunatQrPayload } from "@/lib/comprobante/sunat-qr";
import { formatReceiptNumber } from "@/lib/receipt-format";
import type { DispatchExtraData } from "@/lib/dispatch-fields";
import { printDocument } from "@/lib/comprobante/print-document";

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

export function buildGuiaQrPayload(input: {
  guideType: string;
  number: string;
  dateOfIssue: string;
  customerNumber?: string;
}): string {
  return buildSunatQrPayload({
    ruc: COMPANY_INFO.ruc,
    documentTypeId: input.guideType === "31" ? "31" : "09",
    number: input.number,
    totalIgv: 0,
    total: 0,
    dateOfIssue: input.dateOfIssue,
    customerNumber: input.customerNumber || "00000000",
  });
}

export function printGuia(elementId = "doc-print-area", pageSize: "A4" | "A5" = "A4") {
  printDocument(elementId, pageSize);
}

export { formatReceiptNumber };
