export type SettingLink = {
  label: string;
  href: string;
  icon?: string;
};

export type SettingSection = {
  title: string;
  items: SettingLink[];
};

export const SETTINGS_SECTIONS: SettingSection[] = [
  {
    title: "General",
    items: [
      { label: "Listado de bancos", href: "/settings/banks", icon: "bi-bank" },
      { label: "Listado de cuentas bancarias", href: "/settings/bank-accounts", icon: "bi-credit-card-2-front" },
      { label: "Lista de monedas", href: "/settings/currencies", icon: "bi-currency-exchange" },
      { label: "Listado de tarjetas", href: "/settings/cards", icon: "bi-credit-card" },
      { label: "Lista de almacenes", href: "/settings/warehouses", icon: "bi-house-door" },
      { label: "Lista de agencias", href: "/settings/agencies", icon: "bi-shop" },
      { label: "Plataformas", href: "/settings/platforms", icon: "bi-globe" },
      { label: "Estados de entrega", href: "/settings/delivery-states", icon: "bi-truck" },
      { label: "Colores de Etiquetas", href: "/settings/label-colors", icon: "bi-palette" },
    ],
  },
  {
    title: "Empresa",
    items: [
      { label: "Empresa", href: "/settings/company", icon: "bi-building" },
      { label: "MultiEmpresa", href: "/settings/multi-company", icon: "bi-buildings" },
      { label: "Giro de negocio", href: "/settings/business-line", icon: "bi-briefcase" },
      { label: "Accesos directos", href: "/settings/shortcuts", icon: "bi-link-45deg" },
      { label: "Dashboard - Ventas - Compras", href: "/settings/dashboard-widgets", icon: "bi-grid" },
    ],
  },
  {
    title: "SUNAT",
    items: [
      { label: "Listado de Atributos", href: "/settings/attributes", icon: "bi-tags" },
      { label: "Listado de tipos de detracciones", href: "/settings/detractions", icon: "bi-percent" },
      { label: "Listado de unidades", href: "/settings/units", icon: "bi-rulers" },
      { label: "Tipos de motivos de transferencias", href: "/settings/transfer-reasons", icon: "bi-arrow-left-right" },
    ],
  },
  {
    title: "Ingresos/Egresos",
    items: [
      { label: "Métodos de pago - ingreso / gastos", href: "/settings/payment-methods", icon: "bi-wallet2" },
      { label: "Motivos de ingresos / Gastos", href: "/settings/income-reasons", icon: "bi-cash-coin" },
      { label: "Comprobantes Ingreso / Gastos", href: "/settings/income-vouchers", icon: "bi-receipt-cutoff" },
    ],
  },
  {
    title: "Plantillas PDF",
    items: [
      { label: "PDF", href: "/settings/pdf", icon: "bi-file-pdf" },
      { label: "PDF - Ticket", href: "/settings/pdf-ticket", icon: "bi-printer" },
      { label: "PDF - QR - Yape/Plin", href: "/settings/pdf-qr", icon: "bi-qr-code" },
      { label: "PDF - Información adicional", href: "/settings/pdf-extra", icon: "bi-info-circle" },
    ],
  },
  {
    title: "Varios",
    items: [
      { label: "Numeración de facturación", href: "/settings/billing-numbers", icon: "bi-123" },
      { label: "Inventarios", href: "/settings/inventory", icon: "bi-box-seam" },
      { label: "Nota de ventas", href: "/settings/sale-notes", icon: "bi-journal-text" },
      { label: "Copia de seguridad", href: "/backup", icon: "bi-cloud-download" },
      { label: "Usuarios", href: "/users", icon: "bi-people" },
      { label: "Locales", href: "/establishments", icon: "bi-geo-alt" },
      { label: "Tipo de cambio", href: "/exchange-rates", icon: "bi-arrow-left-right" },
    ],
  },
];

export function flattenSettings(): SettingLink[] {
  return SETTINGS_SECTIONS.flatMap((s) => s.items);
}
