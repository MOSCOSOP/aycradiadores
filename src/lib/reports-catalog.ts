export type ReportLink = {
  label: string;
  href: string;
  reportPath?: string;
  icon?: string;
};

export type ReportSection = {
  title: string;
  items: ReportLink[];
};

export const REPORT_SECTIONS: ReportSection[] = [
  {
    title: "General",
    items: [
      { label: "Consistencia documentos", href: "/reports/document-consistency", reportPath: "reports/document-consistency", icon: "bi-file-check" },
      { label: "Validador de documentos", href: "/reports/document-validator", reportPath: "reports/document-validator", icon: "bi-shield-check" },
      { label: "Análisis comercial", href: "/reports/commercial-analysis", reportPath: "reports/commercial-analysis", icon: "bi-graph-up-arrow" },
      { label: "Descarga masiva - documentos", href: "/reports/mass-download", reportPath: "reports/mass-download", icon: "bi-download" },
      { label: "Bandeja descarga de reportes", href: "/reports/download-tray", reportPath: "reports/download-tray", icon: "bi-inbox" },
      { label: "Actividades del sistema", href: "/reports/system-activities", reportPath: "reports/system-activities", icon: "bi-activity" },
    ],
  },
  {
    title: "Compras",
    items: [
      { label: "Compras totales", href: "/reports/purchases-total", reportPath: "reports/purchases-total", icon: "bi-bag-check" },
      { label: "Activos fijos", href: "/reports/fixed-assets", reportPath: "reports/fixed-assets", icon: "bi-building" },
      { label: "Producto - búsqueda individual", href: "/reports/product-search", reportPath: "reports/product-search", icon: "bi-search" },
      { label: "Productos", href: "/reports/purchase-products", reportPath: "reports/purchase-products", icon: "bi-box" },
      { label: "Ordenes de compra", href: "/reports/purchase-orders", reportPath: "reports/purchase-orders", icon: "bi-cart-check" },
    ],
  },
  {
    title: "Ventas",
    items: [
      { label: "Ventas resumidas", href: "/reports/sales-summary", reportPath: "reports/sales-summary", icon: "bi-receipt" },
      { label: "Documentos", href: "/reports/documents", reportPath: "reports/documents", icon: "bi-file-earmark-text" },
      { label: "Clientes", href: "/reports/customers", reportPath: "reports/customers", icon: "bi-people" },
      { label: "Ventas por Vendedor - Detallado", href: "/reports/sales-by-seller", reportPath: "reports/sales-by-seller", icon: "bi-person-badge" },
      { label: "Detallado de ventas", href: "/reports/sales-detail", reportPath: "reports/sales-detail", icon: "bi-list-ul" },
      { label: "Productos y servicios", href: "/reports/products-services", reportPath: "reports/products-services", icon: "bi-box-seam" },
      { label: "Cotizaciones", href: "/reports/quotations", reportPath: "reports/quotations", icon: "bi-file-earmark" },
      { label: "Notas de Venta", href: "/reports/sale-notes", reportPath: "reports/sale-notes", icon: "bi-journal-text" },
      { label: "Reporte de stock mínimo", href: "/reports/stock-minimum", reportPath: "reports/stock-minimum", icon: "bi-exclamation-triangle" },
      { label: "Ventas consolidado", href: "/reports/sales-consolidated", reportPath: "reports/sales-consolidated", icon: "bi-collection" },
    ],
  },
  {
    title: "Ventas/Comisiones",
    items: [
      { label: "Utilidad ventas", href: "/reports/sales-profit", reportPath: "reports/sales-profit", icon: "bi-currency-dollar" },
      { label: "Ventas", href: "/reports/sales", reportPath: "reports/sales", icon: "bi-cart" },
      { label: "Cierres de caja", href: "/reports/cash-closures", reportPath: "reports/cash-closures", icon: "bi-safe" },
    ],
  },
  {
    title: "Inventario",
    items: [
      { label: "Reporte kardex", href: "/reports/kardex", reportPath: "reports/kardex", icon: "bi-journal-bookmark" },
      { label: "Reporte inventario", href: "/reports/inventory", reportPath: "reports/inventory", icon: "bi-boxes" },
      { label: "Margen de ganancia", href: "/reports/inventory-margin", reportPath: "reports/inventory-margin", icon: "bi-percent" },
      { label: "Stock histórico", href: "/reports/historical-stock", reportPath: "reports/historical-stock", icon: "bi-clock-history" },
    ],
  },
];

export function flattenReports(): ReportLink[] {
  return REPORT_SECTIONS.flatMap((s) => s.items);
}

export function findReportByHref(href: string): ReportLink | undefined {
  return flattenReports().find((r) => r.href === href);
}
