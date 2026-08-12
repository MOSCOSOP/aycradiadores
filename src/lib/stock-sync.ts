import { prisma } from "@/lib/db/prisma";
import { readImportedModule } from "@/lib/imported-data";

async function upsertImportedRows(moduleKey: string, rows: Record<string, unknown>[]) {
  await prisma.appSetting.upsert({
    where: { key: `imported_${moduleKey}` },
    create: { key: `imported_${moduleKey}`, value: JSON.stringify(rows) },
    update: { value: JSON.stringify(rows) },
  });
}

function matchItemRow(
  row: Record<string, unknown>,
  item: { id: number; sourceRemoteId: number | null; internalId: string | null; description: string }
) {
  const rid = Number(row.id);
  if (rid === item.id || rid === item.sourceRemoteId) return true;
  const code = String(row.internal_id ?? row.barcode ?? "");
  if (item.internalId && code && code === item.internalId) return true;
  const desc = String(row.description ?? row.name ?? "");
  if (desc && item.description && desc === item.description) return true;
  return false;
}

function matchInventoryRow(
  row: Record<string, unknown>,
  item: { internalId: string | null; description: string }
) {
  const code = String(row.item_internal_id ?? "");
  if (item.internalId && code && code === item.internalId) return true;
  const desc = String(row.item_description ?? "");
  if (desc && item.description && (desc === item.description || item.description.includes(desc.slice(0, 40)))) return true;
  return false;
}

/** Sincroniza el stock en Prisma + cachés importados (items e inventario). */
export async function syncItemStockEverywhere(itemId: number, newStock: number) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return;

  const importedItems = await readImportedModule("items");
  if (importedItems?.length) {
    let changed = false;
    const next = importedItems.map((row) => {
      if (!matchItemRow(row, item)) return row;
      changed = true;
      const imp = (row._import as Record<string, unknown>) || {};
      return {
        ...row,
        stock: newStock,
        _import: { ...imp, stock: newStock },
      };
    });
    if (changed) await upsertImportedRows("items", next);
  }

  const importedInv = await readImportedModule("inventory");
  if (importedInv?.length) {
    let changed = false;
    const next = importedInv.map((row) => {
      if (!matchInventoryRow(row, item)) return row;
      changed = true;
      return { ...row, stock: newStock, updated_at: new Date().toISOString().slice(0, 19) };
    });
    if (changed) await upsertImportedRows("inventory", next);
  }

  const { clearImportedCatalogCache } = await import("@/lib/imported-catalog");
  clearImportedCatalogCache();
}

/** Repara stock en cachés importadas desde Prisma (una pasada). */
export async function repairAllImportedStockFromPrisma() {
  const items = await prisma.item.findMany({
    select: { id: true, sourceRemoteId: true, internalId: true, description: true, stock: true },
  });
  if (!items.length) return;

  const importedItems = await readImportedModule("items");
  if (importedItems?.length) {
    let changed = false;
    const next = importedItems.map((row) => {
      const match = items.find((i) => matchItemRow(row, i));
      if (!match) return row;
      changed = true;
      const imp = (row._import as Record<string, unknown>) || {};
      return { ...row, stock: match.stock, _import: { ...imp, stock: match.stock } };
    });
    if (changed) await upsertImportedRows("items", next);
  }

  const importedInv = await readImportedModule("inventory");
  if (importedInv?.length) {
    const byCode = new Map(items.filter((i) => i.internalId).map((i) => [i.internalId!, i]));
    let changed = false;
    const next = importedInv.map((row) => {
      const code = String(row.item_internal_id ?? "");
      const match = (code && byCode.get(code)) ?? items.find((i) => matchInventoryRow(row, i));
      if (!match) return row;
      if (Number(row.stock) === match.stock) return row;
      changed = true;
      return { ...row, stock: match.stock, updated_at: new Date().toISOString().slice(0, 19) };
    });
    if (changed) await upsertImportedRows("inventory", next);
  }

  const { clearImportedCatalogCache } = await import("@/lib/imported-catalog");
  clearImportedCatalogCache();
}

/** Obtiene cantidades vendidas por itemId desde comprobantes y notas. */
export async function getSoldQuantitiesByItem(): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  const docLines = await prisma.documentItem.findMany({
    where: { itemId: { not: null } },
    select: { itemId: true, quantity: true },
  });
  for (const line of docLines) {
    if (!line.itemId) continue;
    map.set(line.itemId, (map.get(line.itemId) ?? 0) + line.quantity);
  }
  const noteItems = await prisma.saleNoteItem.findMany({ select: { description: true, quantity: true } });
  if (noteItems.length) {
    const items = await prisma.item.findMany({ select: { id: true, description: true } });
    for (const ni of noteItems) {
      const match = items.find((i) => i.description === ni.description || ni.description.includes(i.description.slice(0, 30)));
      if (match) map.set(match.id, (map.get(match.id) ?? 0) + ni.quantity);
    }
  }
  return map;
}
