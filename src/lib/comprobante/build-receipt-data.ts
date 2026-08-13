import { COMPANY_INFO, COMPROBANTE_ASSETS } from "@/lib/company-info";
import { documentLabel } from "@/lib/receipt-format";
import { buildSunatQrPayload } from "@/lib/comprobante/sunat-qr";
import type { ComprobanteEmisor, ReceiptData } from "@/lib/comprobante/types";

const DEFAULT_EMISOR: ComprobanteEmisor = {
  ruc: COMPANY_INFO.ruc,
  razonSocial: COMPANY_INFO.name,
  nombreComercial: COMPANY_INFO.tradeName,
  direccion: COMPANY_INFO.address,
  telefono: COMPANY_INFO.phone,
  telefono2: COMPANY_INFO.phone2,
  email: COMPANY_INFO.email,
  logo: COMPROBANTE_ASSETS.logo,
  titulo: COMPROBANTE_ASSETS.titulo,
  sello: COMPROBANTE_ASSETS.sello,
  banco: COMPANY_INFO.bank,
  moneda: COMPANY_INFO.bankCurrency,
  cuentaBancaria: COMPANY_INFO.bankAccount,
  cci: COMPANY_INFO.bankCci,
  detractionLabel: COMPANY_INFO.detractionLabel,
  detractionBank: COMPANY_INFO.detractionBank,
  footerServiceText: COMPANY_INFO.footerServiceText,
  brandLogos: COMPROBANTE_ASSETS.brands,
};

function parseLocation(address?: string | null): { province: string; district: string } {
  const raw = String(address ?? "").trim();
  if (!raw) return { province: "Huánuco", district: "Pillco Marca" };
  const parts = raw.split(/[-,]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      province: parts[parts.length - 2] ?? "Huánuco",
      district: parts[parts.length - 3] ?? "Pillco Marca",
    };
  }
  return { province: "Huánuco", district: raw || "Pillco Marca" };
}

export function docTypeLabelFromId(id: string, fallback?: string): string {
  const map: Record<string, string> = {
    "01": "FACTURA ELECTRÓNICA",
    "03": "BOLETA DE VENTA ELECTRÓNICA",
    "07": "NOTA DE CRÉDITO ELECTRÓNICA",
    "08": "NOTA DE DÉBITO ELECTRÓNICA",
    "09": "GUÍA DE REMISIÓN REMITENTE ELECTRÓNICA",
  };
  return map[id] ?? (fallback ? fallback.toUpperCase() : "COMPROBANTE ELECTRÓNICO");
}

function kindToDocTypeId(kind: string): string {
  if (kind === "factura") return "01";
  if (kind === "boleta") return "03";
  if (kind === "nota_credito") return "07";
  if (kind === "nota_debito") return "08";
  if (kind === "guia") return "09";
  return "03";
}

