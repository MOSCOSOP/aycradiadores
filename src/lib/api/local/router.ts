import bcrypt from "bcryptjs";
import { prisma, getDocTypeDescription, getStateDescription } from "@/lib/db/prisma";
import {
  mapImportedDocument,
  mapImportedDispatch,
  mapImportedPurchase,
  mapImportedSaleNote,
  readImportedModule,
  readImportedJson,
} from "@/lib/imported-data";
import { handleReportRequest } from "@/lib/api/local/reports-handler";
import { localLogin } from "@/lib/auth/admin-user";
import { ALL_PERMISSION_KEYS } from "@/lib/permissions";
import { documentsMatch, normalizeDocumentNumber } from "@/lib/customer-duplicate";

function parseJsonSetting(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

async function readImportedRecords(moduleKey: string): Promise<Record<string, unknown>[] | null> {
  const row = await prisma.appSetting.findUnique({ where: { key: `imported_${moduleKey}` } });
  if (!row?.value) return null;
  const data = parseJsonSetting(row.value);
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : null;
}

function genericModuleKey(apiPath: string): string {
  return `mod_${apiPath.replace(/\//g, "_")}`;
}

async function readGenericRecords(apiPath: string): Promise<Record<string, unknown>[]> {
  const key = genericModuleKey(apiPath);
  const row = await prisma.appSetting.findUnique({ where: { key } });
  let rows = parseJsonSetting(row?.value || "[]") as Record<string, unknown>[];
  if (!rows.length) {
    const modKey = importedModuleKeyFromApiPath(apiPath);
    if (modKey) {
      const imported = await readImportedModule(modKey);
      if (imported?.length) {
        rows = imported.map((r) => ({
          id: r.id,
          name: r.name ?? r.description ?? "",
          description: r.description ?? r.name ?? "",
          state: r.state ?? "Activo",
          date: r.date ?? r.created_at ?? formatDate(new Date()),
          created_at: r.created_at,
          ...r,
        }));
        await saveGenericRecords(apiPath, rows);
      }
    }
  }
  return rows;
}

async function appendGenericRecord(apiPath: string, payload: Record<string, unknown>) {
  const key = genericModuleKey(apiPath);
  const rows = await readGenericRecords(apiPath);
  const id = rows.length ? Math.max(...rows.map((r) => Number(r.id || 0))) + 1 : 1;
  const record = {
    id,
    name: payload.name || payload.description || `Registro ${id}`,
    description: payload.description || payload.name || "",
    state: payload.state || "Activo",
    date: formatDate(new Date()),
    created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    ...payload,
  };
  rows.push(record);
  await saveGenericRecords(apiPath, rows);
  return record;
}

async function saveGenericRecords(apiPath: string, rows: Record<string, unknown>[]) {
  const key = genericModuleKey(apiPath);
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(rows) },
    update: { value: JSON.stringify(rows) },
  });
}

async function updateGenericRecord(apiPath: string, id: number, payload: Record<string, unknown>) {
  const rows = await readGenericRecords(apiPath);
  const idx = rows.findIndex((r) => Number(r.id) === id);
  if (idx < 0) throw new Error("Registro no encontrado");
  rows[idx] = {
    ...rows[idx],
    ...payload,
    id,
    updated_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  };
  await saveGenericRecords(apiPath, rows);
  return rows[idx];
}

async function deleteGenericRecord(apiPath: string, id: number) {
  const rows = await readGenericRecords(apiPath);
  const filtered = rows.filter((r) => Number(r.id) !== id);
  if (filtered.length === rows.length) throw new Error("Registro no encontrado");
  await saveGenericRecords(apiPath, filtered);
  return { success: true };
}

function importedModuleKeyFromApiPath(apiPath: string): string | null {
  const base = apiPath.replace(/\/records$/, "").replace(/-/g, "_");
  return base || null;
}

/** Módulos con handlers dedicados — no usar CRUD genérico por id */
const RESERVED_GENERIC_MODULES = new Set([
  "documents",
  "persons",
  "items",
  "services",
  "purchases",
  "categories",
  "users",
  "establishments",
  "dispatches",
  "inventory",
  "cash",
  "settings",
  "pos",
  "accounting",
  "sire",
  "finances",
  "reports",
  "sale-notes",
  "quotations",
  "order-notes",
  "auth",
  "customers",
  "suppliers",
  "backup",
]);

function parseGenericIdPath(path: string): { modulePath: string; id: number } | null {
  const match = path.match(/^([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/(\d+)$/);
  if (!match) return null;
  const modulePath = match[1];
  const top = modulePath.split("/")[0];
  if (RESERVED_GENERIC_MODULES.has(top)) return null;
  return { modulePath, id: Number(match[2]) };
}

async function removeImportedRow(moduleKey: string, id: number) {
  const imported = await readImportedModule(moduleKey);
  if (!imported?.length) return false;
  const filtered = imported.filter((r) => Number(r.id) !== id);
  if (filtered.length === imported.length) return false;
  await prisma.appSetting.upsert({
    where: { key: `imported_${moduleKey}` },
    create: { key: `imported_${moduleKey}`, value: JSON.stringify(filtered) },
    update: { value: JSON.stringify(filtered) },
  });
  return true;
}

function formatDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatTime(d: Date) {
  return d.toTimeString().split(" ")[0];
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const start = (page - 1) * limit;
  return { data: items.slice(start, start + limit), meta: { total, page, limit } };
}

async function nextCounter(key: string): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const n = Number(row?.value || 0) + 1;
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: String(n) },
    update: { value: String(n) },
  });
  return n;
}

function mapItemRecord(i: {
  id: number;
  sourceRemoteId: number | null;
  internalId: string | null;
  description: string;
  secondaryName: string | null;
  descriptionDetail: string | null;
  model: string | null;
  unitTypeId: string;
  saleUnitPrice: number;
  purchasePrice: number;
  stock: number;
  stockMin: number;
  location: string | null;
  hasIgv: boolean;
  saleAffectationTypeId: string;
  barcode: string | null;
  brand: string | null;
  imageUrl: string | null;
  category: { name: string } | null;
}) {
  return {
    id: i.sourceRemoteId ?? i.id,
    local_id: i.id,
    internal_id: i.internalId,
    description: i.description,
    name: i.description,
    second_name: i.secondaryName,
    description_detail: i.descriptionDetail,
    model: i.model,
    unit_type_id: i.unitTypeId,
    sale_unit_price: i.saleUnitPrice,
    sale_unit_price_with_igv: `S/ ${i.saleUnitPrice.toFixed(2)}`,
    purchase_unit_price: `S/ ${i.purchasePrice.toFixed(2)}`,
    purchase_price: i.purchasePrice,
    stock: i.stock,
    stock_min: i.stockMin,
    location: i.location,
    category: i.category?.name ?? "",
    category_description: i.category?.name ?? "",
    has_igv_description: i.hasIgv ? "Si" : "No",
    has_igv: i.hasIgv,
    barcode: i.barcode,
    brand: i.brand,
    sale_affectation_igv_type_id: i.saleAffectationTypeId,
    image_url_small: i.imageUrl,
    image_url: i.imageUrl,
  };
}

function supplierPayload(p: Record<string, unknown>) {
  return {
    name: String(p.name || ""),
    number: String(p.number || ""),
    identityDocumentTypeId: String(p.identity_document_type_id || "6"),
    tradeName: p.trade_name ? String(p.trade_name) : null,
    email: p.email ? String(p.email) : null,
    telephone: p.telephone ? String(p.telephone) : null,
    address: p.address ? String(p.address) : null,
    country: p.country ? String(p.country) : null,
    ubigeo: p.ubigeo ? String(p.ubigeo) : null,
    observations: p.observations ? String(p.observations) : null,
    internalCode: p.internal_code ? String(p.internal_code) : null,
    barcode: p.barcode ? String(p.barcode) : null,
  };
}

function customerPayload(p: Record<string, unknown>) {
  return {
    name: String(p.name || ""),
    number: String(p.number || ""),
    identityDocumentTypeId: String(p.identity_document_type_id || "6"),
    verificationCode: p.verification_code ? String(p.verification_code) : null,
    sex: p.sex ? String(p.sex) : null,
    birthDate: p.birth_date ? String(p.birth_date) : null,
    email: p.email ? String(p.email) : null,
    telephone: p.telephone ? String(p.telephone) : null,
    address: p.address ? String(p.address) : null,
    tradeName: p.trade_name ? String(p.trade_name) : null,
    country: p.country ? String(p.country) : null,
    ubigeo: p.ubigeo ? String(p.ubigeo) : null,
    creditDays: Number(p.credit_days ?? 0),
    internalCode: p.internal_code ? String(p.internal_code) : null,
    barcode: p.barcode ? String(p.barcode) : null,
    nationality: p.nationality ? String(p.nationality) : null,
    zone: p.zone ? String(p.zone) : null,
    observations: p.observations ? String(p.observations) : null,
    googleMaps: p.google_maps ? String(p.google_maps) : null,
    contactName: p.contact_name ? String(p.contact_name) : null,
    contactPhone: p.contact_phone ? String(p.contact_phone) : null,
    contactDocument: p.contact_document ? String(p.contact_document) : null,
    applyRetention: Boolean(p.apply_retention),
    secondaryAddress: p.secondary_address ? String(p.secondary_address) : null,
    secondaryPhone: p.secondary_phone ? String(p.secondary_phone) : null,
    deliveryReference: p.delivery_reference ? String(p.delivery_reference) : null,
    guarantorName: p.guarantor_name ? String(p.guarantor_name) : null,
    guarantorDocument: p.guarantor_document ? String(p.guarantor_document) : null,
    guarantorPhone: p.guarantor_phone ? String(p.guarantor_phone) : null,
    guarantorAddress: p.guarantor_address ? String(p.guarantor_address) : null,
    hasVehicle: Boolean(p.has_vehicle),
    vehicles: p.vehicles
      ? JSON.stringify(Array.isArray(p.vehicles) ? p.vehicles : [])
      : null,
  };
}

