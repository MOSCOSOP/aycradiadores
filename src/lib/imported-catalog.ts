import { readImportedModule } from "@/lib/imported-data";

const IMPORTED_MIN_ITEMS = 50;

type Paginated<T> = {
  data: T[];
  meta: { total: number; page: number; limit: number; last_page: number };
};

let cachedItems: Record<string, unknown>[] | null = null;
let cachedCustomers: Record<string, unknown>[] | null = null;

export function clearImportedCatalogCache() {
  cachedItems = null;
  cachedCustomers = null;
}

export async function shouldUseImportedItems(dbCount: number) {
  return dbCount < IMPORTED_MIN_ITEMS;
}

export async function loadImportedItems() {
  if (cachedItems) return cachedItems;
  cachedItems = (await readImportedModule("items")) ?? [];
  return cachedItems;
}

export async function loadImportedCustomers() {
  if (cachedCustomers) return cachedCustomers;
  cachedCustomers = (await readImportedModule("customers")) ?? [];
  return cachedCustomers;
}

export function mapImportedItem(row: Record<string, unknown>) {
  const imp = (row._import as Record<string, unknown>) || {};
  const cat = row.category as { id?: number; name?: string } | undefined;
  const salePrice = Number(imp.sale_unit_price ?? row.amount_sale_unit_price ?? 0);
  const purchasePrice = Number(imp.purchase_price ?? 0);
  const stock = Number((imp.stock ?? parseFloat(String(row.stock ?? 0))) || 0);
  const image =
    (row.local_image ? String(row.local_image) : null) ??
    (row.image_url_small ? String(row.image_url_small) : null) ??
    (row.image_url ? String(row.image_url) : null);

  return {
    id: row.id,
    local_id: row.id,
    internal_id: row.internal_id ?? row.barcode ?? null,
    description: String(row.description ?? row.name ?? ""),
    name: String(row.description ?? row.name ?? ""),
    second_name: row.second_name ?? null,
    description_detail: row.description_detail ?? null,
    model: row.model ?? null,
    unit_type_id: String(row.unit_type_id ?? "NIU"),
    sale_unit_price: salePrice,
    sale_unit_price_with_igv: `S/ ${salePrice.toFixed(2)}`,
    purchase_unit_price: `S/ ${purchasePrice.toFixed(2)}`,
    purchase_price: purchasePrice,
    stock,
    stock_min: Number(row.stock_min ?? 0),
    location: null,
    category: cat?.name ?? row.category_description ?? "",
    category_description: cat?.name ?? row.category_description ?? "",
    has_igv_description: row.has_igv !== false ? "Si" : "No",
    has_igv: row.has_igv !== false,
    barcode: row.barcode ?? null,
    brand: row.brand ?? null,
    sale_affectation_igv_type_id: String(row.sale_affectation_igv_type_id ?? "10"),
    image_url_small: image,
    image_url: image,
    active: row.active !== false,
    category_id: cat?.id ?? null,
  };
}

