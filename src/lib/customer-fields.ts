import type { CustomerFormData } from "@/components/customers/CustomerFormFields";

export type CustomerVehicle = {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  /** Foto referencial (no es la foto real del auto del cliente) traída al buscar la placa. */
  image_url?: string;
};

export type CustomerExtraData = {
  trade_name: string;
  country: string;
  ubigeo: string;
  credit_days: string;
  internal_code: string;
  barcode: string;
  nationality: string;
  seller_id: string;
  zone: string;
  observations: string;
  google_maps: string;
  contact_name: string;
  contact_phone: string;
  contact_document: string;
  apply_retention: boolean;
  secondary_address: string;
  secondary_phone: string;
  delivery_reference: string;
  guarantor_name: string;
  guarantor_document: string;
  guarantor_phone: string;
  guarantor_address: string;
  has_vehicle: boolean;
  vehicles: CustomerVehicle[];
};

export const emptyCustomerExtra: CustomerExtraData = {
  trade_name: "",
  country: "PERÚ",
  ubigeo: "",
  credit_days: "0",
  internal_code: "",
  barcode: "",
  nationality: "PERÚ",
  seller_id: "",
  zone: "",
  observations: "",
  google_maps: "",
  contact_name: "",
  contact_phone: "",
  contact_document: "",
  apply_retention: false,
  secondary_address: "",
  secondary_phone: "",
  delivery_reference: "",
  guarantor_name: "",
  guarantor_document: "",
  guarantor_phone: "",
  guarantor_address: "",
  has_vehicle: false,
  vehicles: [],
};

export function customerRowToForm(row: Record<string, unknown>): CustomerFormData {
  return {
    identity_document_type_id: String(row.identity_document_type_id || "6"),
    number: String(row.number || ""),
    name: String(row.name || ""),
    verification_code: String(row.verification_code || ""),
    sex: String(row.sex || ""),
    birth_date: String(row.birth_date || ""),
    address: String(row.address || ""),
    telephone: String(row.telephone || ""),
    email: String(row.email || ""),
  };
}

export function customerRowToExtra(row: Record<string, unknown>): CustomerExtraData {
  return {
    trade_name: String(row.trade_name || ""),
    country: String(row.country || "PERÚ"),
    ubigeo: String(row.ubigeo || ""),
    credit_days: String(row.credit_days ?? "0"),
    internal_code: String(row.internal_code || ""),
    barcode: String(row.barcode || ""),
    nationality: String(row.nationality || "PERÚ"),
    seller_id: String(row.seller_id || ""),
    zone: String(row.zone || ""),
    observations: String(row.observations || ""),
    google_maps: String(row.google_maps || ""),
    contact_name: String(row.contact_name || ""),
    contact_phone: String(row.contact_phone || ""),
    contact_document: String(row.contact_document || ""),
    apply_retention: Boolean(row.apply_retention),
    secondary_address: String(row.secondary_address || ""),
    secondary_phone: String(row.secondary_phone || ""),
    delivery_reference: String(row.delivery_reference || ""),
    guarantor_name: String(row.guarantor_name || ""),
    guarantor_document: String(row.guarantor_document || ""),
    guarantor_phone: String(row.guarantor_phone || ""),
    guarantor_address: String(row.guarantor_address || ""),
    has_vehicle: Boolean(row.has_vehicle),
    vehicles: parseVehicles(row.vehicles),
  };
}

function parseVehicles(raw: unknown): CustomerVehicle[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => ({
      plate: String((v as CustomerVehicle).plate || ""),
      brand: String((v as CustomerVehicle).brand || ""),
      model: String((v as CustomerVehicle).model || ""),
      year: String((v as CustomerVehicle).year || ""),
      color: String((v as CustomerVehicle).color || ""),
      image_url: (v as CustomerVehicle).image_url ? String((v as CustomerVehicle).image_url) : undefined,
    }));
  }
  if (typeof raw === "string" && raw.trim()) {
    try {
      return parseVehicles(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  return [];
}

export function buildCustomerPayload(form: CustomerFormData, extra: CustomerExtraData) {
  return {
    ...form,
    trade_name: extra.trade_name,
    country: extra.country,
    ubigeo: extra.ubigeo,
    credit_days: Number(extra.credit_days || 0),
    internal_code: extra.internal_code,
    barcode: extra.barcode,
    nationality: extra.nationality,
    seller_id: extra.seller_id,
    zone: extra.zone,
    observations: extra.observations,
    google_maps: extra.google_maps,
    contact_name: extra.contact_name,
    contact_phone: extra.contact_phone,
    contact_document: extra.contact_document,
    apply_retention: extra.apply_retention,
    secondary_address: extra.secondary_address,
    secondary_phone: extra.secondary_phone,
    delivery_reference: extra.delivery_reference,
    guarantor_name: extra.guarantor_name,
    guarantor_document: extra.guarantor_document,
    guarantor_phone: extra.guarantor_phone,
    guarantor_address: extra.guarantor_address,
    has_vehicle: extra.has_vehicle,
    vehicles: extra.vehicles.filter((v) => v.plate.trim() || v.model.trim()),
  };
}
