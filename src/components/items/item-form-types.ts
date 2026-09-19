"use client";

import { profitPercentFromPrices } from "@/lib/items/compress-product-image";

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
  profit_percent: string;
  stock: string;
  category_id: string;
  has_igv: boolean;
  hyperlink: string;
  observations: string;
  sunat_code: string;
  specifications: string;
  product_line: string;
  weight_kg: string;
  image_url: string;
  image_base64: string;
  image_filename: string;
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
  profit_percent: "",
  stock: "",
  category_id: "",
  has_igv: false,
  hyperlink: "",
  observations: "",
  sunat_code: "",
  specifications: "",
  product_line: "",
  weight_kg: "",
  image_url: "",
  image_base64: "",
  image_filename: "",
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

export const COMMON_BRANDS = [
  "Toyota",
  "Nissan",
  "Hyundai",
  "Kia",
  "Mitsubishi",
  "Honda",
  "Chevrolet",
  "Ford",
  "Volkswagen",
  "Volvo",
  "CAT",
  "Mercedes-Benz",
];

export function rowToItemForm(r: Record<string, unknown>): ItemFormData {
  const purchase = Number(r.purchase_price ?? 0) || 0;
  const sale = Number(String(r.amount_sale_unit_price ?? r.sale_unit_price ?? "").replace(/[^\d.]/g, "") || r.sale_unit_price || 0) || 0;
  const image = String(r.image_url || r.image_url_small || "");
  return {
    description: String(r.description || r.name || ""),
    secondary_name: String(r.second_name || r.secondary_name || ""),
    description_detail: String(r.description_detail || ""),
    model: String(r.model || ""),
    unit_type_id: String(r.unit_type_id || "NIU"),
    currency_type_id: String(r.currency_type_id || "PEN"),
    sale_unit_price: sale ? String(sale) : "",
    sale_affectation_type_id: String(r.sale_affectation_igv_type_id || r.sale_affectation_type_id || "20"),
    stock_min: String(r.stock_min || "1"),
    barcode: String(r.barcode || ""),
    internal_id: String(r.internal_id || ""),
    brand: String(r.brand || ""),
    brand_id: String(r.brand_id || ""),
    line_id: String(r.line_id || ""),
    location: String(r.location || ""),
    purchase_price: purchase ? String(purchase) : "",
    profit_percent: purchase || sale ? String(profitPercentFromPrices(purchase, sale)) : "",
    stock: String(r.stock ?? "0"),
    category_id: String(r.category_id || (r.category as { id?: number })?.id || ""),
    has_igv: Boolean(r.has_igv ?? r.has_igv_description === "Si"),
    hyperlink: String(r.hyperlink || ""),
    observations: String(r.observations || ""),
    sunat_code: String(r.sunat_code || ""),
    specifications: String(r.specifications || ""),
    product_line: String(r.product_line || ""),
    weight_kg: r.weight_kg != null && r.weight_kg !== "" ? String(r.weight_kg) : "",
    image_url: image === "null" || image === "undefined" ? "" : image,
    image_base64: "",
    image_filename: "",
  };
}
