"use client";

export type ItemFormData = {
  description: string;
  secondary_name: string;
  description_detail: string;
  model: string;
  unit_type_id: string;
  currency_type_id: string;
  sale_unit_price: string;
  sale_affectation_type_id: string;
  stock_min: string;
  barcode: string;
  internal_id: string;
  brand: string;
  brand_id: string;
  line_id: string;
  location: string;
  purchase_price: string;
  stock: string;
  category_id: string;
  has_igv: boolean;
  hyperlink: string;
};

export const emptyItemForm: ItemFormData = {
  description: "",
  secondary_name: "",
  description_detail: "",
  model: "",
  unit_type_id: "NIU",
  currency_type_id: "PEN",
  sale_unit_price: "",
  sale_affectation_type_id: "20",
  stock_min: "1",
  barcode: "",
  internal_id: "",
  brand: "",
  brand_id: "",
  line_id: "",
  location: "",
  purchase_price: "",
  stock: "",
  category_id: "",
  has_igv: false,
  hyperlink: "",
};

export const AFFECTATION_TYPES = [
  { id: "10", label: "Gravado - Operación Onerosa" },
  { id: "20", label: "Exonerado - Operación Onerosa" },
  { id: "30", label: "Inafecto - Operación Onerosa" },
  { id: "40", label: "Exportación" },
];

export const UNIT_TYPES = [
  { id: "NIU", label: "Unidad" },
  { id: "ZZ", label: "Servicio" },
  { id: "KGM", label: "Kilogramo" },
  { id: "LTR", label: "Litro" },
  { id: "MTR", label: "Metro" },
];

export function rowToItemForm(r: Record<string, unknown>): ItemFormData {
  return {
    description: String(r.description || r.name || ""),
    secondary_name: String(r.second_name || r.secondary_name || ""),
    description_detail: String(r.description_detail || r.description || ""),
    model: String(r.model || ""),
    unit_type_id: String(r.unit_type_id || "NIU"),
    currency_type_id: String(r.currency_type_id || "PEN"),
    sale_unit_price: String(r.amount_sale_unit_price ?? r.sale_unit_price ?? "").replace(/[^\d.]/g, "") || String(Number(r.sale_unit_price ?? 0) || ""),
    sale_affectation_type_id: String(r.sale_affectation_igv_type_id || r.sale_affectation_type_id || "20"),
    stock_min: String(r.stock_min || "1"),
    barcode: String(r.barcode || r.internal_id || ""),
    internal_id: String(r.internal_id || ""),
    brand: String(r.brand || ""),
    brand_id: String(r.brand_id || ""),
    line_id: String(r.line_id || ""),
    location: String(r.location || ""),
    purchase_price: String(r.purchase_price ?? "").replace(/[^\d.]/g, "") || String(Number(r.purchase_price ?? 0) || ""),
    stock: String(r.stock ?? "0"),
    category_id: String((r.category as { id?: number })?.id || r.category_id || ""),
    has_igv: Boolean(r.has_igv ?? r.has_igv_description === "Si"),
    hyperlink: String(r.hyperlink || ""),
  };
}
