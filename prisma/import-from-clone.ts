/**
 * Volca imported-data/*.json (generado por scripts/import_data.py) a SQLite.
 *
 *   npx tsx prisma/import-from-clone.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const IMPORT_DIR = path.join(process.cwd(), "imported-data");

function readJson<T>(name: string): T | null {
  const file = path.join(IMPORT_DIR, `${name}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
}

function asRows<T>(data: T[] | null): T[] {
  return Array.isArray(data) ? data : [];
}

async function clearBusinessData() {
  await prisma.journalEntry.deleteMany();
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
}

async function ensureBaseStructure() {
  const adminEmail = process.env.ADMIN_EMAIL || "arcibesalvares@gmail.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ARCHI2052";
  const adminName = process.env.ADMIN_NAME || "ADMINISTRADOR";

  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: process.env.COMPANY_NAME || "MI EMPRESA S.A.C.",
        tradeName: process.env.COMPANY_TRADE_NAME || "Mi Empresa",
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

  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: await bcrypt.hash(adminPassword, 10),
        type: "admin",
        establishmentId: establishment.id,
      },
    });
  }

  const seriesCount = await prisma.series.count();
  if (seriesCount === 0) {
    await prisma.series.createMany({
      data: [
        { number: "F001", documentTypeId: "01", establishmentId: establishment.id },
        { number: "B001", documentTypeId: "03", establishmentId: establishment.id },
        { number: "T001", documentTypeId: "09", establishmentId: establishment.id },
      ],
    });
  }

  const cashCount = await prisma.cashRegister.count();
  if (cashCount === 0) {
    await prisma.cashRegister.create({
      data: {
        description: "Caja Principal",
        establishmentId: establishment.id,
        isOpen: true,
        openedAt: new Date(),
      },
    });
  }

  return { company, establishment };
}

async function importCategories() {
  const rows = asRows(readJson<{ id: number; name: string }[]>("categories"));
  const map = new Map<number, number>();

  for (const row of rows) {
    if (!row.name) continue;
    const cat = await prisma.category.create({
      data: { name: row.name, description: row.name },
    });
    map.set(row.id, cat.id);
  }

  if (map.size === 0) {
    for (const name of ["General", "Repuestos", "Accesorios", "Servicios"]) {
      const cat = await prisma.category.create({ data: { name } });
      map.set(cat.id, cat.id);
    }
  }

  return map;
}

async function importItems(categoryMap: Map<number, number>) {
  const rows = asRows(readJson<Record<string, unknown>[]>("items"));
  const nameToCatId = new Map<string, number>();
  const cats = await prisma.category.findMany();
  for (const c of cats) nameToCatId.set(c.name.toLowerCase(), c.id);

  let count = 0;
  for (const row of rows) {
    const imp = (row._import as Record<string, unknown>) || {};
    const remoteId = Number(row.id);
    const description = String(row.description || row.name || "Sin nombre");
    const internalId = row.internal_id ? String(row.internal_id) : null;
    const unitTypeId = String(row.unit_type_id || "NIU");
    const categoryName = String(imp.category_name || "").toLowerCase();
    const remoteCatId = (row.category as { id?: number })?.id;
    let categoryId: number | undefined =
      (remoteCatId && categoryMap.get(remoteCatId)) ||
      (categoryName ? nameToCatId.get(categoryName) : undefined);

    const created = await prisma.item.create({
      data: {
        sourceRemoteId: remoteId,
        internalId,
        description,
        unitTypeId,
        kind: String(imp.kind || (unitTypeId === "ZZ" ? "service" : "product")),
        saleUnitPrice: Number(imp.sale_unit_price ?? 0),
        purchasePrice: Number(imp.purchase_price ?? 0),
        stock: Number(imp.stock ?? 0),
        imageUrl: row.local_image ? String(row.local_image) : null,
        barcode: row.barcode ? String(row.barcode) : null,
        brand: row.brand ? String(row.brand) : null,
        hasIgv: row.has_igv !== false,
        categoryId,
        active: true,
      },
    });

    const stock = Number(imp.stock ?? 0);
    if (stock !== 0) {
      await prisma.inventoryMovement.create({
        data: {
          itemId: created.id,
          type: stock >= 0 ? "in" : "out",
          quantity: Math.abs(stock),
          description: "Importado del sistema original",
          reference: `remote:${remoteId}`,
        },
      });
    }
    count++;
  }
  return count;
}

async function importCustomers() {
  const rows = asRows(readJson<Record<string, unknown>[]>("customers"));
  let count = 0;
  for (const row of rows) {
    await prisma.customer.create({
      data: {
        name: String(row.name || "Cliente"),
        number: String(row.number || "00000000"),
        identityDocumentTypeId: String(row.identity_document_type_id || "6"),
        verificationCode: row.verification_code ? String(row.verification_code) : null,
        sex: row.sex ? String(row.sex) : null,
        birthDate: row.date_of_birth ? String(row.date_of_birth) : null,
        email: row.email ? String(row.email) : null,
        telephone: row.telephone ? String(row.telephone) : null,
        address: row.address ? String(row.address) : null,
      },
    });
    count++;
  }
  if (count === 0) {
    await prisma.customer.create({
      data: { name: "Clientes - Varios", number: "99999999" },
    });
  }
  return count;
}

async function importSuppliers() {
  const rows = asRows(readJson<Record<string, unknown>[]>("suppliers"));
  let count = 0;
  for (const row of rows) {
    await prisma.supplier.create({
      data: {
        name: String(row.name || "Proveedor"),
        number: String(row.number || "00000000"),
        email: row.email ? String(row.email) : null,
        telephone: row.telephone ? String(row.telephone) : null,
        address: row.address ? String(row.address) : null,
      },
    });
    count++;
  }
  if (count === 0) {
    await prisma.supplier.create({
      data: { name: "Proveedor General", number: "20100000001" },
    });
  }
  return count;
}

async function storeRawModules() {
  const manifest = readJson<{ modules?: Record<string, unknown> }>("manifest");
  if (!manifest?.modules) return;

  const skip = new Set([
    "categories", "items", "customers", "suppliers", "manifest",
    "pos_tables", "documents_tables", "items_columns",
  ]);

  for (const name of Object.keys(manifest.modules)) {
    if (skip.has(name)) continue;
    const data = readJson(name);
    if (data === null) continue;
    await prisma.appSetting.upsert({
      where: { key: `imported_${name}` },
      create: { key: `imported_${name}`, value: JSON.stringify(data) },
      update: { value: JSON.stringify(data) },
    });
  }

  for (const special of ["pos_tables", "documents_tables", "items_columns"]) {
    const data = readJson(special);
    if (data === null) continue;
    await prisma.appSetting.upsert({
      where: { key: `imported_${special}` },
      create: { key: `imported_${special}`, value: JSON.stringify(data) },
      update: { value: JSON.stringify(data) },
    });
  }
}

async function importSaleNotes() {
  const rows = asRows(readJson<Record<string, unknown>[]>("sale_notes"));
  const customer = await prisma.customer.findFirst();
  if (!customer) return;

  if (rows.length === 0) {
    console.log("[*] Sin notas de venta importadas — creando demo NV01-19/20...");
    const demos = [
      { number: "NV01-19", total: 25, plate: "" },
      { number: "NV01-20", total: 14, plate: "" },
    ];
    for (const d of demos) {
      await prisma.saleNote.upsert({
        where: { number: d.number },
        create: {
          number: d.number,
          customerId: customer.id,
          total: d.total,
          state: "Registrado",
          currencyTypeId: "PEN",
          paymentStatus: "Pagado",
          modifiedPrice: "NO",
        },
        update: { total: d.total },
      });
    }
    return;
  }

  console.log(`[*] Importando ${rows.length} notas de venta...`);
  for (const row of rows) {
    const number = String(row.number ?? row.identifier ?? "");
    if (!number) continue;
    let customerId = customer.id;
    const custNum = String(row.customer_number ?? "");
    if (custNum) {
      const c = await prisma.customer.findFirst({ where: { number: custNum } });
      if (c) customerId = c.id;
    }
    await prisma.saleNote.upsert({
      where: { number },
      create: {
        number,
        customerId,
        total: Number(row.total ?? 0),
        state: String(row.state_type_description ?? "Registrado"),
        plate: row.plate ? String(row.plate) : null,
        currencyTypeId: String(row.currency_type_id ?? "PEN"),
        paymentStatus: String(row.payment_status ?? row.state_payment ?? "Pagado"),
        modifiedPrice: String(row.modified_price ?? "NO"),
      },
      update: {
        total: Number(row.total ?? 0),
        plate: row.plate ? String(row.plate) : null,
      },
    });
  }
}

async function updateCompanyFromPos() {
  const pos = readJson<{ company?: Record<string, unknown> }>("pos_tables");
  const company = pos?.company;
  if (!company) return;

  const existing = await prisma.company.findFirst();
  if (!existing) return;

  await prisma.company.update({
    where: { id: existing.id },
    data: {
      name: String(company.name || existing.name),
      tradeName: String(company.trade_name || existing.tradeName),
      ruc: String(company.number || existing.ruc),
      soapSendId: String(company.soap_send_id || existing.soapSendId),
      soapTypeId: String(company.soap_type_id || existing.soapTypeId),
      soapUsername: company.soap_username ? String(company.soap_username) : existing.soapUsername,
      soapPassword: company.soap_password ? String(company.soap_password) : existing.soapPassword,
      soapSunatUsername: company.soap_sunat_username ? String(company.soap_sunat_username) : existing.soapSunatUsername,
      soapSunatPassword: company.soap_sunat_password ? String(company.soap_sunat_password) : existing.soapSunatPassword,
      certificate: company.certificate ? String(company.certificate) : existing.certificate,
      apiSunatId: company.api_sunat_id ? String(company.api_sunat_id) : existing.apiSunatId,
      apiSunatSecret: company.api_sunat_secret ? String(company.api_sunat_secret) : existing.apiSunatSecret,
      pse: company.pse != null ? Boolean(company.pse) : existing.pse,
      pseUrl: company.pse_url ? String(company.pse_url) : existing.pseUrl,
      clientIdPse: company.client_id_pse ? String(company.client_id_pse) : existing.clientIdPse,
      sendDocumentToPse: company.send_document_to_pse != null ? Boolean(company.send_document_to_pse) : existing.sendDocumentToPse,
      typeSendPse: company.type_send_pse != null ? Number(company.type_send_pse) : existing.typeSendPse,
      isRus: company.is_rus != null ? Boolean(company.is_rus) : existing.isRus,
    },
  });
}

async function main() {
  if (!fs.existsSync(path.join(IMPORT_DIR, "manifest.json"))) {
    console.error("No hay imported-data/manifest.json. Ejecuta: python scripts/import_data.py");
    process.exit(1);
  }

  const onlyModules = (process.env.ONLY_MODULES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (onlyModules.length === 0) {
    console.log("[*] Limpiando datos demo...");
    await clearBusinessData();
    await ensureBaseStructure();

    console.log("[*] Importando categorias...");
    const catMap = await importCategories();

    console.log("[*] Importando productos...");
    const itemCount = await importItems(catMap);
    console.log(`    ${itemCount} productos`);

    console.log("[*] Importando clientes...");
    const custCount = await importCustomers();
    console.log(`    ${custCount} clientes`);

    console.log("[*] Importando proveedores...");
    const supCount = await importSuppliers();
    console.log(`    ${supCount} proveedores`);

    console.log("[*] Guardando modulos raw (documentos, POS, etc.)...");
    await storeRawModules();
    await importSaleNotes();
    await updateCompanyFromPos();
  } else {
    await ensureBaseStructure();
    if (onlyModules.includes("sale_notes")) {
      await importSaleNotes();
    }
  }

  console.log("[OK] Importacion completada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
