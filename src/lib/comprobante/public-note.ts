import { prisma } from "@/lib/db/prisma";
import { generateShareToken, getPublicAppUrl } from "@/lib/comprobante/share-link";

export type SimpleDocData = {
  kind: "sale-note" | "quotation";
  number: string;
  date: string;
  customerName: string;
  customerNumber: string;
  total: number;
  state: string;
  items: { description: string; quantity: number; unitPrice: number; total: number }[];
};

export function buildPublicNoteUrl(token: string): string {
  return `${getPublicAppUrl()}/n/${token}`;
}

export function buildPublicQuotationUrl(token: string): string {
  return `${getPublicAppUrl()}/q/${token}`;
}

export async function ensureSaleNoteShareToken(id: number): Promise<string> {
  const row = await prisma.saleNote.findUnique({ where: { id }, select: { shareToken: true } });
  if (!row) throw new Error("Nota de venta no encontrada");
  if (row.shareToken) return row.shareToken;
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      const updated = await prisma.saleNote.update({ where: { id }, data: { shareToken: token }, select: { shareToken: true } });
      return updated.shareToken!;
    } catch {
      /* colisión de token */
    }
  }
  throw new Error("No se pudo generar enlace seguro");
}

export async function ensureQuotationShareToken(id: number): Promise<string> {
  const row = await prisma.quotation.findUnique({ where: { id }, select: { shareToken: true } });
  if (!row) throw new Error("Cotización no encontrada");
  if (row.shareToken) return row.shareToken;
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      const updated = await prisma.quotation.update({ where: { id }, data: { shareToken: token }, select: { shareToken: true } });
      return updated.shareToken!;
    } catch {
      /* colisión de token */
    }
  }
  throw new Error("No se pudo generar enlace seguro");
}

export async function getSaleNoteByShareToken(token: string): Promise<SimpleDocData | null> {
  const n = await prisma.saleNote.findUnique({
    where: { shareToken: token },
    include: { customer: true, items: true },
  });
  if (!n) return null;
  return {
    kind: "sale-note",
    number: n.number,
    date: n.date.toISOString().slice(0, 10),
    customerName: n.customer.name,
    customerNumber: n.customer.number,
    total: n.total,
    state: n.state,
    items: n.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
  };
}

export async function getQuotationByShareToken(token: string): Promise<SimpleDocData | null> {
  const q = await prisma.quotation.findUnique({
    where: { shareToken: token },
    include: { customer: true, items: true },
  });
  if (!q) return null;
  return {
    kind: "quotation",
    number: q.number,
    date: q.date.toISOString().slice(0, 10),
    customerName: q.customer.name,
    customerNumber: q.customer.number,
    total: q.total,
    state: q.state,
    items: q.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
  };
}
