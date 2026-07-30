export type SessionUser = {
  name: string;
  email: string;
  type?: string;
};

export type SessionData = {
  cookieHeader: string;
  csrfToken: string;
  user?: SessionUser;
  remoteUrl: string;
  mode?: "local" | "remote";
  userId?: number;
};

const SESSION_COOKIE = "ify_session";

export async function getSession(): Promise<SessionData | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function getRemoteBaseUrl(): string {
  return (
    process.env.REMOTE_API_URL?.replace(/\/$/, "") ||
    "https://aycradiadores.iniciafacturaya.com"
  );
}