async function findDuplicateCustomer(number: string, excludeId?: number) {
  const trimmed = String(number || "").trim();
  const norm = normalizeDocumentNumber(trimmed);
  if (!norm) return null;

  const candidates = await prisma.customer.findMany({
    where: {
      OR: [{ number: trimmed }, { number: { contains: norm } }],
    },
    take: 30,
  });

  const dup = candidates.find(
    (c) => c.id !== excludeId && documentsMatch(c.number, trimmed)
  );
  return dup ? customerToRecord(dup) : null;
}

function customerToRecord(c: {
  id: number;
  name: string;
  number: string;
  identityDocumentTypeId: string;
  verificationCode: string | null;
  sex: string | null;
  birthDate: string | null;
  email: string | null;
  telephone: string | null;
  address: string | null;
  tradeName?: string | null;
  country?: string | null;
  ubigeo?: string | null;
  creditDays?: number;
  internalCode?: string | null;
  barcode?: string | null;
  nationality?: string | null;
  zone?: string | null;
  observations?: string | null;
  googleMaps?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactDocument?: string | null;
  applyRetention?: boolean;
  secondaryAddress?: string | null;
  secondaryPhone?: string | null;
  deliveryReference?: string | null;
  guarantorName?: string | null;
  guarantorDocument?: string | null;
  guarantorPhone?: string | null;
  guarantorAddress?: string | null;
  hasVehicle?: boolean;
  vehicles?: string | null;
}) {
  return {
    id: c.id,
    name: c.name,
    number: c.number,
    identity_document_type_id: c.identityDocumentTypeId,
    verification_code: c.verificationCode,
    sex: c.sex,
    birth_date: c.birthDate,
    email: c.email,
    telephone: c.telephone,
    address: c.address,
    trade_name: c.tradeName ?? null,
    country: c.country ?? null,
    ubigeo: c.ubigeo ?? null,
    credit_days: c.creditDays ?? 0,
    internal_code: c.internalCode ?? null,
    barcode: c.barcode ?? null,
    nationality: c.nationality ?? null,
    zone: c.zone ?? null,
    observations: c.observations ?? null,
    google_maps: c.googleMaps ?? null,
    contact_name: c.contactName ?? null,
    contact_phone: c.contactPhone ?? null,
    contact_document: c.contactDocument ?? null,
    apply_retention: c.applyRetention ?? false,
    secondary_address: c.secondaryAddress ?? null,
    secondary_phone: c.secondaryPhone ?? null,
    delivery_reference: c.deliveryReference ?? null,
    guarantor_name: c.guarantorName ?? null,
    guarantor_document: c.guarantorDocument ?? null,
    guarantor_phone: c.guarantorPhone ?? null,
    guarantor_address: c.guarantorAddress ?? null,
    has_vehicle: c.hasVehicle ?? false,
    vehicles: (() => {
      if (!c.vehicles) return [];
      try {
        return JSON.parse(c.vehicles);
      } catch {
        return [];
      }
    })(),
  };
}

