import { getSoldQuantitiesByItem } from "@/lib/stock-sync";

export type AiInsight = {
  id: string;
  level: "critical" | "warning" | "info" | "success" | "opportunity";
  category: "ventas" | "inventario" | "finanzas" | "clientes" | "general";
  title: string;
  text: string;
  metric?: string;
  action?: { label: string; href: string };
};

export type AiAnalysis = {
  generated_at: string;
  health_score: number;
  health_status: "excelente" | "bueno" | "regular" | "critico";
  health_summary: string;
  executive_brief: string;
  pulse: { label: string; value: string; trend: "up" | "down" | "flat" }[];
  sections: { id: string; title: string; icon: string; insights: AiInsight[] }[];
  legacy_insights: { level: string; text: string }[];
};

type ItemRow = {
  id: number;
  internalId: string | null;
  description: string;
  stock: number;
  stockMin: number;
  saleUnitPrice: number;
  purchasePrice: number;
};

type BuildAiContext = {
  dateFrom: string;
  dateTo: string;
  totalSales: number;
  netProfit: number;
  expense: number;
  docsCount: number;
  docsPending: number;
  saleNotesPending: number;
  saleNotesAmount: number;
  purchasesTotal: number;
  topCustomers: { name: string; count: number; total: number }[];
  monthlyHistory: { month: string; sunat_sales: number; internal_sales: number; purchases_expenses: number }[];
  chartTotals: number[];
  lowStock: ItemRow[];
  outOfStock: ItemRow[];
  pendingPurchases: number;
  pendingDocsCount: number;
  pendingTotal: number;
};

function healthLabel(score: number): AiAnalysis["health_status"] {
  if (score >= 85) return "excelente";
  if (score >= 70) return "bueno";
  if (score >= 50) return "regular";
  return "critico";
}

function healthText(status: AiAnalysis["health_status"]) {
  const map = {
    excelente: "Operación sólida",
    bueno: "Negocio estable",
    regular: "Requiere atención",
    critico: "Situación crítica",
  };
  return map[status];
}

function fmtMoney(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function trendFromSeries(values: number[]): "up" | "down" | "flat" {
  if (values.length < 2) return "flat";
  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid).reduce((s, v) => s + v, 0);
  const second = values.slice(mid).reduce((s, v) => s + v, 0);
  if (second > first * 1.05) return "up";
  if (second < first * 0.95) return "down";
  return "flat";
}

