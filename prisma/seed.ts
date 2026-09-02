import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/** Lee imported-data/documents.json (si existe) y devuelve el número más alto usado por serie,
 * para que el contador de cada serie nunca arranque en 0 si ya hay historial importado — de lo
 * contrario SUNAT rechaza el primer comprobante nuevo por repetir un número ya emitido. */
function maxDocumentNumberBySeries(): Map<string, number> {
  const max = new Map<string, number>();
  const filePath = path.join(process.cwd(), "imported-data", "documents.json");
  if (!fs.existsSync(filePath)) return max;
  let rows: { number?: string }[] = [];
  try {
    rows = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return max;
  }
  for (const row of Array.isArray(rows) ? rows : []) {
    const match = String(row?.number ?? "").match(/^([A-Za-z0-9]+)-(\d+)$/);
    if (!match) continue;
    const [, series, n] = match;
    const current = max.get(series) ?? 0;
    if (Number(n) > current) max.set(series, Number(n));
  }
  return max;
}

const DOC_TYPES = [
  { id: "01", description: "Factura" },
  { id: "03", description: "Boleta" },
  { id: "07", description: "Nota de crédito" },
  { id: "08", description: "Nota de débito" },
  { id: "09", description: "Guía de remisión" },
];

const OPERATION_TYPES = [
  { id: "0101", description: "Venta interna" },
  { id: "0200", description: "Exportación" },
  { id: "0201", description: "Venta no domiciliada" },
  { id: "0102", description: "Venta interna - Anticipos" },
];

const CURRENCIES = [
  { id: "PEN", description: "Soles", symbol: "S/" },
  { id: "USD", description: "Dólares Americanos", symbol: "$" },
];

const UNIT_TYPES = [
  { id: "NIU", symbol: "UND", description: "Unidad" },
  { id: "KGM", symbol: "KG", description: "Kilos" },
  { id: "LTR", symbol: "LT", description: "Litro" },
  { id: "ZZ", symbol: "SERV", description: "Servicio" },
];

const CATEGORIES = ["RADIADORES", "MANGUERA", "VENTILADOR", "REFRIGERANTE", "General"];

const ACCOUNTS = [
  { code: "10111", name: "Caja", type: "Activo" },
  { code: "121201", name: "Cuentas por cobrar comerciales", type: "Activo" },
  { code: "20111", name: "Mercaderías", type: "Activo" },
  { code: "40111", name: "IGV por pagar", type: "Pasivo" },
  { code: "421201", name: "Cuentas por pagar comerciales", type: "Pasivo" },
  { code: "70111", name: "Ventas mercaderías", type: "Ingreso" },
  { code: "60111", name: "Compras mercaderías", type: "Gasto" },
];

