import { prisma } from "@/lib/db/prisma";
import { getSoldQuantitiesByItem } from "@/lib/stock-sync";

export type InventoryReportRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  stock_min: number;
  stock: number;
  products_sold: number;
  sale_unit_price: number;
  purchase_price: number;
  profit: number;
  total_profit: number;
  brand: string;
  expiration_date: string;
  establishment: string;
  barcode: string;
  internal_id: string;
};

export async function buildInventoryReportRows(): Promise<InventoryReportRow[]> {
  const { repairAllImportedStockFromPrisma } = await import("@/lib/stock-sync");
  await repairAllImportedStockFromPrisma();

  const [items, soldMap, establishment] = await Promise.all([
    prisma.item.findMany({
      where: { active: true, kind: "product" },
      include: { category: true },
      orderBy: { description: "asc" },
    }),
    getSoldQuantitiesByItem(),
    prisma.establishment.findFirst({ where: { active: true } }),
  ]);

  const estName = establishment?.description ?? "Oficina Principal";

  return items.map((i) => {
    const profit = Number((i.saleUnitPrice - i.purchasePrice).toFixed(2));
    return {
      id: i.id,
      name: i.description,
      description: i.description,
      category: i.category?.name ?? "",
      stock_min: i.stockMin,
      stock: i.stock,
      products_sold: soldMap.get(i.id) ?? 0,
      sale_unit_price: i.saleUnitPrice,
      purchase_price: i.purchasePrice,
      profit,
      total_profit: Number((profit * i.stock).toFixed(2)),
      brand: i.brand ?? "",
      expiration_date: "",
      establishment: estName,
      barcode: i.barcode ?? i.internalId ?? "",
      internal_id: i.internalId ?? "",
    };
  });
}