/** Superpone datos vivos de Prisma sobre ítems importados y agrega productos nuevos. */
export async function mergeImportedItemsWithLiveStock(rows: Record<string, unknown>[]) {
  const { prisma } = await import("@/lib/db/prisma");
  const live = await prisma.item.findMany({
    include: { category: true },
  });
  const byRemote = new Map(live.filter((i) => i.sourceRemoteId).map((i) => [i.sourceRemoteId!, i]));
  const byInternal = new Map(live.filter((i) => i.internalId).map((i) => [i.internalId!, i]));
  const byId = new Map(live.map((i) => [i.id, i]));
  const used = new Set<number>();

  const merged = rows.map((row) => {
    const mapped = mapImportedItem(row);
    const remoteId = Number(row.id);
    const match =
      byRemote.get(remoteId) ??
      (mapped.internal_id ? byInternal.get(String(mapped.internal_id)) : undefined) ??
      byId.get(remoteId);
    if (!match) return mapped;
    used.add(match.id);
    return {
      ...mapped,
      stock: match.stock,
      stock_min: match.stockMin,
      local_id: match.id,
      sale_unit_price: match.saleUnitPrice || mapped.sale_unit_price,
      purchase_price: match.purchasePrice || mapped.purchase_price,
      image_url: match.imageUrl || mapped.image_url,
      image_url_small: match.imageUrl || mapped.image_url_small,
      hyperlink: match.hyperlink ?? "",
      observations: match.observations ?? "",
      sunat_code: match.sunatCode ?? "",
      specifications: match.specifications ?? "",
      product_line: match.productLine ?? "",
      weight_kg: match.weightKg ?? "",
      brand: match.brand ?? mapped.brand,
      location: match.location ?? mapped.location,
      category_id: match.categoryId ?? mapped.category_id,
    };
  });

  const extras = live
    .filter((item) => !used.has(item.id) && !item.sourceRemoteId)
    .map((item) => ({
      id: item.id,
      local_id: item.id,
      internal_id: item.internalId,
      description: item.description,
      name: item.description,
      second_name: item.secondaryName,
      description_detail: item.descriptionDetail,
      model: item.model,
      unit_type_id: item.unitTypeId,
      sale_unit_price: item.saleUnitPrice,
      sale_unit_price_with_igv: `S/ ${item.saleUnitPrice.toFixed(2)}`,
      purchase_unit_price: `S/ ${item.purchasePrice.toFixed(2)}`,
      purchase_price: item.purchasePrice,
      stock: item.stock,
      stock_min: item.stockMin,
      location: item.location,
      category: item.category?.name ?? "",
      category_description: item.category?.name ?? "",
      category_id: item.categoryId,
      has_igv_description: item.hasIgv ? "Si" : "No",
      has_igv: item.hasIgv,
      barcode: item.barcode,
      brand: item.brand,
      sale_affectation_igv_type_id: item.saleAffectationTypeId,
      image_url_small: item.imageUrl,
      image_url: item.imageUrl,
      hyperlink: item.hyperlink ?? "",
      observations: item.observations ?? "",
      sunat_code: item.sunatCode ?? "",
      specifications: item.specifications ?? "",
      product_line: item.productLine ?? "",
      weight_kg: item.weightKg ?? "",
      active: item.active,
    }));

  return [...extras, ...merged];
}

export function mapImportedCustomer(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    identity_document_type_id: row.identity_document_type_id ?? "6",
    email: row.email ?? "",
    telephone: row.telephone ?? "",
    address: row.address ?? "",
    trade_name: row.trade_name ?? "",
    country: row.country ?? "PE",
    ubigeo: row.ubigeo ?? "",
    has_vehicle: row.has_vehicle ?? false,
    vehicles: row.vehicles ?? null,
  };
}

export function paginateImported<T>(
  rows: T[],
  page: number,
  limit: number,
  filter?: (row: T) => boolean
): Paginated<T> {
  const filtered = filter ? rows.filter(filter) : rows;
  const total = filtered.length;
  const last_page = Math.max(1, Math.ceil(total / limit));
  const data = filtered.slice((page - 1) * limit, page * limit);
  return { data, meta: { total, page, limit, last_page } };
}

export function filterImportedItems(
  rows: Record<string, unknown>[],
  value: string,
  column: string
) {
  if (!value) return rows;
  const q = value.toLowerCase();
  return rows.filter((r) => {
    const mapped = mapImportedItem(r);
    if (column === "internal_id") return String(mapped.internal_id ?? "").toLowerCase().includes(q);
    if (column === "search") {
      return (
        String(mapped.description).toLowerCase().includes(q) ||
        String(mapped.internal_id ?? "").toLowerCase().includes(q) ||
        String(mapped.barcode ?? "").toLowerCase().includes(q)
      );
    }
    if (column === "name" || column === "description") {
      return String(mapped.description).toLowerCase().includes(q);
    }
    return Object.values(mapped).some((v) => String(v ?? "").toLowerCase().includes(q));
  });
}

export function filterImportedCustomers(
  rows: Record<string, unknown>[],
  value: string,
  column: string
) {
  if (!value) return rows;
  const q = value.toLowerCase();
  return rows.filter((r) => {
    if (column === "search") {
      return (
        String(r.name ?? "").toLowerCase().includes(q) ||
        String(r.number ?? "").toLowerCase().includes(q)
      );
    }
    if (column === "number") return String(r.number ?? "").toLowerCase().includes(q);
    return String(r.name ?? "").toLowerCase().includes(q);
  });
}
