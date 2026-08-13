import { randomBytes } from "crypto";

/** URL pública del sitio — nunca localhost en enlaces para clientes */
export function getPublicAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return origin.replace(/\/$/, "");
    }
  }

  return "https://aycradiadores.vercel.app";
}

export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export function buildPublicComprobanteUrl(shareToken: string): string {
  return `${getPublicAppUrl()}/c/${shareToken}`;
}
