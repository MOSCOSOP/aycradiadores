import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isLocalMode(): boolean {
  return process.env.API_MODE !== "remote";
}

export function getDocTypeDescription(id: string): string {
  const map: Record<string, string> = {
    "01": "Factura",
    "03": "Boleta",
    "07": "Nota de crédito",
    "08": "Nota de débito",
    "09": "Guía de remisión",
  };
  return map[id] ?? id;
}

export function getStateDescription(id: string): string {
  const map: Record<string, string> = {
    "01": "Registrado",
    "05": "Enviado",
    "09": "Rechazado",
    "11": "Anulado",
    "12": "Baja en proceso (SUNAT)",
  };
  return map[id] ?? "Registrado";
}
