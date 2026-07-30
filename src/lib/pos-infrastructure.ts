import { prisma } from "@/lib/db/prisma";
import {
  loadImportedCustomers,
  loadImportedItems,
  mapImportedItem,
} from "@/lib/imported-catalog";

export async function ensurePosInfrastructure() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: process.env.COMPANY_NAME || "ALVARES ROSALES ARCIBES BENITO",
        tradeName: process.env.COMPANY_TRADE_NAME || "A&c RADIADORES",
        ruc: process.env.COMPANY_RUC || "10447860428",
      },
    });
  }

  let establishment = await prisma.establishment.findFirst();
  if (!establishment) {
    establishment = await prisma.establishment.create({
      data: {
        code: "0000",
        description: "Oficina Principal",
        companyId: company.id,
      },
    });
  }

  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error(
      "No hay usuario administrador. En Supabase ejecuta: npx prisma db push && npm run db:seed"
    );
  }

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: "Clientes - Varios",
        number: "99999999",
        identityDocumentTypeId: "0",
      },
    });
  }

  let series = await prisma.series.findFirst({ where: { documentTypeId: "03" } });
  if (!series) {
    series = await prisma.series.create({
      data: {
        number: "B001",
        documentTypeId: "03",
        establishmentId: establishment.id,
        currentNumber: 0,
      },
    });
  }

  const invoiceSeries = await prisma.series.findFirst({ where: { documentTypeId: "01" } });
  if (!invoiceSeries) {
    await prisma.series.create({
      data: {
        number: "F001",
        documentTypeId: "01",
        establishmentId: establishment.id,
        currentNumber: 0,
      },
    });
  }

  return { company, establishment, user, customer, series };
}

export async function resolvePosCustomerId(customerId?: unknown): Promise<number> {
  await ensurePosInfrastructure();

  if (customerId != null && customerId !== "") {
    const id = Number(customerId);
    if (!Number.isNaN(id)) {
      const byId = await prisma.customer.findUnique({ where: { id } });
      if (byId) return byId.id;

      const imported = await loadImportedCustomers();
      const imp = imported.find((c) => Number(c.id) === id);
      if (imp) {
        const number = String(imp.number ?? "").trim();
        let existing = number
          ? await prisma.customer.findFirst({ where: { number } })
          : null;
        if (!existing) {
          existing = await prisma.customer.create({
            data: {
              name: String(imp.name ?? "Cliente"),
              number: number || "00000000",
              identityDocumentTypeId: String(imp.identity_document_type_id ?? "6"),
              email: imp.email ? String(imp.email) : null,
              telephone: imp.telephone ? String(imp.telephone) : null,
              address: imp.address ? String(imp.address) : null,
              tradeName: imp.trade_name ? String(imp.trade_name) : null,
            },
          });
        }
        return existing.id;
      }
    }
  }

  const fallback = await prisma.customer.findFirst({ orderBy: { id: "asc" } });
  if (!fallback) throw new Error("No hay clientes configurados");
  return fallback.id;
}

export async function resolvePosItemId(remoteOrLocalId: unknown): Promise<number | null> {
  const id = Number(remoteOrLocalId);
  if (!id || Number.isNaN(id)) return null;

  const byLocal = await prisma.item.findUnique({ where: { id } });
  if (byLocal) return byLocal.id;

  const byRemote = await prisma.item.findFirst({ where: { sourceRemoteId: id } });
  if (byRemote) return byRemote.id;

  const imported = await loadImportedItems();
  const row = imported.find((i) => Number(i.id) === id);
  if (!row) return null;

  const mapped = mapImportedItem(row);
  const created = await prisma.item.create({
    data: {
      sourceRemoteId: id,
      internalId: mapped.internal_id ? String(mapped.internal_id) : null,
      description: mapped.description,
      unitTypeId: mapped.unit_type_id,
      saleUnitPrice: mapped.sale_unit_price,
      purchasePrice: mapped.purchase_price,
      stock: mapped.stock,
      stockMin: mapped.stock_min,
      barcode: mapped.barcode ? String(mapped.barcode) : null,
      brand: mapped.brand ? String(mapped.brand) : null,
      imageUrl: mapped.image_url ? String(mapped.image_url) : null,
      hasIgv: mapped.has_igv,
      active: mapped.active !== false,
    },
  });
  return created.id;
}
