import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db/prisma";

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export async function readImportedModule(moduleKey: string): Promise<Record<string, unknown>[] | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: `imported_${moduleKey}` } });
  if (row?.value) {
    const data = parseJson(row.value);
    if (Array.isArray(data) && data.length) return data as Record<string, unknown>[];
  }
  const filePath = path.join(process.cwd(), "imported-data", `${moduleKey}.json`);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = parseJson(raw);
    if (Array.isArray(data) && data.length) return data as Record<string, unknown>[];
  }
  return null;
}

export function mapImportedDocument(d: Record<string, unknown>) {
  return {
    id: d.id,
    number: d.number ?? d.number_full,
    date_of_issue: d.date_of_issue,
    customer_name: d.customer_name,
    customer_number: d.customer_number,
    document_type_id: d.document_type_id,
    document_type_description: d.document_type_description,
    state_type_id: d.state_type_id,
    state_type_description: d.state_type_description,
    total_taxed: d.total_taxed,
    total_igv: d.total_igv,
    total: d.total,
    total_exonerated: d.total_exonerated,
    currency_type_id: d.currency_type_id ?? "PEN",
    has_pdf: true,
    has_xml: d.has_xml ?? false,
    plate: d.plate_numbers ?? d.plate ?? "",
    send_type: d.send_type ?? "Env. Individual",
    balance: d.total_pending ?? d.balance ?? 0,
    regularize_shipping: d.regularize_shipping ?? false,
    message_regularize_shipping: d.message_regularize_shipping ?? "",
  };
}

export function mapImportedDispatch(d: Record<string, unknown>) {
  return {
    id: d.id,
    number: d.number ?? d.number_full,
    customer_name: d.customer_name,
    customer_number: d.customer_number,
    date_of_issue: d.date_of_issue,
    transfer_reason: d.transfer_reason_type_description ?? d.transfer_reason ?? "Venta",
    state_type_description: d.state_type_description ?? d.state ?? "Registrado",
    plate: d.plate_number ?? d.plate ?? "",
    driver_name: d.driver_name ?? (d.driver as Record<string, unknown> | undefined)?.name ?? "",
    vehicle_plate: d.vehicle_plate ?? "",
    total_weight: d.total_weight ?? 0,
  };
}

export function mapImportedSaleNote(d: Record<string, unknown>) {
  return {
    id: d.id,
    number: d.number ?? d.identifier,
    date_of_issue: d.date_of_issue ?? d.created_at,
    customer_name: d.customer_name,
    customer_number: d.customer_number,
    state_type_description: d.state_type_description ?? d.state ?? "Registrado",
    currency_type_id: d.currency_type_id ?? "PEN",
    total: d.total,
    modified_price: d.modified_price ?? "NO",
    payment_status: d.payment_status ?? d.state_payment ?? "",
    purchase_order: d.purchase_order ?? "",
    plate: d.plate ?? d.plate_number ?? "",
    period_type: d.period_type ?? "",
    period_quantity: d.quantity_period ?? "",
  };
}

export function mapImportedPurchase(d: Record<string, unknown>) {
  return {
    id: d.id,
    date_of_issue: d.date_of_issue,
    supplier_name: d.supplier_name ?? d.name,
    supplier_number: d.supplier_number ?? d.number,
    state_type_description: d.state_type_description ?? d.state ?? "Registrado",
    payment_status: d.payment_condition ?? d.state_payment ?? "",
    number: d.number,
    document_type_description: d.document_type_description ?? "",
    currency_type_id: d.currency_type_id ?? "PEN",
    total: d.total,
  };
}
