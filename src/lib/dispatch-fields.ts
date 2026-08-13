export type DispatchLineItem = {
  id: number;
  description: string;
  quantity: number;
  unit_type_id: string;
};

export type DispatchExtraData = {
  freight_payer_id?: string;
  freight_payer_name?: string;
  subcontractor_id?: string;
  subcontractor_name?: string;
  sender_id?: string;
  sender_name?: string;
  sender_document?: string;
  recipient_id?: string;
  recipient_name?: string;
  recipient_document?: string;
  vehicle_id?: string;
  vehicle_label?: string;
  driver_id?: string;
  driver_label?: string;
  secondary_vehicle_id?: string;
  secondary_vehicle_label?: string;
  secondary_driver_id?: string;
  secondary_driver_label?: string;
  origin_point_id?: string;
  origin_point_label?: string;
  dest_point_id?: string;
  dest_point_label?: string;
  related_guides?: string[];
};

export type DispatchFormState = {
  establishment_id: number;
  series_id: number;
  date_of_issue: string;
  date_of_transfer: string;
  unit_measure: string;
  total_weight: string;
  package_count: string;
  purchase_order: string;
  observations: string;
  related_guides: string;
  customer_id: number;
  transfer_reason: string;
  mode_transport: string;
  origin_address: string;
  dest_address: string;
  vehicle_plate: string;
  driver_name: string;
  driver_document: string;
  extra: DispatchExtraData;
};

export const UNIT_MEASURES = [
  { id: "KGM", label: "KGM — Kilogramo" },
  { id: "TNE", label: "TNE — Tonelada" },
  { id: "NIU", label: "NIU — Unidad" },
];

export const TRANSPORT_MODES = [
  { id: "01", label: "Transporte público" },
  { id: "02", label: "Transporte privado" },
];

export const TRANSFER_REASONS = [
  "Venta",
  "Traslado entre establecimientos",
  "Consignación",
  "Devolución",
  "Importación",
  "Exportación",
  "Otros",
];

export function emptyDispatchExtra(): DispatchExtraData {
  return {};
}

export function emptyDispatchForm(today: string, origin = ""): DispatchFormState {
  return {
    establishment_id: 0,
    series_id: 0,
    date_of_issue: today,
    date_of_transfer: today,
    unit_measure: "KGM",
    total_weight: "0",
    package_count: "0",
    purchase_order: "",
    observations: "",
    related_guides: "",
    customer_id: 0,
    transfer_reason: "Venta",
    mode_transport: "02",
    origin_address: origin,
    dest_address: "",
    vehicle_plate: "",
    driver_name: "",
    driver_document: "",
    extra: emptyDispatchExtra(),
  };
}

export function dispatchFormToPayload(form: DispatchFormState, items: DispatchLineItem[], guideType: "09" | "31") {
  const related = form.related_guides
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    guide_type: guideType,
    establishment_id: form.establishment_id || undefined,
    series_id: form.series_id || undefined,
    customer_id: form.customer_id,
    date_of_issue: form.date_of_issue,
    date_of_transfer: form.date_of_transfer,
    unit_measure: form.unit_measure,
    total_weight: Number(form.total_weight || 0),
    package_count: Number(form.package_count || 0),
    purchase_order: form.purchase_order || undefined,
    observations: form.observations || undefined,
    transfer_reason: form.transfer_reason,
    mode_transport: form.mode_transport,
    origin_address: form.origin_address,
    dest_address: form.dest_address,
    vehicle_plate: form.vehicle_plate.toUpperCase(),
    driver_name: form.driver_name,
    driver_document: form.driver_document,
    extra_data: {
      ...form.extra,
      related_guides: related.length ? related : undefined,
    },
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unit_type_id: i.unit_type_id,
    })),
  };
}

export function guideTypeLabel(type: string): string {
  if (type === "31") return "GUÍA DE REMISIÓN TRANSPORTISTA ELECTRÓNICA";
  return "GUÍA DE REMISIÓN REMITENTE ELECTRÓNICA";
}
