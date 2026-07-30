import { prisma } from "@/lib/db/prisma";
import type { CompanySunatConfig } from "./types";

type CompanyRow = Awaited<ReturnType<typeof loadCompanyRow>>;

async function loadCompanyRow() {
  return prisma.company.findFirst();
}

function envOr(value: string | null | undefined, envKey: string) {
  return value || process.env[envKey] || "";
}

function envCert() {
  const b64 = process.env.SUNAT_CERTIFICATE_BASE64;
  if (b64) return Buffer.from(b64, "base64").toString("utf8");
  return process.env.SUNAT_CERTIFICATE_PEM || "";
}

export function companyToApiRecord(c: NonNullable<CompanyRow>, maskSecrets = true) {
  const mask = (v: string | null | undefined) => {
    if (!v) return v ?? null;
    if (!maskSecrets) return v;
    if (v.length <= 4) return "****";
    return `${v.slice(0, 2)}${"*".repeat(Math.min(v.length - 4, 8))}${v.slice(-2)}`;
  };

  return {
    id: c.id,
    number: c.ruc,
    name: c.name,
    trade_name: c.tradeName,
    logo: c.logo,
    soap_send_id: c.soapSendId,
    soap_type_id: c.soapTypeId,
    soap_username: mask(c.soapUsername),
    soap_password: mask(c.soapPassword),
    soap_url: c.soapUrl,
    soap_sunat_username: mask(c.soapSunatUsername),
    soap_sunat_password: mask(c.soapSunatPassword),
    certificate: c.certificate,
    certificate_due: c.certificateDue?.toISOString().slice(0, 10) ?? null,
    api_sunat_id: c.apiSunatId,
    api_sunat_secret: mask(c.apiSunatSecret),
    sire_client_id: c.sireClientId,
    sire_client_secret: mask(c.sireClientSecret),
    sire_username: c.sireUsername,
    sire_password: mask(c.sirePassword),
    pse: c.pse,
    pse_url: c.pseUrl,
    pse_token: mask(c.pseToken),
    client_id_pse: c.clientIdPse,
    send_document_to_pse: c.sendDocumentToPse,
    type_send_pse: c.typeSendPse,
    is_rus: c.isRus,
    operation_amazonia: c.operationAmazonia,
    detraction_account: c.detractionAccount,
    footer_text_template: c.footerTextTemplate,
    config_system_env: c.configSystemEnv,
    pending_ruc_cert: c.pendingRucCert,
    pending_ruc_soap: c.pendingRucSoap,
    pending_ruc_name: c.pendingRucName,
    has_certificate: Boolean(c.certificatePem || envCert()),
    soap_type_description: c.soapTypeId === "01" ? "Beta" : "Producción",
  };
}

export async function getCompanySunatConfig(): Promise<CompanySunatConfig | null> {
  const c = await loadCompanyRow();
  if (!c) return null;

  const certPem = c.certificatePem || envCert() || null;

  return {
    id: c.id,
    number: c.ruc,
    name: c.name,
    trade_name: c.tradeName,
    soap_send_id: c.soapSendId,
    soap_type_id: c.soapTypeId,
    soap_username: envOr(c.soapUsername, "SUNAT_SOAP_USERNAME"),
    soap_password: envOr(c.soapPassword, "SUNAT_SOAP_PASSWORD"),
    soap_url: c.soapUrl,
    soap_sunat_username: envOr(c.soapSunatUsername ?? c.soapUsername, "SUNAT_SOAP_SUNAT_USERNAME"),
    soap_sunat_password: envOr(c.soapSunatPassword ?? c.soapPassword, "SUNAT_SOAP_SUNAT_PASSWORD"),
    certificate: c.certificate,
    certificate_pem: certPem,
    certificate_password: c.certificatePassword || process.env.SUNAT_CERTIFICATE_PASSWORD || null,
    api_sunat_id: envOr(c.apiSunatId, "SUNAT_API_ID"),
    api_sunat_secret: envOr(c.apiSunatSecret, "SUNAT_API_SECRET"),
    sire_client_id: c.sireClientId || c.apiSunatId,
    sire_client_secret: c.sireClientSecret || c.apiSunatSecret,
    sire_username: c.sireUsername,
    sire_password: c.sirePassword,
    pse: c.pse,
    pse_url: c.pseUrl,
    pse_token: c.pseToken,
    client_id_pse: c.clientIdPse,
    send_document_to_pse: c.sendDocumentToPse,
    type_send_pse: c.typeSendPse,
    is_rus: c.isRus,
    operation_amazonia: c.operationAmazonia,
    config_system_env: c.configSystemEnv,
  };
}

export async function getCompanyApiRecord(maskSecrets = true) {
  const c = await loadCompanyRow();
  if (!c) return null;
  return companyToApiRecord(c, maskSecrets);
}

export function parseCompanyPayload(p: Record<string, unknown>) {
  const str = (k: string) => (p[k] != null && p[k] !== "" ? String(p[k]) : undefined);
  const bool = (k: string) => (p[k] === true || p[k] === "true" ? true : p[k] === false || p[k] === "false" ? false : undefined);
  const num = (k: string) => (p[k] != null && p[k] !== "" ? Number(p[k]) : undefined);

  return {
    name: str("name"),
    tradeName: str("trade_name"),
    ruc: str("number"),
    logo: str("logo"),
    soapSendId: str("soap_send_id"),
    soapTypeId: str("soap_type_id"),
    soapUsername: str("soap_username"),
    soapPassword: str("soap_password"),
    soapUrl: str("soap_url"),
    soapSunatUsername: str("soap_sunat_username"),
    soapSunatPassword: str("soap_sunat_password"),
    certificate: str("certificate"),
    certificatePem: str("certificate_pem"),
    certificatePassword: str("certificate_password"),
    apiSunatId: str("api_sunat_id"),
    apiSunatSecret: str("api_sunat_secret"),
    sireClientId: str("sire_client_id"),
    sireClientSecret: str("sire_client_secret"),
    sireUsername: str("sire_username"),
    sirePassword: str("sire_password"),
    pse: bool("pse"),
    pseUrl: str("pse_url"),
    pseToken: str("pse_token"),
    clientIdPse: str("client_id_pse"),
    sendDocumentToPse: bool("send_document_to_pse"),
    typeSendPse: num("type_send_pse"),
    isRus: bool("is_rus"),
    operationAmazonia: bool("operation_amazonia"),
    detractionAccount: str("detraction_account"),
    footerTextTemplate: str("footer_text_template"),
    configSystemEnv: num("config_system_env"),
    pendingRucCert: bool("pending_ruc_cert"),
    pendingRucSoap: bool("pending_ruc_soap"),
    pendingRucName: bool("pending_ruc_name"),
  };
}
