export const APP_VERSION = "11.716.1340";
export const APP_COMMIT = "d7d19ca";

export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || "ALVARES ROSALES ARCIBES BENITO",
  tradeName: process.env.NEXT_PUBLIC_COMPANY_TRADE_NAME || "A&c RADIADORES",
  loginTitle: process.env.NEXT_PUBLIC_COMPANY_TRADE_NAME || "A&c RADIADORES",
  user: "ADMINISTRADOR",
  seller: "ADMINISTRADOR",
  ruc: process.env.NEXT_PUBLIC_COMPANY_RUC || "10447860428",
  establishment: "Oficina Principal",
  address: "AV. UNIVERSITARIA 2760, PILLCO MARCA, HUÁNUCO - HUÁNUCO",
  email: "arcibesalvares@gmail.com",
  phone: "+51 998 624 131",
};

export type NavChild = {
  label: string;
  href: string;
  children?: NavChild[];
};

export type NavItem = {
  label: string;
  href?: string;
  icon: string;
  children?: NavChild[];
};

/** Menú extraído del HTML autenticado de aycradiadores.iniciafacturaya.com */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "bi-speedometer2" },
  {
    label: "Ventas",
    icon: "bi-receipt-cutoff",
    children: [
      { label: "Nuevo comprobante", href: "/documents/create" },
      { label: "Listado de comprobantes", href: "/documents" },
      { label: "Notas de venta", href: "/sale-notes" },
      { label: "Comprobantes no enviados", href: "/documents/not-sent" },
      { label: "CPE por rectificar", href: "/documents/regularize-shipping" },
      { label: "Listado de recurrente", href: "/documents-recurrence" },
      { label: "Comprobante contingencia", href: "/contingencies" },
      { label: "Cotizaciones", href: "/quotations" },
      { label: "Resúmenes", href: "/summaries" },
      { label: "Anulaciones", href: "/voided" },
      { label: "Pedidos", href: "/order-notes" },
      { label: "Servicio de soporte técnico", href: "/technical-services" },
    ],
  },
  {
    label: "POS",
    icon: "bi-display",
    children: [
      { label: "Punto de venta", href: "/pos" },
      { label: "Listado de cajas", href: "/cash" },
    ],
  },
  {
    label: "Productos y servicios",
    icon: "bi-box-seam",
    children: [
      { label: "Productos", href: "/items" },
      { label: "Packs y promociones", href: "/item-sets" },
      { label: "Servicios", href: "/services" },
      { label: "Categorías", href: "/categories" },
      { label: "Cupones", href: "/cupones" },
      { label: "Marcas", href: "/brands" },
      { label: "Ingredientes", href: "/ingredients" },
      { label: "Líneas", href: "/lines" },
      { label: "Series", href: "/series" },
      { label: "Lotes", href: "/item-lots" },
      { label: "Ajustes de precio", href: "/price-adjustments" },
      { label: "Tipos de descuentos", href: "/discount-types" },
    ],
  },
  {
    label: "Clientes",
    icon: "bi-people",
    children: [
      { label: "Listado de clientes", href: "/persons/customers" },
      { label: "Tipos de clientes", href: "/person-types" },
      { label: "Lista de zonas", href: "/zones" },
    ],
  },
  {
    label: "Proveedores",
    href: "/persons/suppliers",
    icon: "bi-briefcase",
  },
  {
    label: "Compras",
    icon: "bi-bag-check",
    children: [
      { label: "Nueva compra", href: "/purchases/create" },
      { label: "Listado de compras", href: "/purchases" },
      { label: "Liquidación de compra", href: "/purchase-settlements" },
      { label: "Solicitar Cotización", href: "/purchase-quotations" },
      { label: "Ordenes de compra", href: "/purchase-orders" },
      { label: "Gastos diversos", href: "/expenses" },
      {
        label: "Activos fijos",
        href: "#activos",
        children: [
          { label: "Ítems", href: "/fixed-asset/items" },
          { label: "Compras", href: "/fixed-asset/purchases" },
        ],
      },
    ],
  },
  {
    label: "Inventario",
    icon: "bi-journal-bookmark",
    children: [
      { label: "Referencias", href: "/inventory-references" },
      { label: "Movimientos", href: "/inventory" },
      { label: "Traslados", href: "/transfers" },
      { label: "Devoluciones", href: "/devolutions" },
      { label: "Validar inventario", href: "/inventory/validate" },
      { label: "Reporte kardex", href: "/reports/kardex" },
      { label: "Reporte inventario", href: "/reports/inventory" },
      { label: "Kardex valorizado 13.1", href: "/reports/kardex-valorized" },
      { label: "Inventario - Margen de ganancia", href: "/reports/inventory-margin" },
      { label: "Stock histórico", href: "/reports/historical-stock" },
      { label: "Kardex costo promedio", href: "/reports/kardex-average-cost" },
    ],
  },
  {
    label: "Planilla",
    icon: "bi-cash-stack",
    children: [{ label: "Lista", href: "/payroll" }],
  },
  {
    label: "Usuarios y locales",
    icon: "bi-building",
    children: [
      { label: "Usuarios", href: "/users" },
      { label: "Locales", href: "/establishments" },
    ],
  },
  {
    label: "Guías de remisión",
    icon: "bi-truck",
    children: [
      { label: "Nueva G.R. Remitente", href: "/dispatches/create" },
      { label: "Listado G.R. Remitente", href: "/dispatches" },
      { label: "Nueva G.R. Transportista", href: "/dispatches-carrier/create" },
      { label: "Listado G.R. Transportista", href: "/dispatches-carrier" },
      { label: "Transportistas", href: "/transports" },
      { label: "Conductores", href: "/drivers" },
      { label: "Vehículos", href: "/vehicles" },
      { label: "Direcciones de Partida", href: "/origin-addresses" },
    ],
  },
  {
    label: "Comprob. avanzados",
    icon: "bi-file-earmark-text",
    children: [
      { label: "Retenciones", href: "/retentions" },
      { label: "Percepciones", href: "/perceptions" },
      { label: "Ordenes de pedido", href: "/order-forms" },
      { label: "Ordenes de entrega", href: "/delivery-orders" },
    ],
  },
  { label: "Reportes", href: "/reports", icon: "bi-bar-chart-line" },
  {
    label: "Contabilidad",
    icon: "bi-calculator",
    children: [
      { label: "Libros en Excel", href: "/accounting/books-excel" },
      { label: "Libros electrónicos", href: "/accounting/books" },
      { label: "Plan de cuentas", href: "/accounting/chart" },
      { label: "Asientos automáticos", href: "/accounting/entries" },
      { label: "Libro diario", href: "/accounting/daily" },
    ],
  },
  {
    label: "SIRE",
    icon: "bi-cloud-upload",
    children: [
      { label: "Anexos", href: "/sire/annexes" },
      { label: "Compras", href: "/sire/purchases" },
      { label: "Ventas", href: "/sire/sales" },
    ],
  },
  {
    label: "Finanzas",
    icon: "bi-currency-dollar",
    children: [
      { label: "Movimientos", href: "/finances/movements" },
      { label: "Ingresos diversos", href: "/finances/income" },
      { label: "Letras por cobrar", href: "/finances/to-collect" },
      { label: "Letras por pagar", href: "/finances/to-pay" },
    ],
  },
  { label: "Libro de Reclamaciones", href: "/complaints-book", icon: "bi-journal-text" },
  {
    label: "Configuración",
    icon: "bi-gear",
    children: [
      { label: "Parámetros generales", href: "/list-settings" },
      { label: "Copia de seguridad", href: "/backup" },
    ],
  },
  { label: "Tipo de cambio", href: "/exchange-rates", icon: "bi-arrow-left-right" },
  { label: "Mis pagos", href: "/payments", icon: "bi-credit-card" },
];

export const DOCUMENT_TYPES = [
  "FACTURA",
  "BOLETA",
  "NOTA DE CRÉDITO",
  "NOTA DE DÉBITO",
  "GUÍA DE REMISIÓN",
];

export const ESTABLISHMENTS = ["Oficina Principal"];

export const OPERATION_TYPES = [
  "Venta interna",
  "Exportación",
  "Venta no domiciliada",
  "Venta interna - Anticipos",
];

export const CURRENCIES = ["Soles", "Dólares Americanos"];

export const SERIES = ["F001", "F002", "B001", "B002"];