export async function buildAiAnalysis(ctx: BuildAiContext): Promise<AiAnalysis> {
  const soldMap = await getSoldQuantitiesByItem();
  const topSold = [...soldMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const itemById = new Map([...ctx.lowStock, ...ctx.outOfStock].map((i) => [i.id, i]));
  for (const [id] of topSold) {
    if (!itemById.has(id)) {
      const fromLists = ctx.lowStock.find((x) => x.id === id) ?? ctx.outOfStock.find((x) => x.id === id);
      if (fromLists) itemById.set(id, fromLists);
    }
  }

  const marginPct = ctx.totalSales > 0 ? (ctx.netProfit / ctx.totalSales) * 100 : 0;
  const expenseRatio = ctx.totalSales > 0 ? (ctx.expense / ctx.totalSales) * 100 : 0;
  const collectionRate =
    ctx.totalSales > 0
      ? ((ctx.totalSales - ctx.docsPending - ctx.saleNotesPending) / ctx.totalSales) * 100
      : 100;
  const ticketAvg = ctx.docsCount > 0 ? ctx.totalSales / ctx.docsCount : 0;

  let healthScore = 100;
  healthScore -= Math.min(25, ctx.outOfStock.length * 2);
  healthScore -= Math.min(20, ctx.lowStock.length);
  if (ctx.netProfit < 0) healthScore -= 22;
  if (expenseRatio > 70) healthScore -= 12;
  if (collectionRate < 70) healthScore -= 10;
  if (ctx.pendingDocsCount > 5) healthScore -= 5;
  if (marginPct > 15 && ctx.netProfit > 0) healthScore += 5;
  if (ctx.totalSales > 0 && ctx.outOfStock.length === 0) healthScore += 3;
  healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

  const status = healthLabel(healthScore);
  const salesTrend = trendFromSeries(ctx.chartTotals);
  const bestMonth = [...ctx.monthlyHistory].sort((a, b) => b.sunat_sales - a.sunat_sales)[0];
  const topCustomerShare =
    ctx.topCustomers[0] && ctx.totalSales > 0
      ? (ctx.topCustomers[0].total / ctx.totalSales) * 100
      : 0;

  const inventoryValueAtRisk = ctx.lowStock.reduce((s, i) => s + i.stock * i.saleUnitPrice, 0);
  const lostSalesRisk = ctx.outOfStock.reduce((s, i) => s + i.saleUnitPrice * Math.max(i.stockMin, 1), 0);

  const sections: AiAnalysis["sections"] = [];
  const allInsights: AiInsight[] = [];

  const push = (sectionId: string, sectionTitle: string, icon: string, insight: AiInsight) => {
    allInsights.push(insight);
    let section = sections.find((s) => s.id === sectionId);
    if (!section) {
      section = { id: sectionId, title: sectionTitle, icon, insights: [] };
      sections.push(section);
    }
    section.insights.push(insight);
  };

  // ── Resumen / General ──
  push("general", "Diagnóstico general", "bi-cpu", {
    id: "health",
    level: status === "critico" ? "critical" : status === "regular" ? "warning" : "success",
    category: "general",
    title: `Salud del negocio: ${healthScore}/100`,
    text: `He evaluado ventas, inventario, cobranza y márgenes del periodo ${ctx.dateFrom} al ${ctx.dateTo}. Tu operación está en estado «${healthText(status)}». ${
      healthScore >= 70
        ? "Los indicadores principales se mantienen bajo control."
        : "Detecté varios puntos que conviene atender esta semana para evitar pérdidas."
    }`,
    metric: `${healthScore}%`,
  });

  push("general", "Diagnóstico general", "bi-cpu", {
    id: "brief-margin",
    level: marginPct < 0 ? "critical" : marginPct < 10 ? "warning" : "info",
    category: "general",
    title: "Margen neto del periodo",
    text:
      marginPct >= 0
        ? `La utilidad neta representa el ${marginPct.toFixed(1)}% de tus ventas (S/ ${fmtMoney(ctx.netProfit)} sobre S/ ${fmtMoney(ctx.totalSales)}). ${
            marginPct >= 20
              ? "Margen saludable para el rubro de repuestos."
              : "Considera revisar precios de compra o mix de productos de mayor rentabilidad."
          }`
        : `Las operaciones cerraron con utilidad negativa de S/ ${fmtMoney(Math.abs(ctx.netProfit))}. Los egresos superan ingresos — prioriza control de compras y revisión de gastos.`,
    metric: `${marginPct.toFixed(1)}%`,
  });

  // ── Ventas ──
  push("ventas", "Inteligencia comercial", "bi-graph-up-arrow", {
    id: "sales-trend",
    level: salesTrend === "down" ? "warning" : salesTrend === "up" ? "success" : "info",
    category: "ventas",
    title: salesTrend === "up" ? "Tendencia de ventas al alza" : salesTrend === "down" ? "Ventas en descenso" : "Ventas estables",
    text:
      salesTrend === "up"
        ? "Comparando la primera mitad del periodo con la segunda, las ventas muestran momentum positivo. Es buen momento para reforzar stock de los productos más vendidos."
        : salesTrend === "down"
          ? "La segunda mitad del periodo vendió menos que la primera. Revisa campañas, atención en mostrador y disponibilidad de stock en los ítems más pedidos."
          : "El flujo de ventas se mantiene constante. Monitorea picos semanales para optimizar personal y reposición.",
    metric: salesTrend === "up" ? "↑" : salesTrend === "down" ? "↓" : "→",
  });

  if (bestMonth && bestMonth.sunat_sales > 0) {
    push("ventas", "Inteligencia comercial", "bi-graph-up-arrow", {
      id: "best-month",
      level: "opportunity",
      category: "ventas",
      title: `Mejor mes: ${bestMonth.month}`,
      text: `${bestMonth.month} concentró S/ ${fmtMoney(bestMonth.sunat_sales)} en ventas SUNAT. Analiza qué productos y clientes impulsaron ese mes para replicar la estrategia.`,
      metric: fmtMoney(bestMonth.sunat_sales),
    });
  }

  push("ventas", "Inteligencia comercial", "bi-graph-up-arrow", {
    id: "ticket-avg",
    level: "info",
    category: "ventas",
    title: "Ticket promedio estimado",
    text: `Con ${ctx.docsCount} comprobantes en el periodo, el ticket promedio ronda S/ ${fmtMoney(ticketAvg)}. ${
      ticketAvg >= 300
        ? "Buen valor por transacción — explora venta cruzada de accesorios y fluidos."
        : "Oportunidad de aumentar el ticket sugiriendo productos complementarios al momento de la venta."
    }`,
    metric: `S/ ${fmtMoney(ticketAvg)}`,
  });

  if (topSold.length) {
    const [topId, topQty] = topSold[0];
    const { prisma } = await import("@/lib/db/prisma");
    const topItem = await prisma.item.findUnique({
      where: { id: topId },
      select: { internalId: true, description: true },
    });
    const topLabel = topItem?.internalId ?? topItem?.description?.slice(0, 40) ?? `#${topId}`;
    push("ventas", "Inteligencia comercial", "bi-graph-up-arrow", {
      id: "top-seller",
      level: "success",
      category: "ventas",
      title: "Producto estrella detectado",
      text: `«${topLabel}» lidera ventas con ${topQty} unidades registradas. Asegura stock suficiente y negocia mejor precio con tu proveedor para maximizar margen.`,
      metric: `${topQty} uds.`,
      action: { label: "Ver productos", href: "/items" },
    });
  }

  // ── Clientes ──
  if (ctx.topCustomers.length) {
    const top = ctx.topCustomers[0];
    push("clientes", "Análisis de cartera", "bi-people", {
      id: "top-client",
      level: "info",
      category: "clientes",
      title: "Cliente principal del periodo",
      text: `«${top.name}» aportó S/ ${fmtMoney(top.total)} en ${top.count} transacción(es)${
        topCustomerShare > 25
          ? ` — concentra el ${topCustomerShare.toFixed(0)}% de ventas. Diversificar clientes reduce riesgo comercial.`
          : ". Buena distribución de ingresos entre clientes."
      }`,
      metric: fmtMoney(top.total),
      action: { label: "Ver clientes", href: "/persons/customers" },
    });
  }

  if (ctx.pendingDocsCount > 0) {
    push("clientes", "Análisis de cartera", "bi-people", {
      id: "pending-collections",
      level: ctx.pendingTotal > ctx.totalSales * 0.2 ? "critical" : "warning",
      category: "clientes",
      title: "Cobranza pendiente",
      text: `${ctx.pendingDocsCount} cliente(s) deben S/ ${fmtMoney(ctx.pendingTotal)}. La tasa de cobro efectiva es ${collectionRate.toFixed(0)}%. Programa seguimiento esta semana para mejorar flujo de caja.`,
      metric: fmtMoney(ctx.pendingTotal),
      action: { label: "Ver comprobantes", href: "/documents" },
    });
  }

  // ── Inventario ──
  if (ctx.lowStock.length) {
    const names = ctx.lowStock
      .slice(0, 3)
      .map((i) => i.internalId ?? i.description.slice(0, 28))
      .join(", ");
    push("inventario", "Predicción de inventario", "bi-box-seam", {
      id: "low-stock",
      level: "critical",
      category: "inventario",
      title: `${ctx.lowStock.length} productos bajo stock mínimo`,
      text: `Riesgo de quiebre de stock en: ${names}${ctx.lowStock.length > 3 ? " y otros más" : ""}. Valor expuesto en anaquel: ~S/ ${fmtMoney(inventoryValueAtRisk)}. Reabastecer ahora evita ventas perdidas.`,
      metric: String(ctx.lowStock.length),
      action: { label: "Validar inventario", href: "/inventory/validate" },
    });
  }

  if (ctx.outOfStock.length) {
    push("inventario", "Predicción de inventario", "bi-box-seam", {
      id: "out-stock",
      level: "critical",
      category: "inventario",
      title: `${ctx.outOfStock.length} productos sin stock`,
      text: `Hay referencias agotadas que pueden estar frenando ventas. Pérdida potencial estimada: ~S/ ${fmtMoney(lostSalesRisk)} si no repone pronto. Priorice radiadores y filtros de alta rotación.`,
      metric: String(ctx.outOfStock.length),
      action: { label: "Reporte inventario", href: "/reports/inventory" },
    });
  }

  if (!ctx.lowStock.length && !ctx.outOfStock.length) {
    push("inventario", "Predicción de inventario", "bi-box-seam", {
      id: "stock-ok",
      level: "success",
      category: "inventario",
      title: "Inventario bajo control",
      text: "Ningún producto activo está bajo el mínimo ni sin stock. Mantén el ciclo de validación semanal para sostener este nivel.",
      metric: "OK",
    });
  }

  // ── Finanzas ──
  push("finanzas", "Flujo y rentabilidad", "bi-wallet2", {
    id: "expense-ratio",
    level: expenseRatio > 80 ? "critical" : expenseRatio > 50 ? "warning" : "info",
    category: "finanzas",
    title: "Ratio de egresos vs ventas",
    text: `Los egresos (compras + gastos) representan el ${expenseRatio.toFixed(1)}% de las ventas del periodo (S/ ${fmtMoney(ctx.expense)}). ${
      expenseRatio > 70
        ? "Alerta: margen operativo comprimido. Negocia plazos con proveedores o ajusta precios."
        : "Proporción manejable. Sigue monitoreando compras de febrero y meses pico."
    }`,
    metric: `${expenseRatio.toFixed(0)}%`,
    action: { label: "Ver compras", href: "/purchases" },
  });

  if (ctx.purchasesTotal > 0) {
    push("finanzas", "Flujo y rentabilidad", "bi-wallet2", {
      id: "purchases",
      level: "info",
      category: "finanzas",
      title: "Compras en el periodo",
      text: `Se registraron compras por S/ ${fmtMoney(ctx.purchasesTotal)}. ${
        ctx.pendingPurchases > 0
          ? `${ctx.pendingPurchases} orden(es) pendientes — confirme recepción y factura para cuadrar kardex.`
          : "Todas las compras del periodo están procesadas."
      }`,
      metric: fmtMoney(ctx.purchasesTotal),
    });
  }

  if (ctx.saleNotesPending > 0) {
    push("finanzas", "Flujo y rentabilidad", "bi-wallet2", {
      id: "notes-pending",
      level: "warning",
      category: "finanzas",
      title: "Notas de venta por cobrar",
      text: `Hay S/ ${fmtMoney(ctx.saleNotesPending)} pendientes en notas de venta internas. Convertir a comprobante o cobrar reduce riesgo y mejora el flujo.`,
      metric: fmtMoney(ctx.saleNotesPending),
      action: { label: "Ver notas", href: "/sale-notes" },
    });
  }

  // ── Recomendaciones IA ──
  const recommendations: AiInsight[] = [];

  if (ctx.outOfStock.length > 10) {
    recommendations.push({
      id: "rec-restock",
      level: "opportunity",
      category: "inventario",
      title: "Acción recomendada: reposición urgente",
      text: "Genera una orden de compra agrupando los productos sin stock con mayor rotación histórica. Esto puede recuperar ventas en 48–72 horas.",
      action: { label: "Ir a compras", href: "/purchases/create" },
    });
  }

  if (marginPct > 0 && marginPct < 12) {
    recommendations.push({
      id: "rec-margin",
      level: "opportunity",
      category: "finanzas",
      title: "Acción recomendada: optimizar margen",
      text: "Revisa el reporte de margen de ganancia y ajusta precios en productos con margen bajo 15%. Pequeños incrementos en ítems de alta rotación impactan fuerte la utilidad.",
      action: { label: "Margen de ganancia", href: "/reports/inventory-margin" },
    });
  }

  if (salesTrend === "up" && ctx.lowStock.length) {
    recommendations.push({
      id: "rec-riding-wave",
      level: "opportunity",
      category: "ventas",
      title: "Acción recomendada: capitalizar demanda",
      text: "Las ventas suben pero el stock mínimo está en riesgo. Prioriza reabastecer los 5 productos más vendidos antes de que se agote el momentum.",
      action: { label: "Reporte inventario", href: "/reports/inventory" },
    });
  }

  if (collectionRate < 85 && ctx.pendingTotal > 0) {
    recommendations.push({
      id: "rec-collect",
      level: "opportunity",
      category: "clientes",
      title: "Acción recomendada: plan de cobranza",
      text: "Contacta hoy a los 3 clientes con mayor saldo pendiente. Un recordatorio amable suele acelerar pagos en 5–7 días.",
      action: { label: "Top clientes", href: "/persons/customers" },
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "rec-maintain",
      level: "success",
      category: "general",
      title: "Acción recomendada: mantener ritmo",
      text: "Operación equilibrada. Exporta el reporte de inventario semanal y compara con el dashboard para detectar desvíos antes de fin de mes.",
      action: { label: "Dashboard PDF", href: "/reports/inventory" },
    });
  }

  sections.push({
    id: "recomendaciones",
    title: "Recomendaciones IA",
    icon: "bi-lightning-charge",
    insights: recommendations,
  });
  allInsights.push(...recommendations);

  const executiveBrief = buildExecutiveBrief(ctx, healthScore, status, marginPct, salesTrend, ctx.lowStock.length, ctx.outOfStock.length);

  const pulse: AiAnalysis["pulse"] = [
    { label: "Ventas", value: `S/ ${fmtMoney(ctx.totalSales)}`, trend: salesTrend },
    {
      label: "Utilidad",
      value: `S/ ${fmtMoney(ctx.netProfit)}`,
      trend: ctx.netProfit >= 0 ? "up" : "down",
    },
    {
      label: "Stock crítico",
      value: String(ctx.lowStock.length + ctx.outOfStock.length),
      trend: ctx.lowStock.length + ctx.outOfStock.length > 5 ? "down" : "flat",
    },
    {
      label: "Cobranza",
      value: `${collectionRate.toFixed(0)}%`,
      trend: collectionRate >= 85 ? "up" : "down",
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    health_score: healthScore,
    health_status: status,
    health_summary: healthText(status),
    executive_brief: executiveBrief,
    pulse,
    sections,
    legacy_insights: allInsights.slice(0, 8).map((i) => ({
      level: i.level === "critical" ? "danger" : i.level === "opportunity" ? "info" : i.level === "success" ? "success" : i.level,
      text: i.text,
    })),
  };
}

function buildExecutiveBrief(
  ctx: BuildAiContext,
  score: number,
  status: AiAnalysis["health_status"],
  marginPct: number,
  salesTrend: "up" | "down" | "flat",
  lowCount: number,
  outCount: number
) {
  const parts: string[] = [];
  parts.push(
    `En el periodo analizado facturaste S/ ${fmtMoney(ctx.totalSales)} con utilidad neta de S/ ${fmtMoney(ctx.netProfit)} (${marginPct.toFixed(1)}% de margen).`
  );
  if (salesTrend === "up") parts.push("Las ventas vienen creciendo respecto al tramo anterior del periodo.");
  else if (salesTrend === "down") parts.push("Detecto desaceleración comercial en la segunda mitad del periodo.");
  if (outCount > 0) parts.push(`${outCount} productos están sin stock — esto limita ventas en mostrador y POS.`);
  else if (lowCount > 0) parts.push(`${lowCount} referencias están en o bajo el mínimo; conviene reabastecer pronto.`);
  else parts.push("El inventario no presenta alertas críticas de stock.");
  if (ctx.pendingTotal > 0) parts.push(`Quedan S/ ${fmtMoney(ctx.pendingTotal)} por cobrar a clientes.`);
  parts.push(`Puntuación global del negocio: ${score}/100 (${healthText(status)}).`);
  return parts.join(" ");
}
