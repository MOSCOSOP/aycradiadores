import { prisma } from "@/lib/db/prisma";

export const POS_CATEGORY_NAMES = [
  "RADIADORES",
  "MANGUERA",
  "VENTILADOR",
  "REFRIGERANTE",
] as const;

/** Asegura categorías base en BD (idempotente). */
export async function ensureDefaultCategories() {
  for (const name of POS_CATEGORY_NAMES) {
    const exists = await prisma.category.findFirst({ where: { name } });
    if (!exists) {
      await prisma.category.create({ data: { name } });
    }
  }
}

export function mergeCategoriesList(
  rows: { id: number; name: string }[]
): { id: number; name: string }[] {
  const byName = new Map<string, { id: number; name: string }>();
  for (const row of rows) {
    byName.set(row.name.trim().toUpperCase(), row);
  }
  POS_CATEGORY_NAMES.forEach((name, index) => {
    const key = name.toUpperCase();
    if (!byName.has(key)) {
      byName.set(key, { id: 9000 + index, name });
    }
  });
  const preferred = POS_CATEGORY_NAMES.map((n) => byName.get(n.toUpperCase())).filter(Boolean) as {
    id: number;
    name: string;
  }[];
  const rest = [...byName.values()]
    .filter((c) => !POS_CATEGORY_NAMES.includes(c.name.toUpperCase() as (typeof POS_CATEGORY_NAMES)[number]))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...preferred, ...rest];
}
