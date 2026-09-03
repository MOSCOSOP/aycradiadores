import { NAV_ITEMS, type NavChild, type NavItem } from "./constants";

/** Todas las rutas del menú (sin WhatsApp, sin #) */
export function collectAllNavPaths(): string[] {
  const paths = new Set<string>();

  function walk(nodes: NavChild[] | NavItem[]) {
    for (const node of nodes) {
      const href = "href" in node ? node.href : undefined;
      if (href && !href.startsWith("#")) paths.add(href);
      if (node.children) walk(node.children);
    }
  }

  walk(NAV_ITEMS);
  return [...paths].sort();
}

export function findNavLabel(path: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.href === path) return item.label;
    if (item.children) {
      for (const c of item.children) {
        if (c.href === path) return c.label;
        if (c.children) {
          for (const gc of c.children) {
            if (gc.href === path) return gc.label;
          }
        }
      }
    }
  }
  return null;
}

export function findNavParent(path: string): string | null {
  for (const item of NAV_ITEMS) {
    if (item.children?.some((c) => c.href === path || c.children?.some((gc) => gc.href === path))) {
      return item.label;
    }
  }
  return null;
}

/** Convierte ruta de menú a endpoint Laravel-style /records */
export function pathToRecordsApi(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (clean.endsWith("/records")) return clean;
  if (clean.endsWith("/create")) return clean.replace(/\/create$/, "") + "/records";
  return `${clean}/records`;
}

export function isCreatePath(path: string): boolean {
  return path.endsWith("/create");
}

export function listPathFromCreate(path: string): string {
  return path.replace(/\/create$/, "") || "/";
}

/** Rutas que tienen página dedicada en src/app (no usar catch-all genérico) */
export const DEDICATED_APP_PATHS = new Set([
  "/dashboard",
  "/messages",
  "/documents",
  "/documents/create",
  "/items",
  "/persons/customers",
  "/pos",
  "/purchases/create",
  "/sale-notes/create",
  "/quotations/create",
  "/dispatches/create",
  "/dispatches-carrier/create",
  "/order-notes/create",
]);

export const ALL_NAV_PATHS = collectAllNavPaths();
