import type { CompanySunatConfig, SunatTokenResponse } from "./types";

const TOKEN_BASE = "https://api-seguridad.sunat.gob.pe/v1/clientessol";

export async function getSunatOAuthToken(config: CompanySunatConfig): Promise<SunatTokenResponse> {
  const clientId = config.api_sunat_id;
  const clientSecret = config.api_sunat_secret;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan api_sunat_id o api_sunat_secret");
  }

  const url = `${TOKEN_BASE}/${clientId}/oauth2/token/`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Token SUNAT ${res.status}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text) as SunatTokenResponse;
}

export async function testSunatApiConnection(config: CompanySunatConfig) {
  const token = await getSunatOAuthToken(config);
  return {
    success: true,
    message: "Conexión API SUNAT / SIRE exitosa",
    token_type: token.token_type,
    expires_in: token.expires_in,
  };
}
