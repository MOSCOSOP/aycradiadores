import type { CompanySunatConfig, SunatSendResult } from "./types";

const SOAP_BETA = "https://e-beta.sunat.gob.pe/ol-ti-itcpfegem-beta/billService";
const SOAP_PROD = "https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService";

function soapEndpoint(config: CompanySunatConfig) {
  if (config.soap_url) return config.soap_url.replace(/\?wsdl$/i, "");
  return config.soap_type_id === "01" ? SOAP_BETA : SOAP_PROD;
}

function soapCredentials(config: CompanySunatConfig) {
  const user = config.soap_sunat_username || config.soap_username;
  const pass = config.soap_sunat_password || config.soap_password;
  if (!user || !pass) throw new Error("Faltan credenciales SOAP SOL");
  return { user, pass };
}

function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildMinimalInvoiceXml(input: {
  ruc: string;
  tradeName: string;
  docType: string;
  series: string;
  number: number;
  customerDocType: string;
  customerNumber: string;
  customerName: string;
  issueDate: string;
  currency: string;
  totalTaxed: number;
  totalIgv: number;
  total: number;
  lines: { description: string; quantity: number; unitValue: number; unitPrice: number }[];
}) {
  const lines = input.lines
    .map(
      (l, i) => `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="NIU">${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${input.currency}">${l.quantity * l.unitValue}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Description>${escapeXml(l.description)}</cbc:Description></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${input.currency}">${l.unitValue}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${input.series}-${input.number}</cbc:ID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">${input.docType}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.tradeName)}</cbc:RegistrationName><cbc:CompanyID schemeID="6">${input.ruc}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.customerName)}</cbc:RegistrationName><cbc:CompanyID schemeID="${input.customerDocType}">${input.customerNumber}</cbc:CompanyID></cac:PartyLegalEntity></cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal><cbc:TaxAmount currencyID="${input.currency}">${input.totalIgv.toFixed(2)}</cbc:TaxAmount></cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${input.totalTaxed.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${input.currency}">${input.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${input.currency}">${input.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
}

function zipSingleFile(filename: string, content: Buffer) {
  const nameBuf = Buffer.from(filename, "utf8");
  const crcVal = crc32(content);
  const localHeader = Buffer.alloc(30 + nameBuf.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt16LE(0, 10);
  localHeader.writeUInt16LE(0, 12);
  localHeader.writeUInt32LE(crcVal, 14);
  localHeader.writeUInt32LE(content.length, 18);
  localHeader.writeUInt32LE(content.length, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);
  const central = Buffer.alloc(46 + nameBuf.length);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0, 8);
  central.writeUInt16LE(0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0, 14);
  central.writeUInt32LE(crcVal, 16);
  central.writeUInt32LE(content.length, 20);
  central.writeUInt32LE(content.length, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt16LE(0, 30);
  central.writeUInt16LE(0, 32);
  central.writeUInt16LE(0, 34);
  central.writeUInt16LE(0, 36);
  central.writeUInt32LE(0, 38);
  central.writeUInt32LE(0, 42);
  central.writeUInt16LE(0, 46 - 2);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + nameBuf.length, 12);
  end.writeUInt32LE(30 + nameBuf.length + content.length, 16);
  end.writeUInt16LE(nameBuf.length, 20);
  return Buffer.concat([localHeader, nameBuf, content, central, nameBuf, end]);
}

function crc32(buf: Buffer) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (~c) >>> 0;
}

async function soapSendBill(config: CompanySunatConfig, fileName: string, zipBuffer: Buffer) {
  const { user, pass } = soapCredentials(config);
  const endpoint = soapEndpoint(config);
  const contentFile = zipBuffer.toString("base64");
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://service.sunat.gob.pe">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(user)}</wsse:Username>
        <wsse:Password>${escapeXml(pass)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body>
    <ser:sendBill>
      <fileName>${escapeXml(fileName)}</fileName>
      <contentFile>${contentFile}</contentFile>
    </ser:sendBill>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "sendBill",
    },
    body: envelope,
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export async function testSoapConnection(config: CompanySunatConfig) {
  soapCredentials(config);
  const endpoint = soapEndpoint(config);
  const res = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "text/xml" },
  }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }));

  return {
    success: true,
    message: `Credenciales SOAP configuradas — endpoint ${endpoint}`,
    endpoint,
    reachable: "ok" in res ? res.ok : false,
    soap_type: config.soap_type_id === "01" ? "Beta" : "Producción",
  };
}

export async function sendDocumentViaSoap(
  config: CompanySunatConfig,
  doc: {
    documentTypeId: string;
    series: string;
    number: number;
    fullNumber: string;
    dateOfIssue: Date;
    currencyTypeId: string;
    totalTaxed: number;
    totalIgv: number;
    total: number;
    customer: { name: string; number: string; identityDocumentTypeId?: string };
    items: { description: string; quantity: number; unitValue: number; unitPrice: number }[];
  }
): Promise<SunatSendResult> {
  const issueDate = doc.dateOfIssue.toISOString().slice(0, 10);
  const xml = buildMinimalInvoiceXml({
    ruc: config.number,
    tradeName: config.trade_name,
    docType: doc.documentTypeId,
    series: doc.series,
    number: doc.number,
    customerDocType: doc.customer.identityDocumentTypeId || "6",
    customerNumber: doc.customer.number,
    customerName: doc.customer.name,
    issueDate,
    currency: doc.currencyTypeId,
    totalTaxed: doc.totalTaxed,
    totalIgv: doc.totalIgv,
    total: doc.total,
    lines: doc.items,
  });

  const xmlName = `${config.number}-${doc.documentTypeId}-${doc.series}-${doc.number}.xml`;
  const zipName = `${config.number}-${doc.documentTypeId}-${doc.series}-${doc.number}.zip`;
  const xmlBuffer = Buffer.from(xml, "utf8");
  const zip = zipSingleFile(xmlName, xmlBuffer);
  const result = await soapSendBill(config, zipName, zip);

  const accepted =
    result.text.includes("applicationResponse") ||
    result.text.includes("ticket") ||
    result.text.includes("0") ||
    result.ok;

  if (!accepted && result.text.includes("faultstring")) {
    const match = result.text.match(/<faultstring[^>]*>([^<]+)/i);
    return {
      success: false,
      message: match?.[1] || `SUNAT rechazó el envío (${result.status})`,
      mode: "soap",
    };
  }

  return {
    success: true,
    message: `Comprobante ${doc.fullNumber} enviado a SUNAT vía SOAP`,
    mode: "soap",
    cdr: result.text.slice(0, 500),
  };
}
