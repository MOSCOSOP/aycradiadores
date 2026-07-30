import { getRemoteBaseUrl, getSession, type SessionData } from "@/lib/auth/session";

type RemoteRequestOptions = {
  method?: string;
  body?: unknown;
  session?: SessionData | null;
  searchParams?: Record<string, string | number | undefined>;
};

function buildCookieHeader(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function mergeCookies(existing: string, setCookies: string[]): string {
  const jar = new Map<string, string>();
  for (const part of existing.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) jar.set(k, v.join("="));
  }
  for (const sc of setCookies) {
    const [pair] = sc.split(";");
    const [k, ...v] = pair.trim().split("=");
    if (k) jar.set(k, v.join("="));
  }
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

function extractCsrfFromHtml(html: string): string | null {
  const match = html.match(/name="_token"\s+value="([^"]+)"/);
  return match?.[1] ?? null;
}

function extractMetaCsrf(html: string): string | null {
  const match = html.match(/csrf-token"\s+content="([^"]+)"/);
  return match?.[1] ?? null;
}

function decodeXsrfToken(cookieHeader: string): string | null {
  const match = cookieHeader.match(/XSRF-TOKEN=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export async function remoteLogin(
  email: string,
  password: string
): Promise<SessionData> {
  const base = getRemoteBaseUrl();

  const loginPage = await fetch(`${base}/login`, {
    headers: { Accept: "text/html" },
  });
  const loginHtml = await loginPage.text();
  const csrf = extractCsrfFromHtml(loginHtml);
  if (!csrf) throw new Error("No se pudo obtener token CSRF del login remoto");

  const setCookies1 = loginPage.headers.getSetCookie?.() ?? [];
  let cookieHeader = buildCookieHeader(setCookies1);

  const form = new URLSearchParams({
    email,
    password,
    _token: csrf,
  });

  const loginRes = await fetch(`${base}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      Accept: "text/html",
    },
    body: form.toString(),
    redirect: "manual",
  });

  const setCookies2 = loginRes.headers.getSetCookie?.() ?? [];
  cookieHeader = mergeCookies(cookieHeader, setCookies2);

  if (loginRes.status >= 400) {
    throw new Error("Credenciales inválidas");
  }

  const dash = await fetch(`${base}/dashboard`, {
    headers: { Cookie: cookieHeader, Accept: "text/html" },
    redirect: "follow",
  });
  const dashHtml = await dash.text();
  const metaCsrf = extractMetaCsrf(dashHtml);
  const xsrf = decodeXsrfToken(cookieHeader);
  const csrfToken = metaCsrf || xsrf || csrf;

  const nameMatch = dashHtml.match(/class="name text-center">\s*([^<]+)/);
  const userName = nameMatch?.[1]?.trim() || "ADMINISTRADOR";

  return {
    cookieHeader,
    csrfToken,
    remoteUrl: base,
    user: { name: userName, email, type: "admin" },
  };
}

export async function remoteFetch<T = unknown>(
  path: string,
  options: RemoteRequestOptions = {}
): Promise<T> {
  const session = options.session ?? (await getSession());
  if (!session) throw new Error("Sesión no iniciada");

  const base = session.remoteUrl || getRemoteBaseUrl();
  const url = new URL(path.startsWith("/") ? path : `/${path}`, base);

  if (options.searchParams) {
    for (const [k, v] of Object.entries(options.searchParams)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    Cookie: session.cookieHeader,
    Accept: "application/json, text/plain, */*",
    "X-Requested-With": "XMLHttpRequest",
    "X-CSRF-TOKEN": session.csrfToken,
  };

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") ?? "";
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API remota ${res.status}: ${errText.slice(0, 200)}`);
  }

  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as T;
}
