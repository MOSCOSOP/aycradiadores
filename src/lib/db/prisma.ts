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
    // "05" solo se asigna cuando SUNAT devolvió el CDR con código de respuesta "0" (ver
    // send-document.ts) — o sea, ya está aceptado de verdad, no solo "enviado".
    "01": "Registrado",
    "05": "Aceptado por SUNAT",
    "09": "Rechazado",
    "11": "Anulado",
    "12": "Baja en proceso (SUNAT)",
  };
  return map[id] ?? "Registrado";
}
