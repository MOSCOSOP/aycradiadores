import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";

export type ChatCustomerIdentity = { customerId: number; name: string; dni: string };

const MAX_IMAGE_BYTES = 2_000_000; // ~2MB en base64, de sobra para una foto ya comprimida en el navegador

function normalizeDni(dni: string): string {
  return dni.replace(/\D/g, "");
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function assertValidDni(dni: string) {
  if (!/^\d{8}$/.test(dni)) throw new Error("El DNI debe tener 8 dígitos.");
}

function assertValidPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new Error("El PIN debe tener 6 dígitos.");
}

/** Indica si el DNI ya tiene una cuenta con PIN creado (para que el frontend decida si pedir
 * "crear PIN" o "ingresar PIN"). Una cuenta antigua sin PIN (de antes de este cambio) se trata
 * como si no existiera, para que la persona cree su PIN y quede protegida desde ahora. */
export async function checkChatDni(dniRaw: string): Promise<{ exists: boolean; name?: string }> {
  const dni = normalizeDni(dniRaw);
  assertValidDni(dni);
  const existing = await prisma.chatCustomer.findUnique({ where: { dni } });
  if (existing?.pinHash) return { exists: true, name: existing.name };
  return { exists: false, name: existing?.name };
}

export async function registerChatCustomer(
  name: string,
  dniRaw: string,
  pin: string
): Promise<ChatCustomerIdentity> {
  const dni = normalizeDni(dniRaw);
  const cleanName = normalizeName(name);
  assertValidDni(dni);
  assertValidPin(pin);
  if (cleanName.length < 3) throw new Error("Escribe tu nombre completo.");

  const existing = await prisma.chatCustomer.findUnique({ where: { dni } });
  if (existing?.pinHash) {
    throw new Error("Ya existe una cuenta con este DNI. Ingresa tu PIN para continuar.");
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const customer = existing
    ? await prisma.chatCustomer.update({
        where: { id: existing.id },
        data: { name: cleanName, pinHash, lastSeenAt: new Date() },
      })
    : await prisma.chatCustomer.create({ data: { name: cleanName, dni, pinHash } });

  return { customerId: customer.id, name: customer.name, dni: customer.dni };
}

export async function loginChatCustomer(dniRaw: string, pin: string): Promise<ChatCustomerIdentity> {
  const dni = normalizeDni(dniRaw);
  assertValidDni(dni);
  const customer = await prisma.chatCustomer.findUnique({ where: { dni } });
  if (!customer?.pinHash) throw new Error("No encontramos una cuenta con ese DNI.");
  const ok = await bcrypt.compare(pin, customer.pinHash);
  if (!ok) throw new Error("PIN incorrecto.");
  await prisma.chatCustomer.update({ where: { id: customer.id }, data: { lastSeenAt: new Date() } });
  return { customerId: customer.id, name: customer.name, dni: customer.dni };
}

async function verifyChatCustomer(customerId: number, dniRaw: string) {
  const dni = normalizeDni(dniRaw);
  const customer = await prisma.chatCustomer.findUnique({ where: { id: customerId } });
  if (!customer || customer.dni !== dni) throw new Error("Sesión de chat inválida, vuelve a ingresar tu DNI y PIN.");
  return customer;
}

export async function listChatMessages(customerId: number, dni: string) {
  const customer = await verifyChatCustomer(customerId, dni);
  await prisma.chatCustomer.update({ where: { id: customer.id }, data: { lastSeenAt: new Date() } });
  await prisma.chatMessage.updateMany({
    where: { chatCustomerId: customer.id, sender: "admin", readByCustomer: false },
    data: { readByCustomer: true },
  });
  const messages = await prisma.chatMessage.findMany({
    where: { chatCustomerId: customer.id },
    orderBy: { createdAt: "asc" },
    include: { document: { select: { id: true, fullNumber: true, shareToken: true, total: true } } },
  });
  return { customer, messages };
}

export async function postCustomerMessage(customerId: number, dni: string, body: string, image?: string) {
  const customer = await verifyChatCustomer(customerId, dni);
  const text = body.trim().slice(0, 2000);
  if (image && image.length > MAX_IMAGE_BYTES) {
    throw new Error("La imagen es muy pesada, intenta con una más liviana.");
  }
  if (!text && !image) throw new Error("Escribe un mensaje o adjunta una foto.");
  const message = await prisma.chatMessage.create({
    data: {
      chatCustomerId: customer.id,
      sender: "customer",
      body: text,
      imageUrl: image || null,
      readByAdmin: false,
      readByCustomer: true,
    },
  });
  return message;
}
