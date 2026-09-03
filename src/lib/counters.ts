import { prisma } from "@/lib/db/prisma";

/** Contador atómico compartido (guardado en AppSetting) para numerar documentos internos
 * que no pasan por el correlativo de SUNAT (notas de venta, cotizaciones, pedidos, etc.).
 * Único punto de verdad: úsalo desde cualquier flujo que genere ese tipo de número (formulario
 * manual, POS, etc.) para que dos caminos distintos nunca generen el mismo número. */
export async function nextCounter(key: string): Promise<number> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const n = Number(row?.value || 0) + 1;
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value: String(n) },
    update: { value: String(n) },
  });
  return n;
}
