import { API, toSearchParams, type PaginatedQuery } from "./endpoints";

function apiBase(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_API_MODE === "remote" ? "/api/proxy" : "/api/local";
  }
  return process.env.API_MODE === "remote" ? "/api/proxy" : "/api/local";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const raw = await res.text();
  if (!res.ok) {
    try {
      const err = raw ? JSON.parse(raw) : { error: res.statusText };
      throw new Error(err.error || `HTTP ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message !== res.statusText) throw e;
      throw new Error(raw || res.statusText || `HTTP ${res.status}`);
    }
  }
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

function local(path: string, query?: PaginatedQuery) {
  const qs = query ? "?" + new URLSearchParams(toSearchParams(query)).toString() : "";
  return `${apiBase()}${path}${qs}`;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ ok: boolean; user: { name: string; email: string } }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiFetch<{ authenticated: boolean; user?: { name: string; email: string } }>("/api/auth/me"),
    logout: () => apiFetch("/api/auth/me", { method: "DELETE" }),
  },

  dashboard: {
    stats: (query?: Record<string, string>) => {
      const qs = query ? "?" + new URLSearchParams(query).toString() : "";
      return apiFetch<Record<string, unknown>>(`${apiBase()}/dashboard/stats${qs}`);
    },
  },

  documents: {
    records: (q: PaginatedQuery = { page: 1, limit: 20, order: "desc" }) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
        local(API.documents.records, q)
      ),
    tables: () => apiFetch<Record<string, unknown>>(local(API.documents.tables)),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/documents/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    email: (id: number | string, email: string) =>
      apiFetch<{ success: boolean; message: string }>(local(`/documents/${id}/email`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    whatsapp: (id: number | string, phone?: string, mode: "pdf" | "url" = "url") =>
      apiFetch<{ success: boolean; url: string; message: string }>(local(`/documents/${id}/whatsapp`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode }),
      }),
    shareLink: (id: number | string) =>
      apiFetch<{ share_token: string; public_url: string }>(local(`/documents/${id}/share-link`)),
    notSent: () =>
      apiFetch<{ data: Record<string, unknown>[] }>(local("/documents/not-sent/records")),
    regularizeShipping: () =>
      apiFetch<{ data: Record<string, unknown>[] }>(local("/documents/regularize-shipping/records")),
    regularize: (id: number) =>
      apiFetch(local(`/documents/${id}/regularize`), { method: "POST" }),
    massive: (payload: Record<string, unknown>) =>
      apiFetch<{ created: number }>(local("/documents/massive"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    resend: (id: number) =>
      apiFetch<{ success: boolean; message: string }>(local(`/documents/${id}/resend`), {
        method: "POST",
      }),
    delete: (id: number) => apiFetch(local(`/documents/${id}`), { method: "DELETE" }),
  },

  customers: {
    records: (q: PaginatedQuery = { page: 1, limit: 20 }) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
        local(API.customers.records, q)
      ),
    search: (value: string, limit = 10) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
        local(API.customers.records, { page: 1, limit, column: "search", value })
      ),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/persons/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/persons/customers/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      apiFetch(local(`/persons/customers/${id}`), { method: "DELETE" }),
    get: (id: number) =>
      apiFetch<{ data: Record<string, unknown> }>(local(`/persons/customers/${id}`)),
  },

  suppliers: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/persons/suppliers/records")),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/persons/suppliers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/persons/suppliers/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      apiFetch(local(`/persons/suppliers/${id}`), { method: "DELETE" }),
  },

  items: {
    records: (q: PaginatedQuery = { page: 1, limit: 20 }) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
        local(API.items.records, q)
      ),
    columns: () => apiFetch<Record<string, string>>(local(API.items.columns)),
    search: (value: string, limit = 10) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
        local(API.items.records, { page: 1, limit, column: "search", value })
      ),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/items"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/items/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      apiFetch(local(`/items/${id}`), { method: "DELETE" }),
  },

  categories: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/categories/records")),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/categories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/categories/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      apiFetch(local(`/categories/${id}`), { method: "DELETE" }),
  },

  purchases: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/purchases/records")),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/purchases/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/purchases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/purchases/${id}`), { method: "DELETE" }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/purchases/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  },

  saleNotes: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/sale-notes/records")),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/sale-notes/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/sale-notes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/sale-notes/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/sale-notes/${id}`), { method: "DELETE" }),
  },

  quotations: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/quotations/records")),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/quotations/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/quotations"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/quotations/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/quotations/${id}`), { method: "DELETE" }),
  },

  inventory: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/inventory/records")),
    stock: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/inventory/stock")),
    adjust: (payload: Record<string, unknown>) =>
      apiFetch(local("/inventory/adjust"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    updateMovement: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/inventory/movements/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    deleteMovement: (id: number) => apiFetch(local(`/inventory/movements/${id}`), { method: "DELETE" }),
    import: (rows: { product: string; establishment: string; stock: number }[]) =>
      apiFetch<{ updated: number; total: number }>(local("/inventory/import"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      }),
  },

  cash: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/cash/records")),
    toggle: (id: number, balance = 0) =>
      apiFetch(local("/cash/toggle"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, balance }),
      }),
    open: (payload: Record<string, unknown>) =>
      apiFetch(local("/cash/open"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/cash/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/cash/${id}`), { method: "DELETE" }),
    report: (id: number, type: string) =>
      apiFetch<{ data: Record<string, unknown>[] }>(local(`/cash/${id}/report?type=${type}`)),
  },

  establishments: {
    records: () =>
      apiFetch<{ data: Record<string, unknown>[] }>(local(API.establishments.records, { page: 1, limit: 50 })),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/establishments"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/establishments/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/establishments/${id}`), { method: "DELETE" }),
  },

  users: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/users/records")),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/users/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) =>
      apiFetch(local(`/users/${id}`), { method: "DELETE" }),
  },

  exchangeRates: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/exchange_rates/records")),
    update: (sale: string) =>
      apiFetch(local("/exchange_rates"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sale }),
      }),
  },

  finances: {
    movements: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/finances/movements/records")),
    toPay: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/finances/to-pay/records")),
    toCollect: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/finances/to-collect/records")),
    income: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/finances/income/records")),
  },

  services: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/services/records")),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/services"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/services/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/services/${id}`), { method: "DELETE" }),
  },

  dispatches: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/dispatches/records")),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/dispatches/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/dispatches"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/dispatches/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/dispatches/${id}`), { method: "DELETE" }),
  },

  orderNotes: {
    records: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/order-notes/records")),
    get: (id: number | string) => apiFetch<{ data: Record<string, unknown> }>(local(`/order-notes/${id}`)),
    create: (payload: Record<string, unknown>) =>
      apiFetch(local("/order-notes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/order-notes/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (id: number) => apiFetch(local(`/order-notes/${id}`), { method: "DELETE" }),
  },

  sire: {
    sales: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/sire/sales/records")),
    purchases: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/sire/purchases/records")),
    annexes: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/sire/annexes/records")),
    propuestaVentas: (period?: string) =>
      apiFetch<{ data: Record<string, unknown> }>(
        `${apiBase()}/sire/propuesta/ventas${period ? `?period=${encodeURIComponent(period)}` : ""}`
      ),
    propuestaCompras: (period?: string) =>
      apiFetch<{ data: Record<string, unknown> }>(
        `${apiBase()}/sire/propuesta/compras${period ? `?period=${encodeURIComponent(period)}` : ""}`
      ),
  },

  company: {
    get: () => apiFetch<{ data: Record<string, unknown> }>(local("/company")),
    update: (payload: Record<string, unknown>) =>
      apiFetch(local("/company"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    testSoap: () =>
      apiFetch<{ success: boolean; message: string }>(local("/company/test-soap"), { method: "POST" }),
    testApi: () =>
      apiFetch<{ success: boolean; message: string }>(local("/company/test-api"), { method: "POST" }),
    testSire: () =>
      apiFetch<{ success: boolean; message: string }>(local("/company/test-sire"), { method: "POST" }),
    uploadCertificate: (payload: { filename: string; file_base64: string; password?: string }) =>
      apiFetch<{ success: boolean; message: string; data: Record<string, unknown> }>(
        local("/company/upload-certificate"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      ),
  },

  accounting: {
    chart: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/accounting/chart/records")),
    daily: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/accounting/daily/records")),
    entries: () => apiFetch<{ data: Record<string, unknown>[] }>(local("/accounting/entries/records")),
    updateChart: (id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/accounting/chart/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    deleteChart: (id: number) => apiFetch(local(`/accounting/chart/${id}`), { method: "DELETE" }),
    deleteDaily: (id: number) => apiFetch(local(`/accounting/daily/${id}`), { method: "DELETE" }),
  },

  reports: {
    fetch: (path: string) =>
      apiFetch<{ data: Record<string, unknown>[] }>(local(`/${path}`)),
  },

  generic: {
    records: (apiPath: string) =>
      apiFetch<{ data: Record<string, unknown>[]; meta?: { total: number } }>(
        local(`/${apiPath.replace(/^\/+/, "")}`)
      ),
    create: (modulePath: string, payload: Record<string, unknown>) =>
      apiFetch(local(`/${modulePath.replace(/^\/+/, "")}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    update: (modulePath: string, id: number, payload: Record<string, unknown>) =>
      apiFetch(local(`/${modulePath.replace(/^\/+/, "")}/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    delete: (modulePath: string, id: number) =>
      apiFetch(local(`/${modulePath.replace(/^\/+/, "")}/${id}`), { method: "DELETE" }),
  },

  pos: {
    tables: () => apiFetch<Record<string, unknown>>(local(API.pos.tables)),
    sale: (payload: Record<string, unknown>) =>
      apiFetch<{ success: boolean; receipt?: Record<string, unknown> }>(local("/pos/sale"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
  },
};