export function buildReceiptFromApiDoc(doc: Record<string, unknown>): ReceiptData {
  const itemsRaw = (doc.items as Record<string, unknown>[]) ?? [];
  const docTypeId = String(doc.document_type_id ?? "03");
  const number = String(doc.number ?? "");
  const customerNumber = String(doc.customer_number ?? "");
  const { province, district } = parseLocation(String(doc.customer_address ?? ""));

  const receipt: ReceiptData = {
    kind: "document",
    id: doc.id != null ? Number(doc.id) : undefined,
    number,
    document_type_id: docTypeId,
    document_type_label: docTypeLabelFromId(docTypeId, String(doc.document_type_description ?? "")),
    moneda: String(doc.currency_type_id ?? "PEN"),
    emisor: DEFAULT_EMISOR,
    customer_name: String(doc.customer_name ?? ""),
    customer_number: customerNumber,
    customer_address: String(doc.customer_address ?? ""),
    customer_province: String(doc.customer_province ?? province),
    customer_district: String(doc.customer_district ?? district),
    customer_email: doc.customer_email ? String(doc.customer_email) : undefined,
    customer_phone: doc.customer_phone ? String(doc.customer_phone) : undefined,
    seller_name: String(doc.seller_name ?? "ADMINISTRADOR"),
    items: itemsRaw.map((i) => ({
      code: i.internal_id ? String(i.internal_id) : i.code ? String(i.code) : undefined,
      description: String(i.description ?? ""),
      quantity: Number(i.quantity ?? 0),
      unit: String(i.unit_type_id ?? i.unit ?? "NIU"),
      unit_price: Number(i.unit_price ?? 0),
      discount: i.discount != null ? Number(i.discount) : undefined,
      total: Number(i.total ?? 0),
    })),
    total: Number(doc.total ?? 0),
    total_taxed: Number(doc.total_taxed ?? 0),
    total_igv: Number(doc.total_igv ?? 0),
    total_exonerated: doc.total_exonerated != null ? Number(doc.total_exonerated) : undefined,
    total_discount: doc.total_discount != null ? Number(doc.total_discount) : undefined,
    payment_method: String(doc.payment_method ?? "Efectivo"),
    payment_condition: String(doc.payment_condition ?? "Contado"),
    date_of_issue: String(doc.date_of_issue ?? new Date().toISOString().slice(0, 10)),
    date_of_due: doc.date_of_due ? String(doc.date_of_due) : undefined,
    plate: doc.plate ? String(doc.plate) : undefined,
    purchase_order: doc.purchase_order ? String(doc.purchase_order) : undefined,
    dispatch_number: doc.dispatch_number ? String(doc.dispatch_number) : undefined,
    hash: doc.hash ? String(doc.hash) : undefined,
    share_token: doc.share_token ? String(doc.share_token) : undefined,
  };

  receipt.qr_payload = buildSunatQrPayload({
    ruc: DEFAULT_EMISOR.ruc,
    documentTypeId: docTypeId,
    number,
    totalIgv: receipt.total_igv,
    total: receipt.total,
    dateOfIssue: receipt.date_of_issue,
    customerNumber,
  });

  return receipt;
}

/** Compatibilidad con receipt del POS checkout */
export function buildReceiptFromPos(receipt: Record<string, unknown>): ReceiptData {
  const docTypeId = String(receipt.document_type_id ?? kindToDocTypeId(String(receipt.kind ?? "boleta")));
  const number = String(receipt.number ?? "");
  const customerNumber = String(receipt.customer_number ?? "");
  const { province, district } = parseLocation(String(receipt.customer_address ?? ""));

  const base: ReceiptData = {
    kind: String(receipt.kind ?? "boleta"),
    id: receipt.id != null ? Number(receipt.id) : undefined,
    number,
    document_type_id: docTypeId,
    document_type_label: receipt.document_type_label
      ? String(receipt.document_type_label).toUpperCase()
      : docTypeLabelFromId(docTypeId),
    series_label: receipt.series_label ? String(receipt.series_label) : undefined,
    emisor: DEFAULT_EMISOR,
    customer_name: String(receipt.customer_name ?? ""),
    customer_number: customerNumber,
    customer_address: String(receipt.customer_address ?? ""),
    customer_province: province,
    customer_district: district,
    seller_name: "ADMINISTRADOR",
    items: ((receipt.items as Record<string, unknown>[]) ?? []).map((it) => ({
      code: it.code ? String(it.code) : undefined,
      description: String(it.description ?? ""),
      quantity: Number(it.quantity ?? 0),
      unit: String(it.unit ?? it.unit_type_id ?? "NIU"),
      unit_price: Number(it.unit_price ?? 0),
      total: Number(it.total ?? 0),
    })),
    total: Number(receipt.total ?? 0),
    total_taxed: Number(receipt.total_taxed ?? 0),
    total_igv: Number(receipt.total_igv ?? 0),
    payment_method: String(receipt.payment_method ?? "Efectivo"),
    payment_condition: String(receipt.payment_condition ?? "Contado"),
    date_of_issue: String(receipt.date_of_issue ?? new Date().toISOString().slice(0, 10)),
    plate: receipt.plate ? String(receipt.plate) : undefined,
    share_token: receipt.share_token ? String(receipt.share_token) : undefined,
  };

  base.qr_payload = buildSunatQrPayload({
    ruc: DEFAULT_EMISOR.ruc,
    documentTypeId: docTypeId,
    number,
    totalIgv: base.total_igv,
    total: base.total,
    dateOfIssue: base.date_of_issue,
    customerNumber,
  });

  return base;
}
