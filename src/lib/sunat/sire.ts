import { getSunatOAuthToken } from "./auth";
import type { CompanySunatConfig } from "./types";

const SIRE_BASE = "https://api.sunat.gob.pe/v1/contribuyente/migeigv/libros";

function periodParam(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

export async function fetchSireSalesProposal(config: CompanySunatConfig, period?: string) {
  const token = await getSunatOAuthToken(config);
  const p = period || periodParam(new Date());
  const url = `${SIRE_BASE}/rvie/propuesta/web/propuesta/${p}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SIRE ventas ${res.status}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text, period: p };
  }
}

export async function fetchSirePurchasesProposal(config: CompanySunatConfig, period?: string) {
  const token = await getSunatOAuthToken(config);
  const p = period || periodParam(new Date());
  const url = `${SIRE_BASE}/rce/propuesta/web/propuesta/${p}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      Accept: "application/json",
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`SIRE compras ${res.status}: ${text.slice(0, 400)}`);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text, period: p };
  }
}

export async function testSireConnection(config: CompanySunatConfig) {
  const token = await getSunatOAuthToken(config);
  return {
    success: true,
    message: "Token SIRE obtenido correctamente",
    expires_in: token.expires_in,
  };
}

export async function getSireAnnexesStatus(config: CompanySunatConfig, period?: string) {
  const p = period || periodParam(new Date());
  const results: { id: number; name: string; records: number; status: string; period: string }[] = [];

  try {
    const sales = await fetchSireSalesProposal(config, p);
    const salesCount = Array.isArray(sales?.registros)
      ? sales.registros.length
      : Array.isArray(sales?.data)
        ? (sales.data as unknown[]).length
        : 0;
    results.push({
      id: 1,
      name: "RVIE - Registro de ventas",
      records: salesCount,
      status: salesCount ? "Propuesta disponible" : "Conectado — sin propuesta",
      period: p,
    });
  } catch (e) {
    results.push({
      id: 1,
      name: "RVIE - Registro de ventas",
      records: 0,
      status: e instanceof Error ? e.message.slice(0, 80) : "Error",
      period: p,
    });
  }

  try {
    const purchases = await fetchSirePurchasesProposal(config, p);
    const purchaseCount = Array.isArray(purchases?.registros)
      ? purchases.registros.length
      : Array.isArray(purchases?.data)
        ? (purchases.data as unknown[]).length
        : 0;
    results.push({
      id: 2,
      name: "RCE - Registro de compras",
      records: purchaseCount,
      status: purchaseCount ? "Propuesta disponible" : "Conectado — sin propuesta",
      period: p,
    });
  } catch (e) {
    results.push({
      id: 2,
      name: "RCE - Registro de compras",
      records: 0,
      status: e instanceof Error ? e.message.slice(0, 80) : "Error",
      period: p,
    });
  }

  return results;
}
