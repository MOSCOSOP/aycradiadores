import { prisma } from "@/lib/db/prisma";
import {
  mapImportedDocument,
  mapImportedPurchase,
  mapImportedSaleNote,
  readImportedModule,
} from "@/lib/imported-data";
import { getDocTypeDescription, getStateDescription } from "@/lib/db/prisma";

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().split("T")[0];
}

export async function handleReportRequest(path: string): Promise<{ data: Record<string, unknown>[] }> {
  const importedDocs = (await readImportedModule("documents")) ?? [];
  const mappedDocs = importedDocs.map(mapImportedDocument);

  if (path === "reports/kardex" || path === "reports/inventory") {
    const importedInv = await readImportedModule("inventory");
    if (importedInv?.length) {
      return {
        data: importedInv.map((m) => ({
          date: String(m.updated_at ?? m.created_at ?? "").slice(0, 10),
          item: m.item_description,
          internal_id: m.item_internal_id,
          warehouse: m.warehouse_description,
          stock: m.stock,
          type: "Stock",
          quantity: m.stock,
          reference: m.warehouse_description,
        })),
      };
    }
    const data = await prisma.inventoryMovement.findMany({
      include: { item: true },
      orderBy: { id: "desc" },
      take: 500,
    });
    return {
      data: data.map((m) => ({
        date: formatDate(m.createdAt),
        item: m.item.description,
        internal_id: m.item.internalId,
        type: m.type,
        quantity: m.quantity,
        reference: m.reference,
        warehouse: "Oficina Principal",
        stock: m.item.stock,
      })),
    };
  }

  if (path === "reports/inventory-margin" || path === "reports/historical-stock" || path === "reports/products-services") {
    const items = await prisma.item.findMany({ include: { category: true }, orderBy: { description: "asc" } });
    return {
      data: items.map((i) => ({
        description: i.description,
        internal_id: i.internalId,
        category: i.category?.name,
        stock: i.stock,
        stock_min: i.stockMin,
        sale_unit_price: i.saleUnitPrice,
        purchase_price: i.purchasePrice,
        margin: Number((i.saleUnitPrice - i.purchasePrice).toFixed(2)),
      })),
    };
  }

  if (path === "reports/sales-summary" || path === "reports/documents" || path === "reports/sales" || path === "reports/sales-consolidated") {
    if (mappedDocs.length) return { data: mappedDocs };
    const docs = await prisma.document.findMany({ include: { customer: true }, orderBy: { id: "desc" }, take: 500 });
    return {
      data: docs.map((d) => ({
        number: d.fullNumber,
        document_type_description: getDocTypeDescription(d.documentTypeId),
        customer_name: d.customer.name,
        date_of_issue: formatDate(d.dateOfIssue),
        total_taxed: d.totalTaxed,
        total_igv: d.totalIgv,
        total: d.total,
        state_type_description: getStateDescription(d.stateTypeId),
      })),
    };
  }

  if (path === "reports/customers") {
    const data = await prisma.customer.findMany({ orderBy: { name: "asc" } });
    return {
      data: data.map((c) => ({
        number: c.number,
        name: c.name,
        telephone: c.telephone,
        email: c.email,
        address: c.address,
      })),
    };
  }

  if (path === "reports/purchases-total" || path === "reports/purchase-products") {
    const imported = await readImportedModule("purchases");
    if (imported?.length) return { data: imported.map(mapImportedPurchase) };
    const data = await prisma.purchase.findMany({ include: { supplier: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((p) => ({
        number: p.number,
        supplier_name: p.supplier.name,
        date_of_issue: formatDate(p.date),
        total: p.total,
        payment_status: p.state,
      })),
    };
  }

  if (path === "reports/sale-notes") {
    const imported = await readImportedModule("sale_notes");
    if (imported?.length) return { data: imported.map(mapImportedSaleNote) };
    const data = await prisma.saleNote.findMany({ include: { customer: true }, orderBy: { id: "desc" } });
    return {
      data: data.map((n) => ({
        number: n.number,
        customer_name: n.customer.name,
        date_of_issue: formatDate(n.date),
        total: n.total,
        plate: n.plate,
        payment_status: n.paymentStatus,
      })),
    };
  }

  if (path === "reports/quotations") {
    const imported = await readImportedModule("quotations");
    if (imported?.length) return { data: imported as Record<string, unknown>[] };
    const data = await prisma.quotation.findMany({ include: { customer: true } });
    return {
      data: data.map((q) => ({
        number: q.number,
        customer_name: q.customer.name,
        date: formatDate(q.date),
        total: q.total,
        state: q.state,
      })),
    };
  }

  if (path === "reports/stock-minimum") {
    const items = await prisma.item.findMany({ where: { active: true }, orderBy: { stock: "asc" } });
    return {
      data: items
        .filter((i) => i.stock <= i.stockMin)
        .map((i) => ({
          internal_id: i.internalId,
          description: i.description,
          stock: i.stock,
          stock_min: i.stockMin,
        })),
    };
  }

  if (path === "reports/commercial-analysis") {
    const total = mappedDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
    return {
      data: [
        { description: "Total ventas", amount: total.toFixed(2), reference: `${mappedDocs.length} comprobantes` },
        { description: "Clientes activos", amount: await prisma.customer.count(), reference: "Cartera" },
        { description: "Productos", amount: await prisma.item.count(), reference: "Catálogo" },
      ],
    };
  }

  if (path === "reports/cash-closures") {
    const boxes = await prisma.cashRegister.findMany();
    return {
      data: boxes.map((c) => ({
        description: c.description,
        date: c.closedAt ? formatDate(c.closedAt) : "—",
        amount: c.currentBalance,
        reference: c.isOpen ? "Abierta" : "Cerrada",
      })),
    };
  }

  if (path === "reports/document-consistency" || path === "reports/document-validator") {
    return {
      data: mappedDocs.slice(0, 100).map((d) => ({
        number: d.number,
        description: d.state_type_description,
        reference: d.has_xml ? "Con XML" : "Sin XML",
        date: d.date_of_issue,
        amount: d.total,
      })),
    };
  }

  return { data: [] };
}
