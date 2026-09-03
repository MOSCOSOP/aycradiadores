import { prisma } from "@/lib/db/prisma";

export type ChatCustomerIdentity = { customerId: number; name: string; dni: string };

function normalizeDni(dni: string): string {
  return dni.replace(/\D/g, "");
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Registra un cliente nuevo del chat, o recupera su conversación si el DNI ya existe
 * (validando que el nombre coincida, para evitar que cualquiera entre solo adivinando un DNI). */
export async function registerOrResumeChatCustomer(
  name: string,
  dniRaw: string
): Promise<ChatCustomerIdentity> {
  const dni = normalizeDni(dniRaw);
  const cleanName = normalizeName(name);
  if (!/^\d{8}$/.test(dni)) throw new Error("El DNI debe tener 8 dígitos.");
  if (cleanName.length < 3) throw new Error("Escribe tu nombre completo.");

  const existing = await prisma.chatCustomer.findUnique({ where: { dni } });
  if (existing) {
    if (existing.name.trim().toLowerCase() !== cleanName.toLowerCase()) {
      throw new Error("El nombre no coincide con el DNI registrado. Verifica tus datos.");
    }
    await prisma.chatCustomer.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    return { customerId: existing.id, name: existing.name, dni: existing.dni };
  }

  const created = await prisma.chatCustomer.create({ data: { name: cleanName, dni } });
  return { customerId: created.id, name: created.name, dni: created.dni };
}

async function verifyChatCustomer(customerId: number, dniRaw: string) {
  const dni = normalizeDni(dniRaw);
  const customer = await prisma.chatCustomer.findUnique({ where: { id: customerId } });
  if (!customer || customer.dni !== dni) throw new Error("Sesión de chat inválida, vuelve a ingresar tu nombre y DNI.");
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

export async function postCustomerMessage(customerId: number, dni: string, body: string) {
  const customer = await verifyChatCustomer(customerId, dni);
  const text = body.trim().slice(0, 2000);
  if (!text) throw new Error("Escribe un mensaje.");
  const message = await prisma.chatMessage.create({
    data: { chatCustomerId: customer.id, sender: "customer", body: text, readByAdmin: false, readByCustomer: true },
  });
  return message;
}