async function main() {
  const companyName = process.env.COMPANY_NAME || "ALVARES ROSALES ARCIBES BENITO";
  const tradeName = process.env.COMPANY_TRADE_NAME || "A&c RADIADORES";
  const ruc = process.env.COMPANY_RUC || "10447860428";
  const adminEmail = process.env.ADMIN_EMAIL || "arcibesalvares@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ARCHI2052";
  const adminName = process.env.ADMIN_NAME || "ADMINISTRADOR";

  const soapUser = process.env.SUNAT_SOAP_USERNAME || "10447860428F3M9QC0C";
  const soapPass = process.env.SUNAT_SOAP_PASSWORD || "Y20qYHWKis";
  const apiSunatId = process.env.SUNAT_API_ID || "6dc846f5-1919-4160-8aad-176aecf6b5ab";
  const apiSunatSecret = process.env.SUNAT_API_SECRET || "qNuaK1kWLcwOfUZU4vdXFQ==";

  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.orderNoteItem.deleteMany();
  await prisma.orderNote.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.documentItem.deleteMany();
  await prisma.document.deleteMany();
  await prisma.saleNoteItem.deleteMany();
  await prisma.saleNote.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.item.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.cashRegister.deleteMany();
  await prisma.series.deleteMany();
  await prisma.user.deleteMany();
  await prisma.establishment.deleteMany();
  await prisma.company.deleteMany();
  await prisma.appSetting.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: companyName,
      tradeName,
      ruc,
      logo: "logo_10447860428.png",
      soapSendId: "01",
      soapTypeId: "02",
      soapUsername: soapUser,
      soapPassword: soapPass,
      soapSunatUsername: soapUser,
      soapSunatPassword: soapPass,
      certificate: "certificate_10447860428.pem",
      apiSunatId,
      apiSunatSecret,
      pse: false,
      pseUrl: "https://consultaperu.pe",
      clientIdPse: "8",
      sendDocumentToPse: false,
      typeSendPse: 2,
      isRus: false,
      configSystemEnv: 0,
      pendingRucCert: false,
      pendingRucSoap: false,
      pendingRucName: false,
    },
  });

  const establishment = await prisma.establishment.create({
    data: {
      code: "0000",
      description: "Oficina Principal",
      address: "AV. UNIVERSITARIA 2760, PILLCO MARCA, HUÁNUCO - HUÁNUCO",
      email: "arcibesalvares@gmail.com",
      telephone: "",
      companyId: company.id,
    },
  });

  const hashed = await bcrypt.hash(adminPassword, 10);
  await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail,
      password: hashed,
      type: "admin",
      establishmentId: establishment.id,
    },
  });

  const maxBySeries = maxDocumentNumberBySeries();
  await prisma.series.createMany({
    data: [
      { number: "F001", documentTypeId: "01", establishmentId: establishment.id, currentNumber: maxBySeries.get("F001") ?? 0 },
      { number: "B001", documentTypeId: "03", establishmentId: establishment.id, currentNumber: maxBySeries.get("B001") ?? 0 },
      { number: "T001", documentTypeId: "09", establishmentId: establishment.id, currentNumber: maxBySeries.get("T001") ?? 0 },
      { number: "V001", documentTypeId: "31", establishmentId: establishment.id, currentNumber: maxBySeries.get("V001") ?? 0 },
    ],
  });

  for (const name of CATEGORIES) {
    await prisma.category.create({ data: { name } });
  }

  for (const acc of ACCOUNTS) {
    await prisma.account.create({ data: acc });
  }

  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  const sampleItems = [
    { description: "Producto demo 1", internalId: "P001", price: 25.5, stock: 50, category: "General", kind: "product", unit: "NIU" },
    { description: "Repuesto filtro", internalId: "R001", price: 45.0, stock: 30, category: "Repuestos", kind: "product", unit: "NIU" },
    { description: "Servicio instalación", internalId: "S001", price: 80.0, stock: 0, category: "Servicios", kind: "service", unit: "ZZ" },
    { description: "Servicio mantenimiento", internalId: "S002", price: 120.0, stock: 0, category: "Servicios", kind: "service", unit: "ZZ" },
    { description: "Accesorio kit", internalId: "A001", price: 15.0, stock: 100, category: "Accesorios", kind: "product", unit: "NIU" },
  ];

  for (const item of sampleItems) {
    const created = await prisma.item.create({
      data: {
        description: item.description,
        internalId: item.internalId,
        saleUnitPrice: item.price,
        stock: item.stock,
        categoryId: catMap[item.category],
        kind: item.kind,
        unitTypeId: item.unit,
      },
    });
    if (item.stock > 0) {
      await prisma.inventoryMovement.create({
        data: { itemId: created.id, type: "in", quantity: item.stock, description: "Stock inicial" },
      });
    }
  }

  await prisma.customer.create({
    data: { name: "Clientes - Varios", number: "99999999", address: "Lima" },
  });

  await prisma.supplier.create({
    data: { name: "Proveedor General", number: "20100000001" },
  });

  await prisma.cashRegister.create({
    data: {
      description: "Caja Principal",
      establishmentId: establishment.id,
      isOpen: true,
      openingBalance: 0,
      currentBalance: 0,
      openedAt: new Date(),
    },
  });

  await prisma.appSetting.createMany({
    data: [
      { key: "document_types", value: JSON.stringify(DOC_TYPES) },
      { key: "operation_types", value: JSON.stringify(OPERATION_TYPES) },
      { key: "currency_types", value: JSON.stringify(CURRENCIES) },
      { key: "unit_types", value: JSON.stringify(UNIT_TYPES) },
      { key: "exchange_rate_sale", value: "3.396" },
      { key: "sale_note_counter", value: "0" },
      { key: "quotation_counter", value: "0" },
      { key: "purchase_counter", value: "0" },
      { key: "dispatch_counter", value: "0" },
      { key: "dispatch_carrier_counter", value: "0" },
      { key: "order_note_counter", value: "0" },
    ],
  });

  console.log("Seed OK — base limpia fase 3");
  console.log(`  Login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
