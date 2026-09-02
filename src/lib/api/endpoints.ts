/**
 * Catálogo de endpoints del sistema Inicia Factura Ya (Laravel).
 * Extraídos de la instancia aycradiadores.iniciafacturaya.com
 */
export const API = {
  // Auth
  login: "/login",
  logout: "/logout",
  dashboard: "/dashboard",

  // Documentos / Ventas
  documents: {
    records: "/documents/records",
    tables: "/documents/tables",
    create: "/documents",
    show: (id: number | string) => `/documents/${id}`,
    email: (id: number | string) => `/documents/send`,
    voided: "/voided/records",
    summaries: "/summaries/records",
    quotations: "/quotations/records",
    saleNotes: "/sale-notes/records",
    orderNotes: "/order-notes/records",
    notSent: "/documents/not-sent/records",
  },

  // Personas
  customers: {
    records: "/persons/customers/records",
    create: "/persons/customers",
    show: (id: number | string) => `/persons/customers/${id}/edit`,
  },
  suppliers: {
    records: "/persons/suppliers/records",
  },

  // Productos
  items: {
    records: "/items/records",
    columns: "/items/columns",
    create: "/items",
  },
  services: {
    records: "/services/records",
  },
  categories: {
    records: "/categories/records",
  },

  // POS
  pos: {
    tables: "/pos/tables",
    index: "/pos",
  },
  cash: {
    records: "/cash/records",
  },

  // Compras
  purchases: {
    records: "/purchases/records",
    create: "/purchases/create",
  },

  // Inventario
  inventory: {
    records: "/inventory/records",
    references: "/inventory-references/records",
    transfers: "/transfers/records",
  },

  // Configuración
  establishments: {
    records: "/establishments/records",
  },
  users: {
    records: "/users/records",
  },
  exchangeRates: "/exchange_rates/records",

  // Guías
  dispatches: {
    records: "/dispatches/records",
  },

  // Finanzas
  finances: {
    toPay: "/finances/to-pay",
    movements: "/finances/movements/records",
  },
} as const;

export type PaginatedQuery = {
  page?: number;
  limit?: number;
  column?: string;
  value?: string;
  order?: "asc" | "desc";
  input?: string;
  document_type_id?: string;
  state_type_id?: string;
};

export function toSearchParams(q: PaginatedQuery): Record<string, string> {
  const p: Record<string, string> = {};
  if (q.page) p.page = String(q.page);
  if (q.limit) p.limit = String(q.limit);
  if (q.column) p.column = q.column;
  if (q.value) p.value = q.value;
  if (q.order) p.order = q.order;
  if (q.input) p.input = q.input;
  if (q.document_type_id) p.document_type_id = q.document_type_id;
  if (q.state_type_id) p.state_type_id = q.state_type_id;
  return p;
}
