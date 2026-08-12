import { prisma } from "@/lib/db/prisma";
import { mapImportedDocument, readImportedModule } from "@/lib/imported-data";

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T00:00:00` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function inRange(dateStr: string | undefined, from: Date, to: Date): boolean {
  const d = parseDate(String(dateStr || "").slice(0, 10));
  if (!d) return false;
  return d >= from && d <= to;
}

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type DashDoc = {
  id: number;
  number: string;
  customer_name: string;
  customer_number?: string;
  date_of_issue: string;
  total: number;
  total_taxed?: number;
  total_igv?: number;
  balance?: number;
  state_type_description?: string;
};

async function loadAllDocuments(): Promise<DashDoc[]> {
  const importedDocs = (await readImportedModule("documents"))?.map(mapImportedDocument) ?? [];
  const prismaDocs = await prisma.document.findMany({ include: { customer: true }, orderBy: { id: "desc" } });

  const byNumber = new Map<string, DashDoc>();
  for (const d of importedDocs) {
    const key = String(d.number ?? d.id ?? "");
    if (!key) continue;
    byNumber.set(key, {
      id: Number(d.id),
      number: String(d.number ?? ""),
      customer_name: String(d.customer_name ?? "—"),
      customer_number: String(d.customer_number ?? ""),
      date_of_issue: String(d.date_of_issue ?? "").slice(0, 10),
      total: Number(d.total ?? 0),
      total_taxed: Number(d.total_taxed ?? 0),
      total_igv: Number(d.total_igv ?? 0),
      balance: Number(d.balance ?? 0),
      state_type_description: String(d.state_type_description ?? ""),
    });
  }
  for (const d of prismaDocs) {
    byNumber.set(d.fullNumber, {
      id: d.id,
      number: d.fullNumber,
      customer_name: d.customer.name,
      customer_number: d.customer.number,
      date_of_issue: d.dateOfIssue.toISOString().slice(0, 10),
      total: d.total,
      total_taxed: d.totalTaxed,
      total_igv: d.totalIgv,
      balance: 0,
      state_type_description: "Aceptado",
    });
  }
  return [...byNumber.values()];
}

export async function buildDashboardStats(searchParams: URLSearchParams) {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), 0, 1);
  const dateFrom = parseDate(searchParams.get("date_from")) ?? defaultFrom;
  const dateTo = parseDate(searchParams.get("date_to")) ?? now;
  const year = Number(searchParams.get("year") || now.getFullYear());

  const docs = await loadAllDocuments();
  const filteredDocs = docs.filter((d) => inRange(String(d.date_of_issue), dateFrom, dateTo));
  const docsAmount = filteredDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const docsPending = filteredDocs.reduce((s, d) => s + Number(d.balance ?? 0), 0);
  const docsCollected = fmt(docsAmount - docsPending);

  const importedSaleNotes = (await readImportedModule("sale_notes")) ?? [];
  const importedExpenses = (await readImportedModule("expenses")) ?? [];
  let saleNotesAmount = 0;
  let saleNotesPending = 0;
  const saleNotesInRange: { date: string; total: number }[] = [];

  if (importedSaleNotes.length) {
    for (const n of importedSaleNotes) {
      const date = String(n.date_of_issue ?? n.date ?? n.created_at ?? "").slice(0, 10);
      const total = Number(n.total ?? 0);
      if (inRange(date, dateFrom, dateTo)) {
        saleNotesAmount += total;
        saleNotesInRange.push({ date, total });
        if (String(n.payment_status ?? n.state_payment ?? "").toLowerCase().includes("pend")) {
          saleNotesPending += total;
        }
      }
    }
  } else {
    const notes = await prisma.saleNote.findMany();
    for (const n of notes) {
      const date = n.date.toISOString().slice(0, 10);
      if (!inRange(date, dateFrom, dateTo)) continue;
      saleNotesAmount += n.total;
      saleNotesInRange.push({ date, total: n.total });
      if (String(n.paymentStatus ?? "").toLowerCase().includes("pend")) saleNotesPending += n.total;
    }
  }
  saleNotesAmount = fmt(saleNotesAmount);
  const saleNotesCollected = fmt(saleNotesAmount - saleNotesPending);

  const importedPurchases = (await readImportedModule("purchases")) ?? [];
  let purchasesTotal = 0;
  let expensesTotal = 0;
  const purchasesMonthly: Record<number, number> = {};

  if (importedPurchases.length) {
    for (const p of importedPurchases) {
      const date = String(p.date_of_issue ?? p.date ?? "").slice(0, 10);
      if (!inRange(date, dateFrom, dateTo)) continue;
      const total = Number(p.total ?? 0);
      purchasesTotal += total;
      const m = parseDate(date)?.getMonth();
      if (m != null) purchasesMonthly[m] = (purchasesMonthly[m] || 0) + total;
    }
  } else {
    const purchases = await prisma.purchase.findMany();
    for (const p of purchases) {
      const date = p.date.toISOString().slice(0, 10);
      if (!inRange(date, dateFrom, dateTo)) continue;
      purchasesTotal += p.total;
      purchasesMonthly[p.date.getMonth()] = (purchasesMonthly[p.date.getMonth()] || 0) + p.total;
    }
  }

  if (importedExpenses.length) {
    for (const e of importedExpenses) {
      const date = String(e.date_of_issue ?? e.date ?? e.created_at ?? "").slice(0, 10);
      if (!inRange(date, dateFrom, dateTo)) continue;
      expensesTotal += Number(e.total ?? e.amount ?? 0);
    }
  }

  purchasesTotal = fmt(purchasesTotal);
  const expense = fmt(purchasesTotal + expensesTotal);
  const totalSales = fmt(docsAmount + saleNotesAmount);
  const netProfit = fmt(totalSales - expense);

  const dayMap = new Map<string, { docs: number; notes: number }>();
  for (const d of filteredDocs) {
    const key = String(d.date_of_issue ?? "").slice(0, 10);
    if (!key) continue;
    const row = dayMap.get(key) ?? { docs: 0, notes: 0 };
    row.docs += Number(d.total ?? 0);
    dayMap.set(key, row);
  }
  for (const n of saleNotesInRange) {
    const row = dayMap.get(n.date) ?? { docs: 0, notes: 0 };
    row.notes += n.total;
    dayMap.set(n.date, row);
  }

  const salesLabels: string[] = [];
  const salesDocs: number[] = [];
  const salesNotes: number[] = [];
  const salesTotals: number[] = [];
  const sortedDays = [...dayMap.keys()].sort();
  for (const day of sortedDays) {
    const row = dayMap.get(day)!;
    salesLabels.push(`${day.slice(8, 10)}/${day.slice(5, 7)}`);
    salesDocs.push(fmt(row.docs));
    salesNotes.push(fmt(row.notes));
    salesTotals.push(fmt(row.docs + row.notes));
  }
  if (!salesLabels.length) {
    for (let i = 0; i < 7; i++) {
      salesLabels.push(String(i + 1));
      salesDocs.push(0);
      salesNotes.push(0);
      salesTotals.push(0);
    }
  }

  const customerMap = new Map<string, { name: string; count: number; total: number }>();
  for (const d of filteredDocs) {
    const name = String(d.customer_name ?? "—");
    const row = customerMap.get(name) ?? { name, count: 0, total: 0 };
    row.count += 1;
    row.total += Number(d.total ?? 0);
    customerMap.set(name, row);
  }
  const topCustomers = [...customerMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((c, i) => ({ rank: i + 1, ...c, total: fmt(c.total) }));

  const monthlyHistory = MONTHS.map((label, idx) => {
    const monthDocs = docs.filter((d) => {
      const dt = parseDate(String(d.date_of_issue).slice(0, 10));
      return dt && dt.getFullYear() === year && dt.getMonth() === idx;
    });
    const sunat = monthDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
    const monthNotes = importedSaleNotes.filter((n) => {
      const dt = parseDate(String(n.date_of_issue ?? n.date ?? "").slice(0, 10));
      return dt && dt.getFullYear() === year && dt.getMonth() === idx;
    });
    const internal = monthNotes.reduce((s, n) => s + Number(n.total ?? 0), 0);
    return {
      month: label,
      sunat_sales: fmt(sunat),
      internal_sales: fmt(internal),
      purchases_expenses: fmt(purchasesMonthly[idx] ?? 0),
    };
  });

  const establishments = await prisma.establishment.findMany({ where: { active: true } });
  const dbItems = await prisma.item.findMany({ where: { active: true } });
  const lowStock = dbItems.filter((i) => i.stockMin > 0 && i.stock <= i.stockMin);
  const outOfStock = dbItems.filter((i) => i.stock <= 0);
  const pendingPurchases = await prisma.purchase.count({ where: { state: { contains: "Pend" } } });
  const pendingDocs = filteredDocs.filter((d) => Number(d.balance ?? 0) > 0);
  const pendingTotal = pendingDocs.reduce((s, d) => s + Number(d.balance ?? 0), 0);

  const insights: { level: string; text: string }[] = [];
  if (lowStock.length) {
    const sample = lowStock[0]?.internalId ?? lowStock[0]?.description?.slice(0, 35);
    insights.push({
      level: "danger",
      text: `Hay ${lowStock.length} producto(s) con stock en o bajo el mínimo${sample ? ` (ej. ${sample})` : ""}.`,
    });
  }
  if (outOfStock.length) {
    insights.push({
      level: "warning",
      text: `${outOfStock.length} producto(s) sin stock disponible.`,
    });
  }
  if (pendingPurchases > 0) {
    insights.push({
      level: "info",
      text: `${pendingPurchases} compra(s) pendientes de pago o proceso.`,
    });
  }
  if (pendingDocs.length) {
    insights.push({
      level: "warning",
      text: `${pendingDocs.length} cliente(s) tienen cobros pendientes por un total de S/ ${fmt(pendingTotal)}.`,
    });
  }
  if (!insights.length) {
    insights.push({ level: "info", text: "Operación al día — sin alertas críticas." });
  }

  return {
    kpi: {
      cpe_emitidos: filteredDocs.length,
      documents_amount: fmt(docsAmount),
      sale_notes_amount: saleNotesAmount,
      total_sales: totalSales,
      net_profit: netProfit,
    },
    sale_notes: {
      collected: saleNotesCollected,
      pending: fmt(saleNotesPending),
      total: saleNotesAmount,
    },
    documents: {
      collected: docsCollected,
      pending: fmt(docsPending),
      total: fmt(docsAmount),
    },
    balance: {
      totals: totalSales,
      payments: fmt(docsCollected + saleNotesCollected),
    },
    utilities: {
      income: totalSales,
      expense,
      profit: netProfit,
    },
    purchases: {
      perceptions: 0,
      purchases: purchasesTotal,
      total: purchasesTotal,
      monthly: MONTHS.map((m, i) => ({ month: m, amount: fmt(purchasesMonthly[i] ?? 0) })),
    },
    sales_chart: {
      labels: salesLabels,
      sale_notes: salesNotes,
      documents: salesDocs,
      totals: salesTotals,
    },
    top_customers: topCustomers,
    monthly_history: monthlyHistory,
    recent: filteredDocs.slice(0, 8),
    establishments: establishments.map((e) => ({ id: e.id, description: e.description })),
    filters: {
      date_from: dateFrom.toISOString().slice(0, 10),
      date_to: dateTo.toISOString().slice(0, 10),
      year,
    },
    insights,
    alerts: {
      low_stock_count: lowStock.length,
      out_of_stock_count: outOfStock.length,
    },
  };
}
