import fs from "fs";
import path from "path";

export const EXTRACTED_DIR = path.join(process.cwd(), "extracted-ui");
const CONTENT_DIR = path.join(EXTRACTED_DIR, "content-shells");
const GENERATED_ALIASES = path.join(process.cwd(), "src/lib/path-aliases.generated.json");
const GENERATED_ROUTES = path.join(process.cwd(), "src/lib/cloned-routes.generated.json");

/** Fallback si aun no se ejecuto clone_all.py */
const DEFAULT_ALIASES: Record<string, string> = {
  "/accounting/chart": "/account/ledger_accounts",
  "/accounting/daily": "/account/sub_diaries/create",
  "/accounting/books": "/account/ple",
  "/accounting/books-excel": "/account/format",
  "/accounting/entries": "/account/sub_diaries/create_automatic",
  "/exchange-rates": "/exchange_currency",
  "/complaints-book": "/complaint",
  "/payments": "/cuenta/payment_index",
  "/sire/sales": "/sire/sale",
  "/sire/purchases": "/sire/purchase",
  "/sire/annexes": "/sire/appendix",
  "/origin-addresses": "/origin_addresses",
  "/dispatches-carrier": "/dispatch_carrier",
  "/delivery-orders": "/order-delivery",
  "/reports/kardex-average-cost": "/reports/kardexaverage",
  "/reports/kardex-valorized": "/reports/valued-kardex",
  "/reports/historical-stock": "/reports/stock_date",
  "/reports": "/list-reports",
  "/backup": "/list-settings",
  "/lines": "/line-attributes",
  "/ingredients": "/ingredient-attributes",
  "/item-lots": "/item-lots-group",
  "/finances/to-collect": "/finances/unpaid",
};

export function loadPathAliases(): Record<string, string> {
  if (fs.existsSync(GENERATED_ALIASES)) {
    return JSON.parse(fs.readFileSync(GENERATED_ALIASES, "utf-8")) as Record<string, string>;
  }
  return DEFAULT_ALIASES;
}

export function resolveExtractedPath(routePath: string): string {
  const aliases = loadPathAliases();
  return aliases[routePath] || routePath;
}

export function extractedExists(): boolean {
  return fs.existsSync(path.join(EXTRACTED_DIR, "manifest.json"));
}

export function slugifyPath(routePath: string): string {
  const p = routePath.replace(/^\/+|\/+$/g, "").replace(/\//g, "__") || "home";
  return p.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function pathFromSlug(slug: string): string {
  if (slug === "home") return "/";
  return "/" + slug.replace(/__/g, "/");
}

export type ClonedRouteEntry = {
  path: string;
  slug: string;
  has_content_shell: boolean;
  is_vue_spa?: boolean;
  embeddable?: boolean;
  title?: string;
  status?: number;
};

function findRouteEntry(routePath: string): ClonedRouteEntry | undefined {
  const routes = readClonedRoutes();
  const resolved = resolveExtractedPath(routePath);
  return routes.find((r) => r.path === routePath || r.path === resolved);
}

/** Vue/Laravel: el HTML solo trae <tenant-*> sin JS — iframe queda en blanco. */
export function htmlIsVueSpa(html: string): boolean {
  if (!/<tenant-[a-z0-9-]+/i.test(html)) return false;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;
  const visibleText = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (visibleText.length > 80) return false;
  if (/<table|<form|<button|class="card|el-table|data-table/i.test(body)) return false;
  return true;
}

/** Solo shells con HTML estático renderizable (no componentes Vue vacíos). */
export function isEmbeddableShell(routePath: string): boolean {
  if (!hasContentShell(routePath)) return false;
  const entry = findRouteEntry(routePath);
  if (entry?.is_vue_spa === true || entry?.embeddable === false) return false;
  if (entry?.is_vue_spa === false || entry?.embeddable === true) return true;
  const html = readContentShell(routePath);
  if (!html) return false;
  return !htmlIsVueSpa(html);
}

export function readClonedRoutes(): ClonedRouteEntry[] {
  if (!fs.existsSync(GENERATED_ROUTES)) return [];
  return JSON.parse(fs.readFileSync(GENERATED_ROUTES, "utf-8")) as ClonedRouteEntry[];
}

export function hasContentShell(routePath: string): boolean {
  const slug = slugifyPath(routePath);
  const direct = path.join(CONTENT_DIR, `${slug}.html`);
  if (fs.existsSync(direct)) return true;
  const resolved = resolveExtractedPath(routePath);
  const resolvedSlug = slugifyPath(resolved);
  return fs.existsSync(path.join(CONTENT_DIR, `${resolvedSlug}.html`));
}

export function readContentShell(routePath: string): string | null {
  const slug = slugifyPath(routePath);
  let file = path.join(CONTENT_DIR, `${slug}.html`);
  if (!fs.existsSync(file)) {
    const resolved = resolveExtractedPath(routePath);
    file = path.join(CONTENT_DIR, `${slugifyPath(resolved)}.html`);
  }
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

export function hasHtmlShell(routePath: string): boolean {
  return isEmbeddableShell(routePath);
}

export function readHtmlShell(routePath: string): string | null {
  if (!isEmbeddableShell(routePath)) return null;
  return readContentShell(routePath);
}

export type ExtractedManifest = {
  source: string;
  extracted_at: string;
  pages_ok: number;
  pages_failed: number;
  menu_modules: number;
};

export function readManifest(): ExtractedManifest | null {
  const file = path.join(EXTRACTED_DIR, "manifest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ExtractedManifest;
}

export type ExtractedPage = {
  path: string;
  url: string;
  title: string;
  labels: string[];
  buttons: string[];
  placeholders: string[];
  table_headers: string[];
  headings: string[];
  status_code: number;
  error?: string | null;
};

export function readPages(): ExtractedPage[] {
  const file = path.join(EXTRACTED_DIR, "pages.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ExtractedPage[];
}

export function readMenu(): unknown[] {
  const file = path.join(EXTRACTED_DIR, "menu.json");
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as unknown[];
}

export function listHtmlShells(): { slug: string; path: string }[] {
  const dir = path.join(CONTENT_DIR);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length > 0) {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => {
        const slug = f.replace(/\.html$/, "");
        return { slug, path: pathFromSlug(slug) };
      })
      .sort((a, b) => a.path.localeCompare(b.path));
  }
  const raw = path.join(EXTRACTED_DIR, "html-shells");
  if (!fs.existsSync(raw)) return [];
  return fs
    .readdirSync(raw)
    .filter((f) => f.endsWith(".html"))
    .map((f) => {
      const slug = f.replace(/\.html$/, "");
      return { slug, path: pathFromSlug(slug) };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