type DocForRecord = {
  id: number;
  documentTypeId: string;
  fullNumber: string;
  customer: { name: string; number: string };
  customerId: number;
  dateOfIssue: Date;
  dateOfDue: Date;
  currencyTypeId: string;
  exchangeRate: number;
  totalTaxed: number;
  totalIgv: number;
  totalExonerated: number;
  total: number;
  stateTypeId: string;
  hasXml: boolean;
  hasPdf: boolean;
  hasCdr: boolean;
  plate?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function docToRecord(doc: DocForRecord) {
  return {
    id: doc.id,
    document_type_id: doc.documentTypeId,
    document_type_description: getDocTypeDescription(doc.documentTypeId),
    number: doc.fullNumber,
    customer_name: doc.customer.name,
    customer_number: doc.customer.number,
    customer_id: doc.customerId,
    date_of_issue: formatDate(doc.dateOfIssue),
    time_of_issue: formatTime(doc.dateOfIssue),
    date_of_due: formatDate(doc.dateOfDue),
    currency_type_id: doc.currencyTypeId,
    exchange_rate_sale: String(doc.exchangeRate),
    total_taxed: doc.totalTaxed.toFixed(2),
    total_igv: doc.totalIgv.toFixed(2),
    total_exonerated: doc.totalExonerated.toFixed(0),
    total: doc.total,
    state_type_id: doc.stateTypeId,
    state_type_description: getStateDescription(doc.stateTypeId),
    has_xml: doc.hasXml,
    has_pdf: doc.hasPdf,
    has_cdr: doc.hasCdr,
    payment_condition: "Contado",
    soap_type_description: "Producción",
    plate: doc.plate ?? "",
    created: { date: formatDate(doc.createdAt), time: formatTime(doc.createdAt) },
    updated: { date: formatDate(doc.updatedAt), time: formatTime(doc.updatedAt) },
  };
}

async function fetchDocuments() {
  return prisma.document.findMany({
    include: { customer: true, seller: true, establishment: true, items: true },
    orderBy: { id: "desc" },
  });
}

async function adjustStock(itemId: number, delta: number, type: string, ref: string) {
  const item = await prisma.item.update({
    where: { id: itemId },
    data: { stock: { increment: delta } },
  });
  await prisma.inventoryMovement.create({
    data: {
      itemId,
      type,
      quantity: Math.abs(delta),
      description: type === "out" ? "Salida por venta" : "Entrada por compra",
      reference: ref,
    },
  });
  return item;
}

async function createJournalForSale(
  fullNumber: string,
  total: number,
  totalTaxed: number,
  totalIgv: number,
  date: Date
) {
  await prisma.journalEntry.createMany({
    data: [
      {
        date,
        description: `Venta ${fullNumber}`,
        reference: fullNumber,
        accountCode: "121201",
        accountName: "Cuentas por cobrar comerciales",
        debit: total,
        credit: 0,
      },
      {
        date,
        description: `Venta ${fullNumber}`,
        reference: fullNumber,
        accountCode: "70111",
        accountName: "Ventas mercaderías",
        debit: 0,
        credit: totalTaxed,
      },
      {
        date,
        description: `IGV ${fullNumber}`,
        reference: fullNumber,
        accountCode: "40111",
        accountName: "IGV por pagar",
        debit: 0,
        credit: totalIgv,
      },
    ],
  });
}

export { localLogin } from "@/lib/auth/admin-user";

export async function handleLocalApi(
  method: string,
  pathParts: string[],
  searchParams: URLSearchParams,
  body?: unknown
): Promise<unknown> {
  const path = pathParts.join("/");

  // ── Dashboard ──
  if (method === "GET" && path === "dashboard/stats") {
    const { buildDashboardStats } = await import("@/lib/api/local/dashboard-handler");
    return buildDashboardStats(searchParams);
  }

  // ── Empresa / SUNAT / SIRE config ──
  if (method === "GET" && (path === "company" || path === "company/records" || path === "settings/company/records")) {
    const { getCompanyApiRecord } = await import("@/lib/sunat/company-config");
    const data = await getCompanyApiRecord(true);
    if (!data) throw new Error("Empresa no configurada");
    return { data };
  }

  if (method === "PUT" && path === "company") {
    const { parseCompanyPayload, getCompanyApiRecord } = await import("@/lib/sunat/company-config");
    const payload = parseCompanyPayload((body || {}) as Record<string, unknown>);
    const existing = await prisma.company.findFirst();
    const secretFields = [
      "soapPassword",
      "soapSunatPassword",
      "apiSunatSecret",
      "sireClientSecret",
      "sirePassword",
      "pseToken",
      "certificatePem",
      "certificatePassword",
    ] as const;
    const clean = Object.fromEntries(
      Object.entries(payload).filter(([k, v]) => {
        if (v === undefined) return false;
        if (secretFields.includes(k as (typeof secretFields)[number]) && v === "") return false;
        return true;
      })
    ) as Record<string, unknown>;

    if (existing) {
      await prisma.company.update({ where: { id: existing.id }, data: clean });
    } else {
      await prisma.company.create({
        data: {
          name: String(clean.name || "Empresa"),
          tradeName: String(clean.tradeName || clean.name || "Empresa"),
          ruc: String(clean.ruc || "00000000000"),
          ...clean,
        },
      });
    }
    const data = await getCompanyApiRecord(true);
    return { success: true, data };
  }

  if (method === "POST" && path === "company/test-soap") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { testSoapConnection } = await import("@/lib/sunat/soap");
    const config = await getCompanySunatConfig();
    if (!config) throw new Error("Empresa no configurada");
    return testSoapConnection(config);
  }

  if (method === "POST" && path === "company/test-api") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { testSunatApiConnection } = await import("@/lib/sunat/auth");
    const config = await getCompanySunatConfig();
    if (!config) throw new Error("Empresa no configurada");
    return testSunatApiConnection(config);
  }

  if (method === "POST" && path === "company/test-sire") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { testSireConnection } = await import("@/lib/sunat/sire");
    const config = await getCompanySunatConfig();
    if (!config) throw new Error("Empresa no configurada");
    return testSireConnection(config);
  }

  if (method === "GET" && path === "sire/propuesta/ventas") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { fetchSireSalesProposal } = await import("@/lib/sunat/sire");
    const config = await getCompanySunatConfig();
    if (!config) throw new Error("SUNAT no configurado");
    const period = searchParams.get("period") || undefined;
    return { data: await fetchSireSalesProposal(config, period) };
  }

  if (method === "GET" && path === "sire/propuesta/compras") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { fetchSirePurchasesProposal } = await import("@/lib/sunat/sire");
    const config = await getCompanySunatConfig();
    if (!config) throw new Error("SUNAT no configurado");
    const period = searchParams.get("period") || undefined;
    return { data: await fetchSirePurchasesProposal(config, period) };
  }

  // ── Documentos ──
  if (method === "GET" && path.match(/^documents\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const imported = await readImportedModule("documents");
    if (imported?.length) {
      const found = imported.find((d) => Number(d.id) === id);
      if (found) {
        const items = (found.items as Record<string, unknown>[]) || [];
        return {
          data: {
            ...mapImportedDocument(found),
            items: items.map((i) => {
              const itemObj = i.item as Record<string, unknown> | undefined;
              return {
                description: itemObj?.description ?? i.name ?? i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
                total: i.total ?? Number(i.quantity) * Number(i.unit_price),
              };
            }),
            format_default_print: found.format_default_print,
          },
        };
      }
    }
    const doc = await prisma.document.findUnique({
      where: { id },
      include: { customer: true, seller: true, establishment: true, items: { include: { item: true } } },
    });
    if (!doc) throw new Error("Comprobante no encontrado");
    return {
      data: {
        ...docToRecord(doc),
        items: doc.items.map((i) => ({
          id: i.id,
          description: i.description,
          quantity: i.quantity,
          unit_value: i.unitValue,
          unit_price: i.unitPrice,
          total: i.totalPrice,
        })),
      },
    };
  }

  if (method === "GET" && path === "documents/records") {
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);
    const value = searchParams.get("value") || "";

    const dbRows = (await fetchDocuments()).map(docToRecord);
    const imported = await readImportedModule("documents");
    const importedRows = imported?.length ? imported.map(mapImportedDocument) : [];

    const byNumber = new Map<string, Record<string, unknown>>();
    for (const row of importedRows) {
      const r = row as Record<string, unknown>;
      const key = String(r.number ?? r.full_number ?? r.id ?? "");
      if (key) byNumber.set(key, r);
    }
    for (const row of dbRows) {
      const r = row as Record<string, unknown>;
      const key = String(r.number ?? r.full_number ?? r.id ?? "");
      if (key) byNumber.set(key, r);
    }

    let rows = [...byNumber.values()].sort((a, b) => {
      const ra = a as Record<string, unknown>;
      const rb = b as Record<string, unknown>;
      return String(rb.date_of_issue ?? rb.date ?? "").localeCompare(String(ra.date_of_issue ?? ra.date ?? ""));
    });

    if (value) {
      const q = value.toLowerCase();
      rows = rows.filter((d) => {
        const dr = d as Record<string, unknown>;
        return (
          String(dr.number ?? "").toLowerCase().includes(q) ||
          String(dr.full_number ?? "").toLowerCase().includes(q) ||
          String(dr.customer_name ?? "").toLowerCase().includes(q) ||
          String(dr.customer_number ?? "").toLowerCase().includes(q)
        );
      });
    }
    return paginate(rows, page, limit);
  }

  if (method === "GET" && path === "documents/tables") {
    const company = await prisma.company.findFirst({ include: { establishments: true } });
    const users = await prisma.user.findMany();
    const series = await prisma.series.findMany();
    const settings = await prisma.appSetting.findMany();
    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const { getCompanyApiRecord } = await import("@/lib/sunat/company-config");
    const companyApi = await getCompanyApiRecord(true);
    return {
      all_establishments: company?.establishments.map((e) => ({ id: e.id, description: e.description })),
      sellers: users.map((u) => ({ id: u.id, name: u.name })),
      series: series.map((s) => ({ id: s.id, number: s.number, document_type_id: s.documentTypeId })),
      document_types: parseJsonSetting(settingsMap.document_types || "[]"),
      operation_types: parseJsonSetting(settingsMap.operation_types || "[]"),
      currency_types: parseJsonSetting(settingsMap.currency_types || "[]"),
      unit_types: parseJsonSetting(settingsMap.unit_types || "[]"),
      exchange_rate_sale: settingsMap.exchange_rate_sale || "3.396",
      company: companyApi ?? (company ? { name: company.name, number: company.ruc, trade_name: company.tradeName } : null),
    };
  }

  if (method === "POST" && path === "documents") {
    const payload = body as Record<string, unknown>;
    const items = (payload.items as Record<string, unknown>[]) || [];
    const seriesRow = await prisma.series.findUnique({ where: { id: Number(payload.series_id) } });
    if (!seriesRow) throw new Error("Serie no encontrada");

    const nextNum = seriesRow.currentNumber + 1;
    const fullNumber = `${seriesRow.number}-${nextNum}`;
    let totalTaxed = 0;
    let totalIgv = 0;

    const lineItems = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const unitValue = Number(it.unit_value || 0);
      const unitPrice = Number(it.unit_price || unitValue * 1.18);
      totalTaxed += qty * unitValue;
      totalIgv += qty * (unitPrice - unitValue);
      return {
        itemId: it.item_id ? Number(it.item_id) : null,
        description: String(it.description || ""),
        unitTypeId: String(it.unit_type_id || "NIU"),
        quantity: qty,
        unitValue,
        unitPrice,
        totalValue: qty * unitValue,
        totalPrice: qty * unitPrice,
      };
    });

    const doc = await prisma.$transaction(async (tx) => {
      await tx.series.update({ where: { id: seriesRow.id }, data: { currentNumber: nextNum } });
      const created = await tx.document.create({
        data: {
          documentTypeId: String(payload.document_type_id || "01"),
          series: seriesRow.number,
          number: nextNum,
          fullNumber,
          customerId: Number(payload.customer_id),
          sellerId: Number(payload.seller_id),
          establishmentId: Number(payload.establishment_id),
          dateOfIssue: new Date(String(payload.date_of_issue || new Date())),
          dateOfDue: new Date(String(payload.date_of_due || new Date())),
          currencyTypeId: String(payload.currency_type_id || "PEN"),
          exchangeRate: Number(payload.exchange_rate || 3.396),
          operationTypeId: String(payload.operation_type_id || "0101"),
          totalTaxed,
          totalIgv,
          total: totalTaxed + totalIgv,
          plate: payload.plate ? String(payload.plate) : null,
          items: { create: lineItems },
        },
        include: { customer: true, seller: true, establishment: true },
      });

      for (const li of lineItems) {
        if (li.itemId) {
          await tx.item.update({
            where: { id: li.itemId },
            data: { stock: { decrement: li.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              itemId: li.itemId,
              type: "out",
              quantity: li.quantity,
              description: "Venta",
              reference: fullNumber,
            },
          });
        }
      }
      return created;
    });

    await createJournalForSale(fullNumber, totalTaxed + totalIgv, totalTaxed, totalIgv, doc.dateOfIssue);

    let sunat: { success: boolean; message: string } | null = null;
    try {
      const { autoSendAfterCreate } = await import("@/lib/sunat/send-document");
      sunat = await autoSendAfterCreate(doc.id);
    } catch {
      /* envío SUNAT opcional */
    }

    return { success: true, data: docToRecord(doc), sunat };
  }

  if (method === "DELETE" && path.match(/^documents\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const doc = await prisma.document.findUnique({ where: { id }, include: { items: true } });
    if (doc) {
      await prisma.$transaction(async (tx) => {
        for (const li of doc.items) {
          if (li.itemId) {
            await tx.item.update({
              where: { id: li.itemId },
              data: { stock: { increment: li.quantity } },
            });
          }
        }
        await tx.document.delete({ where: { id } });
      });
      return { success: true };
    }
    if (await removeImportedRow("documents", id)) return { success: true };
    throw new Error("Comprobante no encontrado");
  }

  if (method === "POST" && path === "documents/massive") {
    const p = body as Record<string, unknown>;
    const batchRows = (p.rows as Record<string, unknown>[]) || [];
    let created = 0;
    for (const row of batchRows) {
      try {
        await handleLocalApi("POST", ["documents"], searchParams, {
          document_type_id: p.document_type_id,
          series_id: p.series_id,
          establishment_id: p.establishment_id,
          seller_id: p.seller_id,
          customer_id: row.customer_id,
          operation_type_id: "0101",
          currency_type_id: "PEN",
          exchange_rate: 3.396,
          date_of_issue: p.date_of_issue,
          date_of_due: p.date_of_issue,
          plate: row.plate,
          items: [
            {
              description: row.description,
              unit_type_id: "NIU",
              quantity: row.quantity || 1,
              unit_value: Number(row.unit_price) / 1.18,
              unit_price: row.unit_price,
            },
          ],
        });
        created++;
      } catch {
        /* skip failed row */
      }
    }
    return { success: true, created };
  }

  if (method === "GET" && (path === "documents/regularize-shipping" || path === "documents/regularize-shipping/records")) {
    const imported = await readImportedModule("documents");
    if (imported?.length) {
      const rows = imported
        .filter((d) => d.regularize_shipping === true)
        .map(mapImportedDocument);
      return { data: rows, meta: { total: rows.length } };
    }
    return { data: [], meta: { total: 0 } };
  }

  if (method === "POST" && path.match(/^documents\/\d+\/regularize$/)) {
    const id = Number(path.split("/")[1]);
    const imported = await readImportedModule("documents");
    if (imported?.length) {
      const idx = imported.findIndex((d) => Number(d.id) === id);
      if (idx >= 0) {
        imported[idx] = { ...imported[idx], regularize_shipping: false, message_regularize_shipping: "Regularizado" };
        await prisma.appSetting.upsert({
          where: { key: "imported_documents" },
          create: { key: "imported_documents", value: JSON.stringify(imported) },
          update: { value: JSON.stringify(imported) },
        });
      }
    }
    return { success: true, message: "Comprobante regularizado" };
  }

  if (method === "GET" && (path === "documents/not-sent" || path === "documents/not-sent/records")) {
    const imported = await readImportedRecords("documents_not_sent");
    if (imported?.length) {
      return { data: imported, meta: { total: imported.length } };
    }
    const docs = await fetchDocuments();
    const notSent = docs.filter((d) => !d.hasXml);
    return {
      data: notSent.map(docToRecord),
      meta: { total: notSent.length },
    };
  }

  // ── Clientes ──
  if (method === "GET" && path === "persons/customers/records") {
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);
    const value = searchParams.get("value") || searchParams.get("input") || "";
    const column = searchParams.get("column") || "name";

    const dbTotal = await prisma.customer.count();
    const {
      loadImportedCustomers,
      mapImportedCustomer,
      paginateImported,
      filterImportedCustomers,
    } = await import("@/lib/imported-catalog");

    const dbCustomers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
    const dbMapped = dbCustomers.map((c) => customerToRecord(c));

    if (dbTotal < 5) {
      const raw = await loadImportedCustomers();
      const byNumber = new Map<string, ReturnType<typeof customerToRecord>>();
      for (const row of raw) {
        const mapped = mapImportedCustomer(row);
        byNumber.set(String(mapped.number), mapped as ReturnType<typeof customerToRecord>);
      }
      for (const row of dbMapped) {
        byNumber.set(String(row.number), row);
      }
      let merged = [...byNumber.values()];
      if (value) {
        const q = value.toLowerCase();
        merged = merged.filter(
          (c) =>
            String(c.name ?? "").toLowerCase().includes(q) ||
            String(c.number ?? "").toLowerCase().includes(q)
        );
      }
      return paginateImported(merged, page, limit);
    }

    const where =
      value && (column === "search" || column === "name")
        ? {
            OR: [
              { name: { contains: value, mode: "insensitive" as const } },
              { number: { contains: value } },
            ],
          }
        : value && column === "number"
          ? { number: { contains: value } }
          : {};
    const [data, total] = await Promise.all([
      prisma.customer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
      prisma.customer.count({ where }),
    ]);
    return {
      data: data.map((c) => customerToRecord(c)),
      meta: { total, page, limit },
    };
  }

  if (method === "GET" && path.match(/^persons\/customers\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const c = await prisma.customer.findUnique({ where: { id } });
    if (!c) throw new Error("Cliente no encontrado");
    return { data: customerToRecord(c) };
  }

  if (method === "POST" && path === "persons/customers") {
    const p = body as Record<string, unknown>;
    const force = Boolean(p.force_duplicate);
    const duplicate = await findDuplicateCustomer(String(p.number || ""));
    if (duplicate && !force) {
      const err = new Error("DUPLICATE_CUSTOMER") as Error & { duplicate?: unknown };
      err.duplicate = duplicate;
      throw err;
    }
    const customer = await prisma.customer.create({ data: customerPayload(p) });
    return { success: true, data: customerToRecord(customer) };
  }

  if (method === "PUT" && path.match(/^persons\/customers\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const p = body as Record<string, unknown>;
    const force = Boolean(p.force_duplicate);
    const duplicate = await findDuplicateCustomer(String(p.number || ""), id);
    if (duplicate && !force) {
      const err = new Error("DUPLICATE_CUSTOMER") as Error & { duplicate?: unknown };
      err.duplicate = duplicate;
      throw err;
    }
    const customer = await prisma.customer.update({
      where: { id },
      data: customerPayload(p),
    });
    return { success: true, data: customerToRecord(customer) };
  }

  if (method === "DELETE" && path.match(/^persons\/customers\/\d+$/)) {
    await prisma.customer.delete({ where: { id: Number(path.split("/")[2]) } });
    return { success: true };
  }

  // ── Proveedores ──
  if (method === "GET" && path === "persons/suppliers/records") {
    const data = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
    return {
      data: data.map((s) => {
        const row = s as typeof s & Record<string, unknown>;
        return {
          id: s.id,
          name: s.name,
          number: s.number,
          identity_document_type_id: String(row.identityDocumentTypeId ?? "6"),
          trade_name: row.tradeName ?? null,
          email: s.email,
          telephone: s.telephone,
          address: s.address,
          country: row.country ?? null,
          ubigeo: row.ubigeo ?? null,
          observations: row.observations ?? null,
          internal_code: row.internalCode ?? null,
          barcode: row.barcode ?? null,
        };
      }),
      meta: { total: data.length },
    };
  }

  if (method === "POST" && path === "persons/suppliers") {
    const p = body as Record<string, unknown>;
    const supplier = await prisma.supplier.create({ data: supplierPayload(p) });
    return { success: true, data: supplier };
  }

  if (method === "PUT" && path.match(/^persons\/suppliers\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const p = body as Record<string, unknown>;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: supplierPayload(p),
    });
    return { success: true, data: supplier };
  }

  if (method === "DELETE" && path.match(/^persons\/suppliers\/\d+$/)) {
    await prisma.supplier.delete({ where: { id: Number(path.split("/")[2]) } });
    return { success: true };
  }

  // ── Productos ──
  if (method === "GET" && path === "items/records") {
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);
    const value = searchParams.get("value") || searchParams.get("input") || "";
    const column = searchParams.get("column") || "description";

    const dbTotal = await prisma.item.count();
    const {
      shouldUseImportedItems,
      loadImportedItems,
      mapImportedItem,
      paginateImported,
      filterImportedItems,
    } = await import("@/lib/imported-catalog");

    if (await shouldUseImportedItems(dbTotal)) {
      const raw = await loadImportedItems();
      const filtered = filterImportedItems(raw, value, column);
      const mapped = filtered.map(mapImportedItem);
      return paginateImported(mapped, page, limit);
    }

    const where =
      value && (column === "search" || column === "description" || column === "name")
        ? {
            OR: [
              { description: { contains: value, mode: "insensitive" as const } },
              { internalId: { contains: value, mode: "insensitive" as const } },
              { barcode: { contains: value, mode: "insensitive" as const } },
            ],
          }
        : value && column === "internal_id"
          ? { internalId: { contains: value, mode: "insensitive" as const } }
          : {};
    const total = await prisma.item.count({ where });
    const data = await prisma.item.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { sourceRemoteId: "asc" },
      include: { category: true },
    });
    return {
      data: data.map(mapItemRecord),
      meta: { total, page, limit, last_page: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  if (method === "GET" && path === "person-types/records") {
    const data = await readGenericRecords("person-types/records");
    return { data, meta: { total: data.length } };
  }

  if (method === "PUT" && path.match(/^services\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const item = await prisma.item.update({
      where: { id },
      data: {
        description: p.description ? String(p.description) : undefined,
        internalId: p.internal_id !== undefined ? String(p.internal_id || "") : undefined,
        saleUnitPrice: p.sale_unit_price !== undefined ? Number(p.sale_unit_price) : undefined,
      },
    });
    return { success: true, data: item };
  }

  if (method === "DELETE" && path.match(/^services\/\d+$/)) {
    await prisma.item.update({ where: { id: Number(path.split("/")[1]) }, data: { active: false } });
    return { success: true };
  }

  if (method === "DELETE" && path.match(/^purchases\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    try {
      await prisma.purchase.delete({ where: { id } });
    } catch {
      throw new Error("No se puede eliminar esta compra");
    }
    return { success: true };
  }

  if (method === "GET" && path === "items/columns") {
    return {
      description: "Nombre",
      internal_id: "Código interno",
      unit_type_id: "Unidad",
      sale_unit_price: "Precio venta",
      stock: "Stock",
      category: "Categoría",
    };
  }

  if (method === "POST" && path === "items") {
    const p = body as Record<string, unknown>;
    const item = await prisma.item.create({
      data: {
        description: String(p.description || ""),
        secondaryName: p.secondary_name ? String(p.secondary_name) : null,
        descriptionDetail: p.description_detail ? String(p.description_detail) : null,
        model: p.model ? String(p.model) : null,
        internalId: p.internal_id ? String(p.internal_id) : null,
        barcode: p.barcode ? String(p.barcode) : null,
        brand: p.brand ? String(p.brand) : null,
        unitTypeId: String(p.unit_type_id || "NIU"),
        saleUnitPrice: Number(p.sale_unit_price || 0),
        purchasePrice: Number(p.purchase_price || 0),
        stock: Number(p.stock || 0),
        stockMin: Number(p.stock_min || 0),
        location: p.location ? String(p.location) : null,
        saleAffectationTypeId: String(p.sale_affectation_type_id || "10"),
        hasIgv: p.has_igv !== undefined ? Boolean(p.has_igv) : true,
        categoryId: p.category_id ? Number(p.category_id) : null,
      },
    });
    if (Number(p.stock || 0) > 0) {
      await prisma.inventoryMovement.create({
        data: { itemId: item.id, type: "in", quantity: Number(p.stock), description: "Stock inicial" },
      });
    }
    return { success: true, data: item };
  }

  if (method === "PUT" && path.match(/^items\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const item = await prisma.item.update({
      where: { id },
      data: {
        description: String(p.description || ""),
        secondaryName: p.secondary_name ? String(p.secondary_name) : null,
        descriptionDetail: p.description_detail ? String(p.description_detail) : null,
        model: p.model ? String(p.model) : null,
        internalId: p.internal_id ? String(p.internal_id) : null,
        barcode: p.barcode ? String(p.barcode) : null,
        brand: p.brand ? String(p.brand) : null,
        unitTypeId: String(p.unit_type_id || "NIU"),
        saleUnitPrice: Number(p.sale_unit_price || 0),
        purchasePrice: Number(p.purchase_price || 0),
        stock: Number(p.stock || 0),
        stockMin: Number(p.stock_min || 0),
        location: p.location ? String(p.location) : null,
        saleAffectationTypeId: String(p.sale_affectation_type_id || "10"),
        hasIgv: p.has_igv !== undefined ? Boolean(p.has_igv) : true,
        categoryId: p.category_id ? Number(p.category_id) : null,
      },
    });
    return { success: true, data: item };
  }

  if (method === "DELETE" && path.match(/^items\/\d+$/)) {
    await prisma.item.delete({ where: { id: Number(path.split("/")[1]) } });
    return { success: true };
  }

  // ── Categorías ──
  if (method === "GET" && path === "categories/records") {
    const { ensureDefaultCategories, mergeCategoriesList } = await import("@/lib/default-categories");
    await ensureDefaultCategories();
    const data = await prisma.category.findMany({ include: { _count: { select: { items: true } } } });
    const merged = mergeCategoriesList(data.map((c) => ({ id: c.id, name: c.name })));
    const countByName = Object.fromEntries(data.map((c) => [c.name.toUpperCase(), c._count.items]));
    return {
      data: merged.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.name,
        items_count: countByName[c.name.toUpperCase()] ?? 0,
      })),
    };
  }

  if (method === "POST" && path === "categories") {
    const p = body as Record<string, unknown>;
    const cat = await prisma.category.create({
      data: { name: String(p.name || ""), description: p.description ? String(p.description) : null },
    });
    return { success: true, data: cat };
  }

  if (method === "PUT" && path.match(/^categories\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const cat = await prisma.category.update({
      where: { id },
      data: { name: String(p.name || ""), description: p.description ? String(p.description) : null },
    });
    return { success: true, data: cat };
  }

  if (method === "DELETE" && path.match(/^categories\/\d+$/)) {
    await prisma.category.delete({ where: { id: Number(path.split("/")[1]) } });
    return { success: true };
  }

  // ── Compras ──
  if (method === "GET" && path === "purchases/records") {
    const limit = Number(searchParams.get("limit") || 20);
    const page = Number(searchParams.get("page") || 1);
    const value = searchParams.get("value") || "";
    const imported = await readImportedModule("purchases");
    if (imported?.length) {
      let rows = imported.map(mapImportedPurchase);
      if (value) {
        const q = value.toLowerCase();
        rows = rows.filter(
          (p) =>
            String(p.number ?? "").toLowerCase().includes(q) ||
            String(p.supplier_name ?? "").toLowerCase().includes(q)
        );
      }
      return paginate(rows, page, limit);
    }
    const data = await prisma.purchase.findMany({
      include: { supplier: true },
      orderBy: { id: "desc" },
    });
    return {
      data: data.map((p) => ({
        id: p.id,
        number: p.number,
        supplier_name: p.supplier.name,
        date: formatDate(p.date),
        total: p.total,
        state: p.state,
      })),
    };
  }

  if (method === "POST" && path === "purchases") {
    const p = body as Record<string, unknown>;
    const items = (p.items as Record<string, unknown>[]) || [];
    const num = await nextCounter("purchase_counter");
    const number = `C-${String(num).padStart(4, "0")}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unit_price || 0);
      const t = qty * price;
      total += t;
      return { description: String(it.description || ""), quantity: qty, unitPrice: price, total: t };
    });

    const purchase = await prisma.purchase.create({
      data: {
        number,
        supplierId: Number(p.supplier_id),
        total,
        items: { create: lineItems },
      },
      include: { supplier: true },
    });

    for (const it of items) {
      if (it.item_id) {
        await adjustStock(Number(it.item_id), Number(it.quantity || 1), "in", number);
      }
    }
    return { success: true, data: purchase };
  }

  if (method === "GET" && path.match(/^purchases\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = await prisma.purchase.findUnique({
      where: { id },
      include: { supplier: true, items: true },
    });
    if (!p) throw new Error("Compra no encontrada");
    return {
      data: {
        id: p.id,
        number: p.number,
        supplier_name: p.supplier.name,
        supplier_id: p.supplierId,
        date: formatDate(p.date),
        total: p.total,
        state: p.state,
        items: p.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          total: i.total,
        })),
      },
    };
  }

  // ── Notas de venta ──
  if (method === "GET" && path === "sale-notes/records") {
    const imported = await readImportedModule("sale_notes");
    if (imported?.length) {
      const limit = Number(searchParams.get("limit") || 20);
      const page = Number(searchParams.get("page") || 1);
      return paginate(imported.map(mapImportedSaleNote), page, limit);
    }
    const data = await prisma.saleNote.findMany({ include: { customer: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((n) => ({
        id: n.id,
        number: n.number,
        customer_name: n.customer.name,
        customer_number: n.customer.number,
        date_of_issue: formatDate(n.date),
        date: formatDate(n.date),
        total: n.total,
        state: n.state,
        state_type_description: n.state,
        currency_type_id: n.currencyTypeId,
        modified_price: n.modifiedPrice,
        payment_status: n.paymentStatus ?? "Pagado",
        purchase_order: n.purchaseOrder ?? "",
        plate: n.plate ?? "",
      })),
    };
  }

  if (method === "POST" && path === "sale-notes") {
    const p = body as Record<string, unknown>;
    const items = (p.items as Record<string, unknown>[]) || [];
    const num = await nextCounter("sale_note_counter");
    const number = `NV01-${num}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unit_price || 0);
      const t = qty * price;
      total += t;
      return { description: String(it.description || ""), quantity: qty, unitPrice: price, total: t };
    });
    const note = await prisma.saleNote.create({
      data: {
        number,
        customerId: Number(p.customer_id),
        total,
        plate: p.plate ? String(p.plate) : null,
        currencyTypeId: String(p.currency_type_id || "PEN"),
        paymentStatus: p.payment_status ? String(p.payment_status) : "Pagado",
        purchaseOrder: p.purchase_order ? String(p.purchase_order) : null,
        modifiedPrice: String(p.modified_price || "NO"),
        items: { create: lineItems },
      },
    });
    return { success: true, data: note };
  }

  if (method === "GET" && path.match(/^sale-notes\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const n = await prisma.saleNote.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
    if (!n) throw new Error("Nota no encontrada");
    return {
      data: {
        id: n.id,
        number: n.number,
        customer_name: n.customer.name,
        customer_number: n.customer.number,
        customer_id: n.customerId,
        date: formatDate(n.date),
        date_of_issue: formatDate(n.date),
        total: n.total,
        state: n.state,
        state_type_description: n.state,
        currency_type_id: n.currencyTypeId,
        modified_price: n.modifiedPrice,
        payment_status: n.paymentStatus ?? "Pagado",
        purchase_order: n.purchaseOrder ?? "",
        plate: n.plate ?? "",
        items: n.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          total: i.total,
        })),
      },
    };
  }

  if (method === "PUT" && path.match(/^sale-notes\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const note = await prisma.saleNote.findUnique({ where: { id } });
    if (!note) throw new Error("Nota no encontrada");
    await prisma.saleNote.update({
      where: { id },
      data: {
        plate: p.plate != null ? String(p.plate) : note.plate,
        currencyTypeId: p.currency_type_id ? String(p.currency_type_id) : note.currencyTypeId,
        paymentStatus: p.payment_status ? String(p.payment_status) : note.paymentStatus,
        purchaseOrder: p.purchase_order != null ? String(p.purchase_order) : note.purchaseOrder,
        modifiedPrice: p.modified_price ? String(p.modified_price) : note.modifiedPrice,
        state: p.state ? String(p.state) : note.state,
        customerId: p.customer_id ? Number(p.customer_id) : note.customerId,
      },
    });
    if (Array.isArray(p.items)) {
      await prisma.saleNoteItem.deleteMany({ where: { saleNoteId: id } });
      let total = 0;
      const lineItems = (p.items as Record<string, unknown>[]).map((it) => {
        const qty = Number(it.quantity || 1);
        const price = Number(it.unit_price || 0);
        const t = qty * price;
        total += t;
        return {
          saleNoteId: id,
          description: String(it.description || ""),
          quantity: qty,
          unitPrice: price,
          total: t,
        };
      });
      if (lineItems.length) await prisma.saleNoteItem.createMany({ data: lineItems });
      await prisma.saleNote.update({ where: { id }, data: { total } });
    }
    return { success: true };
  }

  if (method === "DELETE" && path.match(/^sale-notes\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    try {
      await prisma.saleNote.delete({ where: { id } });
      return { success: true };
    } catch {
      if (await removeImportedRow("sale_notes", id)) return { success: true };
      throw new Error("Nota no encontrada");
    }
  }

  // ── Cotizaciones ──
  if (method === "GET" && path === "quotations/records") {
    const data = await prisma.quotation.findMany({ include: { customer: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((q) => ({
        id: q.id,
        number: q.number,
        customer_name: q.customer.name,
        date: formatDate(q.date),
        total: q.total,
        state: q.state,
      })),
    };
  }

  if (method === "POST" && path === "quotations") {
    const p = body as Record<string, unknown>;
    const items = (p.items as Record<string, unknown>[]) || [];
    const num = await nextCounter("quotation_counter");
    const number = `COT-${String(num).padStart(4, "0")}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unit_price || 0);
      const t = qty * price;
      total += t;
      return { description: String(it.description || ""), quantity: qty, unitPrice: price, total: t };
    });
    const q = await prisma.quotation.create({
      data: { number, customerId: Number(p.customer_id), total, items: { create: lineItems } },
    });
    return { success: true, data: q };
  }

  if (method === "GET" && path.match(/^quotations\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const q = await prisma.quotation.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
    if (!q) throw new Error("Cotización no encontrada");
    return {
      data: {
        id: q.id,
        number: q.number,
        customer_name: q.customer.name,
        customer_id: q.customerId,
        date: formatDate(q.date),
        total: q.total,
        state: q.state,
        items: q.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          total: i.total,
        })),
      },
    };
  }

  // ── Inventario ──
  if (method === "GET" && path === "inventory/records") {
    const imported = await readImportedModule("inventory");
    if (imported?.length) {
      return {
        data: imported.map((m) => ({
          id: m.id,
          item: m.item_description,
          internal_id: m.item_internal_id,
          warehouse: m.warehouse_description,
          stock: m.stock,
          type: "Stock",
          quantity: m.stock,
          reference: m.warehouse_description,
          description: `Stock en ${m.warehouse_description}`,
          date: String(m.updated_at ?? m.created_at ?? "").slice(0, 10),
        })),
        meta: { total: imported.length },
      };
    }
    const data = await prisma.inventoryMovement.findMany({
      include: { item: true },
      orderBy: { id: "desc" },
      take: 100,
    });
    return {
      data: data.map((m) => ({
        id: m.id,
        item: m.item.description,
        type: m.type,
        quantity: m.quantity,
        description: m.description,
        reference: m.reference,
        date: formatDate(m.createdAt),
      })),
    };
  }

  if (method === "PUT" && path.match(/^inventory\/movements\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const p = body as Record<string, unknown>;
    const mov = await prisma.inventoryMovement.findUnique({ where: { id }, include: { item: true } });
    if (!mov) throw new Error("Movimiento no encontrado");
    const oldQty = mov.quantity;
    const oldType = mov.type;
    const newQty = p.quantity != null ? Number(p.quantity) : oldQty;
    const newType = p.type ? String(p.type) : oldType;
    await prisma.inventoryMovement.update({
      where: { id },
      data: {
        type: newType,
        quantity: newQty,
        description: p.description != null ? String(p.description) : mov.description,
        reference: p.reference != null ? String(p.reference) : mov.reference,
      },
    });
    const reverseDelta = (type: string, qty: number) => {
      if (type === "in") return -qty;
      if (type === "out") return qty;
      return 0;
    };
    const applyDelta = (type: string, qty: number) => {
      if (type === "in") return qty;
      if (type === "out") return -qty;
      return 0;
    };
    const stockDelta = reverseDelta(oldType, oldQty) + applyDelta(newType, newQty);
    if (stockDelta !== 0) {
      await prisma.item.update({
        where: { id: mov.itemId },
        data: { stock: mov.item.stock + stockDelta },
      });
    }
    return { success: true };
  }

  if (method === "DELETE" && path.match(/^inventory\/movements\/\d+$/)) {
    const id = Number(path.split("/")[2]);
    const mov = await prisma.inventoryMovement.findUnique({ where: { id }, include: { item: true } });
    if (!mov) {
      if (await removeImportedRow("inventory", id)) return { success: true };
      throw new Error("Movimiento no encontrado");
    }
    const stockDelta = mov.type === "in" ? -mov.quantity : mov.type === "out" ? mov.quantity : 0;
    await prisma.inventoryMovement.delete({ where: { id } });
    if (stockDelta !== 0) {
      await prisma.item.update({
        where: { id: mov.itemId },
        data: { stock: mov.item.stock + stockDelta },
      });
    }
    return { success: true };
  }

  if (method === "POST" && path === "inventory/import") {
    const p = body as { rows?: { product: string; establishment: string; stock: number }[] };
    const rows = p.rows ?? [];
    let updated = 0;
    for (const row of rows) {
      const product = row.product.trim();
      if (!product) continue;
      const item =
        (await prisma.item.findFirst({ where: { description: product } })) ??
        (await prisma.item.findFirst({ where: { description: { contains: product.slice(0, 40) } } })) ??
        (await prisma.item.findFirst({ where: { internalId: { contains: product.split(" ")[0] } } }));
      if (!item) continue;
      const prev = item.stock;
      await prisma.item.update({ where: { id: item.id }, data: { stock: row.stock } });
      await prisma.inventoryMovement.create({
        data: {
          itemId: item.id,
          type: "adjust",
          quantity: row.stock - prev,
          description: `Import Excel — ${row.establishment}`,
          reference: "IMPORT-INV",
        },
      });
      updated++;
    }
    return { success: true, updated, total: rows.length };
  }

  if (method === "POST" && path === "inventory/adjust") {
    const p = body as Record<string, unknown>;
    const itemId = Number(p.item_id);
    const type = String(p.type || "adjust");
    const modifyKardex = p.modify_kardex !== false;

    if (p.real_stock !== undefined && p.real_stock !== null && p.real_stock !== "") {
      const current = await prisma.item.findUnique({ where: { id: itemId } });
      if (!current) throw new Error("Producto no encontrado");
      const prev = current.stock;
      const real = Number(p.real_stock);
      const delta = real - prev;
      await prisma.item.update({ where: { id: itemId }, data: { stock: real } });
      if (modifyKardex && delta !== 0) {
        await prisma.inventoryMovement.create({
          data: {
            itemId,
            type: "adjust",
            quantity: Math.abs(delta),
            description: `Ajuste inventario — sistema ${prev} → real ${real}`,
            reference: String(p.reference || "AJUSTE"),
          },
        });
      }
      return { success: true };
    }

    const qty = Number(p.quantity || 0);
    const delta = type === "out" ? -qty : qty;
    await adjustStock(itemId, delta, type, String(p.reference || "AJUSTE"));
    return { success: true };
  }

  if (method === "GET" && path === "inventory/stock") {
    const data = await prisma.item.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: { description: "asc" },
    });
    return {
      data: data.map((i) => ({
        id: i.id,
        internal_id: i.internalId,
        description: i.description,
        category: i.category?.name,
        stock: i.stock,
        sale_unit_price: i.saleUnitPrice,
        value: i.stock * i.saleUnitPrice,
      })),
    };
  }

  // ── Cajas ──
  if (method === "GET" && path === "cash/records") {
    const imported = await readImportedModule("cash");
    if (imported?.length) {
      return {
        data: imported.map((c, idx) => ({
          id: c.id ?? idx + 1,
          reference: c.reference ?? c.description ?? c.user_name,
          seller_name: c.user_name ?? c.seller_name ?? "—",
          opening_date: c.date_opening ?? c.opening_date ?? c.created_at,
          closing_date: c.date_closed ?? c.closing_date ?? "—",
          opening_balance: Number(c.initial_balance ?? c.opening_balance ?? 0),
          closing_balance: Number(c.final_balance ?? c.closing_balance ?? 0),
          real_balance: Number(c.real_balance ?? c.final_balance ?? 0),
          state: c.state_description ?? (c.state === 1 || c.is_open ? "Aperturada" : "Cerrada"),
          is_open: c.state === 1 || c.is_open === true,
        })),
      };
    }
    const data = await prisma.cashRegister.findMany({ include: { establishment: true } });
    if (data.length === 0) {
      return {
        data: [
          {
            id: 1,
            reference: "23-6-23",
            seller_name: "SOPORTE",
            opening_date: "2023-06-23 01:03:44",
            closing_date: "—",
            opening_balance: 0,
            closing_balance: 0,
            real_balance: 0,
            state: "Aperturada",
            is_open: true,
          },
          {
            id: 2,
            reference: "ADMINISTRADOR",
            seller_name: "ADMINISTRADOR",
            opening_date: "2023-06-22 11:01:08",
            closing_date: "—",
            opening_balance: 0,
            closing_balance: 0,
            real_balance: 0,
            state: "Aperturada",
            is_open: true,
          },
        ],
      };
    }
    return {
      data: data.map((c) => ({
        id: c.id,
        reference: c.reference ?? c.description,
        seller_name: c.sellerName ?? "—",
        opening_date: c.openedAt ? `${formatDate(c.openedAt)} ${formatTime(c.openedAt)}` : "—",
        closing_date: c.closedAt ? `${formatDate(c.closedAt)} ${formatTime(c.closedAt)}` : "—",
        opening_balance: c.openingBalance,
        closing_balance: c.closingBalance,
        real_balance: c.realBalance,
        state: c.isOpen ? "Aperturada" : "Cerrada",
        is_open: c.isOpen,
        description: c.description,
        establishment: c.establishment.description,
        current_balance: c.currentBalance,
      })),
    };
  }

  if (method === "POST" && path === "cash/open") {
    const p = body as Record<string, unknown>;
    const establishment = await prisma.establishment.findFirst();
    const user = await prisma.user.findFirst();
    if (!establishment) throw new Error("Sin establecimiento");
    const isPos = Boolean(p.pos);
    const description = String(p.description || (isPos ? "Caja chica POS" : "Caja principal"));
    const balance = Number(p.balance || 0);
    const ref = String(p.reference || `CAJA-${Date.now().toString().slice(-6)}`);
    const created = await prisma.cashRegister.create({
      data: {
        description,
        reference: ref,
        sellerName: user?.name ?? "ADMINISTRADOR",
        establishmentId: establishment.id,
        isOpen: true,
        openingBalance: balance,
        currentBalance: balance,
        realBalance: balance,
        openedAt: new Date(),
      },
    });
    return { success: true, data: { id: created.id, reference: created.reference, is_open: created.isOpen } };
  }

  if (method === "PUT" && path.match(/^cash\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const updated = await prisma.cashRegister.update({
      where: { id },
      data: {
        description: p.description ? String(p.description) : undefined,
        reference: p.reference ? String(p.reference) : undefined,
        openingBalance: p.opening_balance != null ? Number(p.opening_balance) : undefined,
        currentBalance: p.current_balance != null ? Number(p.current_balance) : undefined,
        realBalance: p.real_balance != null ? Number(p.real_balance) : undefined,
      },
    });
    return { success: true, data: { id: updated.id } };
  }

  if (method === "GET" && path.match(/^cash\/\d+\/report$/)) {
    const id = Number(path.split("/")[1]);
    const type = searchParams.get("type") || "general";
    const box = await prisma.cashRegister.findUnique({
      where: { id },
      include: { establishment: true },
    });
    if (!box) throw new Error("Caja no encontrada");
    const base = {
      reference: box.reference,
      seller: box.sellerName,
      establishment: box.establishment.description,
      opening_date: box.openedAt ? formatDate(box.openedAt) : "—",
      closing_date: box.closedAt ? formatDate(box.closedAt) : "—",
      opening_balance: box.openingBalance,
      closing_balance: box.closingBalance,
      real_balance: box.realBalance,
      state: box.isOpen ? "Aperturada" : "Cerrada",
    };
    if (type === "cash") {
      return { data: [{ ...base, concept: "Efectivo en caja", amount: box.realBalance }] };
    }
    if (type === "products") {
      const items = await prisma.item.findMany({ take: 15, orderBy: { description: "asc" } });
      return {
        data: items.map((i) => ({
          internal_id: i.internalId,
          description: i.description,
          stock: i.stock,
          sale_unit_price: i.saleUnitPrice,
        })),
      };
    }
    if (type === "income") {
      return {
        data: [{ ...base, concept: "Ingresos del día", amount: Math.max(0, box.realBalance - box.openingBalance) }],
      };
    }
    return { data: [base] };
  }

  if (method === "POST" && path === "cash/toggle") {
    const p = body as Record<string, unknown>;
    const id = Number(p.id);
    const box = await prisma.cashRegister.findUnique({ where: { id } });
    if (!box) throw new Error("Caja no encontrada");
    const isOpen = !box.isOpen;
    const updated = await prisma.cashRegister.update({
      where: { id },
      data: {
        isOpen,
        openedAt: isOpen ? new Date() : null,
        openingBalance: isOpen ? Number(p.balance || 0) : box.openingBalance,
        currentBalance: isOpen ? Number(p.balance || 0) : box.currentBalance,
      },
    });
    return { success: true, data: { id: updated.id, is_open: updated.isOpen } };
  }

  // ── Establecimientos / Usuarios ──
  if (method === "GET" && path === "establishments/records") {
    const data = await prisma.establishment.findMany({ where: { active: true } });
    return { data: data.map((e) => ({ id: e.id, code: e.code, description: e.description, active: e.active })) };
  }

  if (method === "GET" && path === "users/records") {
    const data = await prisma.user.findMany({ include: { establishment: true } });
    return {
      data: data.map((u) => {
        const row = u as typeof u & { permissions?: string | null; active?: boolean };
        let perms: string[] = [];
        try {
          perms = row.permissions ? JSON.parse(row.permissions) : [];
        } catch {
          perms = [];
        }
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          type: u.type,
          active: row.active !== false,
          establishment: u.establishment.description,
          establishment_id: u.establishmentId,
          permissions: perms,
          permissions_count: u.type === "admin" ? ALL_PERMISSION_KEYS.length : perms.length,
        };
      }),
    };
  }

  if (method === "POST" && path === "users") {
    const p = body as Record<string, unknown>;
    const hash = await bcrypt.hash(String(p.password || "123456"), 10);
    const user = await prisma.user.create({
      data: {
        name: String(p.name || ""),
        email: String(p.email || ""),
        password: hash,
        type: String(p.type || "seller"),
        establishmentId: Number(p.establishment_id),
        permissions: JSON.stringify((p.permissions as string[]) ?? []),
        active: p.active !== false,
      } as never,
    });
    return { success: true, data: { id: user.id, name: user.name, email: user.email } };
  }

  if (method === "PUT" && path.match(/^users\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const p = body as Record<string, unknown>;
    const data: Record<string, unknown> = {
      name: String(p.name || ""),
      email: String(p.email || ""),
      type: String(p.type || "seller"),
      establishmentId: Number(p.establishment_id),
      permissions: JSON.stringify((p.permissions as string[]) ?? []),
      active: p.active !== false,
    };
    if (p.password) data.password = await bcrypt.hash(String(p.password), 10);
    const user = await prisma.user.update({ where: { id }, data: data as never });
    return { success: true, data: user };
  }

  if (method === "DELETE" && path.match(/^users\/\d+$/)) {
    await prisma.user.delete({ where: { id: Number(path.split("/")[1]) } });
    return { success: true };
  }

  if (method === "GET" && path === "backup/export") {
    const [items, customers, documents, purchases, inventory] = await Promise.all([
      prisma.item.findMany(),
      prisma.customer.findMany(),
      readImportedModule("documents"),
      readImportedModule("purchases"),
      readImportedModule("inventory"),
    ]);
    return {
      exported_at: new Date().toISOString(),
      items,
      customers,
      documents,
      purchases,
      inventory,
    };
  }

  if (method === "GET" && path === "exchange_rates/records") {
    const row = await prisma.appSetting.findUnique({ where: { key: "exchange_rate_sale" } });
    const rate = row?.value || "3.396";
    return {
      data: [{ id: 1, date: formatDate(new Date()), sale: rate, purchase: rate }],
    };
  }

  if (method === "POST" && path === "exchange_rates") {
    const p = body as Record<string, unknown>;
    const rate = String(p.sale || p.value || "3.396");
    await prisma.appSetting.upsert({
      where: { key: "exchange_rate_sale" },
      create: { key: "exchange_rate_sale", value: rate },
      update: { value: rate },
    });
    return { success: true, data: { sale: rate } };
  }

  if (method === "GET" && path === "finances/movements/records") {
    const docs = await prisma.document.findMany({
      take: 50,
      orderBy: { id: "desc" },
      include: { customer: true },
    });
    return {
      data: docs.map((d) => ({
        id: d.id,
        date: formatDate(d.dateOfIssue),
        type: "Ingreso",
        description: `${getDocTypeDescription(d.documentTypeId)} ${d.fullNumber}`,
        customer: d.customer.name,
        amount: d.total,
        currency: d.currencyTypeId,
      })),
    };
  }

  if (method === "POST" && path.match(/^documents\/\d+\/email$/)) {
    const id = Number(path.split("/")[1]);
    const doc = await prisma.document.findUnique({ where: { id }, include: { customer: true } });
    if (!doc) throw new Error("Comprobante no encontrado");
    const p = body as Record<string, unknown>;
    const email = String(p.email || doc.customer.email || "");
    if (!email) throw new Error("Email requerido");
    return { success: true, message: `Comprobante ${doc.fullNumber} enviado a ${email}` };
  }

  if (method === "POST" && path.match(/^documents\/\d+\/resend$/)) {
    const id = Number(path.split("/")[1]);
    const { sendDocumentToSunat } = await import("@/lib/sunat/send-document");
    const doc = await prisma.document.findUnique({ where: { id } });
    if (doc) {
      const result = await sendDocumentToSunat(id);
      if (!result.success) throw new Error(result.message);
      return { success: true, message: result.message, mode: result.mode };
    }
    for (const key of ["imported_documents", "imported_documents_not_sent"] as const) {
      const settingKey = key === "imported_documents" ? "imported_documents" : "imported_documents_not_sent";
      const imported = await readImportedModule(key === "imported_documents" ? "documents" : "documents_not_sent");
      if (!imported?.length) continue;
      const idx = imported.findIndex((d) => Number(d.id) === id);
      if (idx >= 0) {
        imported[idx] = { ...imported[idx], has_xml: true, has_cdr: true, state_type_description: "Enviado" };
        await prisma.appSetting.upsert({
          where: { key: settingKey },
          create: { key: settingKey, value: JSON.stringify(imported) },
          update: { value: JSON.stringify(imported) },
        });
        return { success: true, message: "Comprobante reenviado a SUNAT" };
      }
    }
    throw new Error("Comprobante no encontrado");
  }

  // ── Servicios ──
  if (method === "GET" && path === "services/records") {
    const data = await prisma.item.findMany({
      where: { kind: "service", active: true },
      include: { category: true },
      orderBy: { description: "asc" },
    });
    return {
      data: data.map((i) => ({
        id: i.id,
        internal_id: i.internalId,
        description: i.description,
        unit_type_id: i.unitTypeId,
        sale_unit_price: i.saleUnitPrice,
        category: i.category?.name,
      })),
    };
  }

  if (method === "POST" && path === "services") {
    const p = body as Record<string, unknown>;
    const item = await prisma.item.create({
      data: {
        description: String(p.description || ""),
        internalId: p.internal_id ? String(p.internal_id) : null,
        unitTypeId: "ZZ",
        kind: "service",
        saleUnitPrice: Number(p.sale_unit_price || 0),
        stock: 0,
        categoryId: p.category_id ? Number(p.category_id) : null,
      },
    });
    return { success: true, data: item };
  }

  // ── Guías de remisión ──
  if (method === "GET" && path === "dispatches/records") {
    const imported = await readImportedModule("dispatches");
    if (imported?.length) {
      return { data: imported.map(mapImportedDispatch), meta: { total: imported.length } };
    }
    const data = await prisma.dispatch.findMany({
      include: { customer: true },
      orderBy: { id: "desc" },
    });
    return {
      data: data.map((d) => ({
        id: d.id,
        number: d.number,
        customer_name: d.customer.name,
        date_of_issue: formatDate(d.dateOfIssue),
        date: formatDate(d.dateOfIssue),
        transfer_reason: d.transferReason,
        vehicle_plate: (d as { vehiclePlate?: string }).vehiclePlate ?? d.plate,
        driver_name: (d as { driverName?: string }).driverName,
        state: d.state,
        state_type_description: d.state,
      })),
    };
  }

  if (method === "GET" && path.match(/^dispatches\/\d+$/)) {
    const id = Number(path.split("/")[1]);
    const imported = await readImportedModule("dispatches");
    const found = imported?.find((d) => Number(d.id) === id);
    if (found) {
      return {
        data: {
          ...mapImportedDispatch(found),
          origin_address: found.origin_address ?? found.address_origin,
          dest_address: found.delivery_address ?? found.address_destination,
          items: (found.items as Record<string, unknown>[]) ?? [],
        },
      };
    }
    const d = await prisma.dispatch.findUnique({
      where: { id },
      include: { customer: true, items: true },
    });
    if (!d) throw new Error("Guía no encontrada");
    const row = d as typeof d & { vehiclePlate?: string; driverName?: string; driverDocument?: string; modeTransport?: string; totalWeight?: number };
    return {
      data: {
        id: d.id,
        number: d.number,
        customer_name: d.customer.name,
        date_of_issue: formatDate(d.dateOfIssue),
        transfer_reason: d.transferReason,
        origin_address: d.originAddress,
        dest_address: d.destAddress,
        vehicle_plate: row.vehiclePlate,
        driver_name: row.driverName,
        driver_document: row.driverDocument,
        mode_transport: row.modeTransport,
        total_weight: row.totalWeight,
        state: d.state,
        items: d.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_type_id: i.unitTypeId,
        })),
      },
    };
  }

  if (method === "POST" && path === "dispatches") {
    const p = body as Record<string, unknown>;
    const items = (p.items as Record<string, unknown>[]) || [];
    const num = await nextCounter("dispatch_counter");
    const number = `T001-${String(num).padStart(4, "0")}`;
    const dispatch = await prisma.dispatch.create({
      data: {
        number,
        customerId: Number(p.customer_id),
        dateOfIssue: new Date(String(p.date_of_issue || new Date())),
        transferReason: String(p.transfer_reason || "Venta"),
        modeTransport: String(p.mode_transport || "02"),
        originAddress: p.origin_address ? String(p.origin_address) : null,
        destAddress: p.dest_address ? String(p.dest_address) : null,
        plate: p.vehicle_plate ? String(p.vehicle_plate) : null,
        vehiclePlate: p.vehicle_plate ? String(p.vehicle_plate) : null,
        driverName: p.driver_name ? String(p.driver_name) : null,
        driverDocument: p.driver_document ? String(p.driver_document) : null,
        totalWeight: Number(p.total_weight || 0),
        items: {
          create: items.map((it) => ({
            description: String(it.description || ""),
            quantity: Number(it.quantity || 1),
            unitTypeId: String(it.unit_type_id || "NIU"),
          })),
        },
      } as never,
    });
    return { success: true, data: dispatch };
  }

  // ── Pedidos ──
  if (method === "GET" && path === "order-notes/records") {
    const data = await prisma.orderNote.findMany({
      include: { customer: true },
      orderBy: { id: "desc" },
    });
    return {
      data: data.map((n) => ({
        id: n.id,
        number: n.number,
        customer_name: n.customer.name,
        date: formatDate(n.date),
        total: n.total,
        state: n.state,
      })),
    };
  }

  if (method === "POST" && path === "order-notes") {
    const p = body as Record<string, unknown>;
    const items = (p.items as Record<string, unknown>[]) || [];
    const num = await nextCounter("order_note_counter");
    const number = `PED-${String(num).padStart(4, "0")}`;
    let total = 0;
    const lineItems = items.map((it) => {
      const qty = Number(it.quantity || 1);
      const price = Number(it.unit_price || 0);
      const t = qty * price;
      total += t;
      return { description: String(it.description || ""), quantity: qty, unitPrice: price, total: t };
    });
    const note = await prisma.orderNote.create({
      data: { number, customerId: Number(p.customer_id), total, items: { create: lineItems } },
    });
    return { success: true, data: note };
  }

  // ── SIRE ──
  if (method === "GET" && path === "sire/sales/records") {
    const docs = await fetchDocuments();
    return {
      data: docs.map((d) => ({
        period: formatDate(d.dateOfIssue).slice(0, 7),
        document_type: getDocTypeDescription(d.documentTypeId),
        number: d.fullNumber,
        customer: d.customer.name,
        customer_number: d.customer.number,
        total: d.total,
        igv: d.totalIgv,
        state: getStateDescription(d.stateTypeId),
      })),
    };
  }

  if (method === "GET" && path === "sire/purchases/records") {
    const data = await prisma.purchase.findMany({ include: { supplier: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((p) => ({
        period: formatDate(p.date).slice(0, 7),
        number: p.number,
        supplier: p.supplier.name,
        supplier_number: p.supplier.number,
        total: p.total,
        state: p.state,
      })),
    };
  }

  if (method === "GET" && path === "sire/annexes/records") {
    const { getCompanySunatConfig } = await import("@/lib/sunat/company-config");
    const { getSireAnnexesStatus } = await import("@/lib/sunat/sire");
    const config = await getCompanySunatConfig();
    const period = searchParams.get("period") || undefined;
    if (config?.api_sunat_id && config?.api_sunat_secret) {
      try {
        const data = await getSireAnnexesStatus(config, period);
        return { data };
      } catch {
        /* fallback local */
      }
    }
    const [sales, purchases] = await Promise.all([
      prisma.document.count(),
      prisma.purchase.count(),
    ]);
    return {
      data: [
        { id: 1, name: "RVIE - Registro de ventas", records: sales, status: "Pendiente" },
        { id: 2, name: "RCE - Registro de compras", records: purchases, status: "Pendiente" },
      ],
    };
  }

  // ── Contabilidad ──
  if (method === "GET" && path === "accounting/chart/records") {
    const data = await prisma.account.findMany({ orderBy: { code: "asc" } });
    return { data: data.map((a) => ({ id: a.id, code: a.code, name: a.name, type: a.type })) };
  }

  if (method === "GET" && path === "accounting/daily/records") {
    const data = await prisma.journalEntry.findMany({ orderBy: { id: "desc" }, take: 200 });
    return {
      data: data.map((e) => ({
        id: e.id,
        date: formatDate(e.date),
        reference: e.reference,
        description: e.description,
        account_code: e.accountCode,
        account_name: e.accountName,
        debit: e.debit,
        credit: e.credit,
      })),
    };
  }

  if (method === "GET" && path === "accounting/entries/records") {
    const refs = await prisma.journalEntry.groupBy({ by: ["reference"], _count: true });
    return {
      data: refs.filter((r) => r.reference).map((r, i) => ({
        id: i + 1,
        reference: r.reference,
        entries: r._count,
        type: "Automático",
      })),
    };
  }

  // ── Finanzas extendidas ──
  if (method === "GET" && path === "finances/to-pay/records") {
    const data = await prisma.purchase.findMany({ include: { supplier: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((p) => ({
        id: p.id,
        date: formatDate(p.date),
        supplier: p.supplier.name,
        document: p.number,
        amount: p.total,
        due_date: formatDate(p.date),
        state: "Pendiente",
      })),
    };
  }

  if (method === "GET" && path === "finances/to-collect/records") {
    const docs = await fetchDocuments();
    return {
      data: docs.map((d) => ({
        id: d.id,
        date: formatDate(d.dateOfIssue),
        customer: d.customer.name,
        document: d.fullNumber,
        amount: d.total,
        due_date: formatDate(d.dateOfDue),
        state: d.hasCdr ? "Cobrado" : "Pendiente",
      })),
    };
  }

  if (method === "GET" && path === "finances/income/records") {
    const docs = await prisma.document.findMany({ orderBy: { id: "desc" }, take: 50 });
    return {
      data: docs.map((d) => ({
        id: d.id,
        date: formatDate(d.dateOfIssue),
        description: `Ingreso ${d.fullNumber}`,
        amount: d.total,
      })),
    };
  }

  // ── POS ──
  if (method === "GET" && path === "pos/tables") {
    const dbItemCount = await prisma.item.count();
    const {
      shouldUseImportedItems,
      loadImportedItems,
      mapImportedItem,
    } = await import("@/lib/imported-catalog");

    if (await shouldUseImportedItems(dbItemCount)) {
      const importedPos = await readImportedJson("pos_tables");
      const seriesRows = await prisma.series.findMany();
      const seriesPayload = seriesRows.map((s) => ({
        id: s.id,
        number: s.number,
        document_type_id: s.documentTypeId,
      }));

      if (importedPos && typeof importedPos === "object" && !Array.isArray(importedPos)) {
        const { ensureDefaultCategories, mergeCategoriesList } = await import("@/lib/default-categories");
        await ensureDefaultCategories();
        const dbCats = await prisma.category.findMany();
        const categories = mergeCategoriesList(dbCats.map((c) => ({ id: c.id, name: c.name })));
        return {
          ...(importedPos as Record<string, unknown>),
          categories,
          series: seriesPayload.length ? seriesPayload : (importedPos as Record<string, unknown>).series,
        };
      }
      const rawItems = await loadImportedItems();
      const items = rawItems.filter((r) => r.active !== false).map(mapImportedItem);
      const { ensureDefaultCategories, mergeCategoriesList } = await import("@/lib/default-categories");
      await ensureDefaultCategories();
      const dbCats = await prisma.category.findMany();
      const categories = mergeCategoriesList(dbCats.map((c) => ({ id: c.id, name: c.name })));
      const nameToId = Object.fromEntries(categories.map((c) => [c.name.toUpperCase(), c.id]));
      return {
        categories,
        series: seriesPayload,
        items: items.map((i) => ({
          id: i.id,
          description: i.description,
          full_description: i.description,
          sale_unit_price: i.sale_unit_price,
          stock: i.stock,
          unit_type_id: i.unit_type_id,
          category_id: nameToId[String(i.category || "").toUpperCase()] ?? i.category_id,
          category_name: String(i.category || ""),
          internal_id: i.internal_id,
          barcode: i.barcode,
          image_url_small: i.image_url_small,
          image_url: i.image_url,
        })),
      };
    }

    const { ensureDefaultCategories, mergeCategoriesList } = await import("@/lib/default-categories");
    await ensureDefaultCategories();
    const categories = mergeCategoriesList(
      (await prisma.category.findMany()).map((c) => ({ id: c.id, name: c.name }))
    );
    const items = await prisma.item.findMany({ where: { active: true }, include: { category: true } });
    const seriesRows = await prisma.series.findMany();
    return {
      categories,
      series: seriesRows.map((s) => ({ id: s.id, number: s.number, document_type_id: s.documentTypeId })),
      items: items.map((i) => ({
        id: i.id,
        description: i.description,
        full_description: i.description,
        sale_unit_price: i.saleUnitPrice,
        stock: i.stock,
        unit_type_id: i.unitTypeId,
        category_id: i.categoryId,
        category_name: i.category?.name ?? "",
        internal_id: i.internalId,
        barcode: i.barcode,
        image_url_small: i.imageUrl,
        image_url: i.imageUrl,
      })),
    };
  }

  if (method === "POST" && path === "pos/sale") {
    const { processPosCheckout } = await import("@/lib/pos-checkout");
    return processPosCheckout((body || {}) as Record<string, unknown>);
  }

  const emptyModules = [
    "inventory-references/records",
    "transfers/records",
    "voided/records",
    "summaries/records",
    "dispatches-carrier/records",
    "transports/records",
    "drivers/records",
    "vehicles/records",
  ];

  if (method === "GET" && path.startsWith("reports/")) {
    return handleReportRequest(path);
  }

  const passthroughDocumentViews = [
    "documents/massive/records",
  ];

  if (method === "GET" && passthroughDocumentViews.includes(path)) {
    return { data: [], meta: { total: 0 } };
  }

  if (method === "GET" && emptyModules.includes(path)) {
    const data = await readGenericRecords(path);
    return { data, meta: { total: data.length } };
  }

  // Fallback genérico: cualquier módulo del menú con /records
  if (method === "GET" && path.endsWith("/records")) {
    const data = await readGenericRecords(path);
    return { data, meta: { total: data.length } };
  }

  if (method === "POST") {
    const recordsPath = path.endsWith("/records") ? path : `${path}/records`;
    const record = await appendGenericRecord(recordsPath, (body || {}) as Record<string, unknown>);
    return { success: true, data: record };
  }

  const genericId = parseGenericIdPath(path);
  if (genericId) {
    const recordsPath = `${genericId.modulePath}/records`;
    if (method === "PUT") {
      const record = await updateGenericRecord(recordsPath, genericId.id, (body || {}) as Record<string, unknown>);
      return { success: true, data: record };
    }
    if (method === "DELETE") {
      return deleteGenericRecord(recordsPath, genericId.id);
    }
  }

  throw new Error(`Ruta local no implementada: ${method} /${path}`);
}
