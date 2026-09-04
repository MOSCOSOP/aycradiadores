import { inflateRawSync } from "zlib";
import type { CompanySunatConfig, SunatSendResult } from "./types";
import { signSunatXml } from "./xml-signer";
import { buildVoidedDocumentsXml } from "./voided-documents-xml";

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

// Catálogo SUNAT 05 (código de tributo) por afectación — cada tipo de afectación va con su
// PROPIO cac:TaxScheme, no todos "1000/IGV/VAT". Usar siempre el esquema IGV con monto 0.00
// para líneas exoneradas/inafectas es lo que causaba el rechazo real de SUNAT "el monto de
// afectación de IGV por línea debe ser diferente a 0.00" (código 3111) — confirmado con un
// envío real rechazado en Producción antes de este fix. Tabla verificada contra una librería
// de facturación electrónica peruana real y ampliamente usada en producción (greenter).
const TRIBUTO_BY_AFECTACION: Record<string, { id: string; name: string; typeCode: string }> = {
  "10": { id: "1000", name: "IGV", typeCode: "VAT" }, // Gravado
  "20": { id: "9997", name: "EXO", typeCode: "VAT" }, // Exonerado
  "30": { id: "9998", name: "INA", typeCode: "FRE" }, // Inafecto
  "40": { id: "9995", name: "EXP", typeCode: "FRE" }, // Exportación
};

/** Catálogo SUNAT 07 (afectación IGV) -> catálogo 05 (código de tributo) + % + motivo de exoneración. */
function igvCategoryFor(saleAffectationTypeId: string | undefined, hasIgvHint: boolean) {
  // "10" Gravado - Operación Onerosa (18%). Cualquier otro código (20 Exonerado, 30 Inafecto,
  // 40 Exportación, ...) se trata como sin IGV, usando el propio código como motivo (catálogo 07).
  const code = saleAffectationTypeId || (hasIgvHint ? "10" : "20");
  const gravado = code === "10";
  const tributo = TRIBUTO_BY_AFECTACION[code] ?? TRIBUTO_BY_AFECTACION["20"];
  return { code, percent: gravado ? 18 : 0, gravado, tributo };
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
  totalExonerated?: number;
  total: number;
  lines: {
    description: string;
    quantity: number;
    unitValue: number;
    unitPrice: number;
    saleAffectationTypeId?: string;
  }[];
}) {
  const totalExonerated = input.totalExonerated ?? 0;

  const lines = input.lines
    .map((l, i) => {
      const { code, percent, gravado, tributo } = igvCategoryFor(l.saleAffectationTypeId, l.unitPrice > l.unitValue);
      const lineExtension = l.quantity * l.unitValue;
      const lineIgv = gravado ? l.quantity * (l.unitPrice - l.unitValue) : 0;
      return `
    <cac:InvoiceLine>
      <cbc:ID>${i + 1}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="NIU">${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${input.currency}">${lineExtension.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:PricingReference>
        <cac:AlternativeConditionPrice>
          <cbc:PriceAmount currencyID="${input.currency}">${l.unitPrice.toFixed(2)}</cbc:PriceAmount>
          <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
        </cac:AlternativeConditionPrice>
      </cac:PricingReference>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${input.currency}">${lineIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="${input.currency}">${lineExtension.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="${input.currency}">${lineIgv.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:Percent>${percent}</cbc:Percent>
            <cbc:TaxExemptionReasonCode>${code}</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme>
              <cbc:ID>${tributo.id}</cbc:ID>
              <cbc:Name>${tributo.name}</cbc:Name>
              <cbc:TaxTypeCode>${tributo.typeCode}</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item><cbc:Description>${escapeXml(l.description)}</cbc:Description></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${input.currency}">${l.unitValue.toFixed(2)}</cbc:PriceAmount></cac:Price>
    </cac:InvoiceLine>`;
    })
    .join("");

  const subtotals = [
    input.totalTaxed > 0
      ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${input.currency}">${input.totalTaxed.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${input.currency}">${input.totalIgv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
      : "",
    totalExonerated > 0
      ? `
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${input.currency}">${totalExonerated.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${input.currency}">0.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:ID>9997</cbc:ID><cbc:Name>EXO</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>`
      : "",
  ].join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${input.series}-${input.number}</cbc:ID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode listID="0101">${input.docType}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>SignatureSP</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification><cbc:ID schemeID="6">${input.ruc}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(input.tradeName)}</cbc:Name></cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="6">${input.ruc}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(input.tradeName)}</cbc:Name></cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(input.tradeName)}</cbc:RegistrationName>
        <cbc:CompanyID schemeID="6">${input.ruc}</cbc:CompanyID>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode>0000</cbc:AddressTypeCode>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="${input.customerDocType}">${input.customerNumber}</cbc:ID></cac:PartyIdentification>
      <cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.customerName)}</cbc:RegistrationName><cbc:CompanyID schemeID="${input.customerDocType}">${input.customerNumber}</cbc:CompanyID></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentTerms>
    <cbc:ID>FormaPago</cbc:ID>
    <cbc:PaymentMeansID>Contado</cbc:PaymentMeansID>
  </cac:PaymentTerms>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${input.currency}">${input.totalIgv.toFixed(2)}</cbc:TaxAmount>${subtotals}
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${(input.totalTaxed + totalExonerated).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="${input.currency}">${input.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${input.currency}">${input.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${lines}
</Invoice>`;
}

function zipSingleFile(filename: string, content: Buffer) {
  const nameBuf = Buffer.from(filename, "utf8");
  const crcVal = crc32(content);
  // 30 bytes exactos: solo los campos fijos de la cabecera. El nombre del archivo se
  // concatena aparte (ver el Buffer.concat al final) — reservar espacio de más aquí
  // dejaba una cola de bytes en cero que corrompía el zip completo (offsets desalineados).
  const localHeader = Buffer.alloc(30);
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
  // Mismo motivo que localHeader: 46 bytes exactos, el nombre va aparte en el concat.
  const central = Buffer.alloc(46);
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
  end.writeUInt16LE(0, 20); // longitud del comentario del ZIP — debe ser 0 (sin comentario)
  return Buffer.concat([localHeader, nameBuf, content, central, nameBuf, end]);
}

/**
 * Lee el primer archivo REAL (no carpeta) de un .zip. Los CDR de SUNAT vienen con una entrada
 * "dummy/" (carpeta vacía) ANTES del XML de respuesta — si solo se lee la primera entrada del
 * directorio central, se obtiene esa carpeta vacía en vez del XML (confirmado con un envío real
 * a SUNAT Beta: siempre daba "CDR sin código de respuesta reconocible").
 * Soporta almacenamiento sin comprimir (method 0) y DEFLATE (method 8, lo más común).
 */
function readFirstZipEntry(zipBuffer: Buffer): { filename: string; content: Buffer } | null {
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
  let centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
  if (entryCount === 0) return null;

  const CENTRAL_SIG = 0x02014b50;
  const LOCAL_SIG = 0x04034b50;

  for (let i = 0; i < entryCount; i++) {
    if (zipBuffer.readUInt32LE(centralDirOffset) !== CENTRAL_SIG) return null;

    const compressionMethod = zipBuffer.readUInt16LE(centralDirOffset + 10);
    const compressedSize = zipBuffer.readUInt32LE(centralDirOffset + 20);
    const uncompressedSize = zipBuffer.readUInt32LE(centralDirOffset + 24);
    const fileNameLength = zipBuffer.readUInt16LE(centralDirOffset + 28);
    const extraLength = zipBuffer.readUInt16LE(centralDirOffset + 30);
    const commentLength = zipBuffer.readUInt16LE(centralDirOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(centralDirOffset + 42);
    const filename = zipBuffer
      .subarray(centralDirOffset + 46, centralDirOffset + 46 + fileNameLength)
      .toString("utf8");

    const nextCentralDirOffset = centralDirOffset + 46 + fileNameLength + extraLength + commentLength;

    // Carpeta (termina en "/", sin contenido) — no es el archivo que buscamos, sigue con la siguiente entrada.
    if (filename.endsWith("/") || uncompressedSize === 0) {
      centralDirOffset = nextCentralDirOffset;
      continue;
    }

    if (zipBuffer.readUInt32LE(localHeaderOffset) !== LOCAL_SIG) return null;
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    const content = compressionMethod === 0 ? Buffer.from(compressedData) : inflateRawSync(compressedData);
    return { filename, content };
  }

  return null;
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

async function soapSendSummary(config: CompanySunatConfig, fileName: string, zipBuffer: Buffer) {
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
    <ser:sendSummary>
      <fileName>${escapeXml(fileName)}</fileName>
      <contentFile>${contentFile}</contentFile>
    </ser:sendSummary>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "sendSummary",
    },
    body: envelope,
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function soapGetStatus(config: CompanySunatConfig, ticket: string) {
  const { user, pass } = soapCredentials(config);
  const endpoint = soapEndpoint(config);
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
    <ser:getStatus>
      <ticket>${escapeXml(ticket)}</ticket>
    </ser:getStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "getStatus",
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
    totalExonerated?: number;
    total: number;
    customer: { name: string; number: string; identityDocumentTypeId?: string };
    items: { description: string; quantity: number; unitValue: number; unitPrice: number; saleAffectationTypeId?: string }[];
  }
): Promise<SunatSendResult> {
  if (!config.certificate_pem) {
    return {
      success: false,
      message:
        "No hay certificado digital configurado. Sube el .p12/.pfx en Configuración > Empresa antes de enviar a SUNAT.",
      mode: "soap",
    };
  }

  const issueDate = doc.dateOfIssue.toISOString().slice(0, 10);
  const unsignedXml = buildMinimalInvoiceXml({
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
    totalExonerated: doc.totalExonerated,
    total: doc.total,
    lines: doc.items,
  });

  let xml: string;
  try {
    xml = signSunatXml(unsignedXml, config.certificate_pem);
  } catch (e) {
    return {
      success: false,
      message: `No se pudo firmar el XML con el certificado configurado: ${e instanceof Error ? e.message : String(e)}`,
      mode: "soap",
    };
  }

  const xmlName = `${config.number}-${doc.documentTypeId}-${doc.series}-${doc.number}.xml`;
  const zipName = `${config.number}-${doc.documentTypeId}-${doc.series}-${doc.number}.zip`;
  const xmlBuffer = Buffer.from(xml, "utf8");
  const zip = zipSingleFile(xmlName, xmlBuffer);
  const result = await soapSendBill(config, zipName, zip);

  if (result.text.includes("faultstring")) {
    const match = result.text.match(/<faultstring[^>]*>([^<]+)/i);
    return {
      success: false,
      message: match?.[1] || `SUNAT rechazó el envío (${result.status})`,
      mode: "soap",
      xml,
    };
  }

  // El CDR real viene en <applicationResponse> como un .zip en base64 — hay que abrirlo y leer
  // el <cbc:ResponseCode> del XML de dentro. Un HTTP 200 por sí solo NO significa aceptado.
  const appResponseMatch = result.text.match(/<applicationResponse[^>]*>([^<]+)<\/applicationResponse>/i);
  if (!appResponseMatch) {
    return {
      success: false,
      message: `SUNAT no devolvió un CDR reconocible (HTTP ${result.status}). Respuesta: ${result.text.slice(0, 300)}`,
      mode: "soap",
      xml,
    };
  }

  let cdrXml = "";
  try {
    const cdrZip = Buffer.from(appResponseMatch[1], "base64");
    const entry = readFirstZipEntry(cdrZip);
    if (!entry) throw new Error("ZIP de CDR vacío o con formato no reconocido");
    cdrXml = entry.content.toString("utf8");
  } catch (e) {
    return {
      success: false,
      message: `No se pudo leer el CDR devuelto por SUNAT: ${e instanceof Error ? e.message : String(e)}`,
      mode: "soap",
      xml,
    };
  }

  const responseCode = cdrXml.match(/<cbc:ResponseCode[^>]*>([^<]+)<\/cbc:ResponseCode>/)?.[1] ?? null;
  const description = cdrXml.match(/<cbc:Description[^>]*>([^<]*)<\/cbc:Description>/)?.[1] ?? "";

  if (responseCode !== "0") {
    return {
      success: false,
      message: responseCode
        ? `SUNAT no aceptó el comprobante (código ${responseCode}): ${description || "sin detalle"}`
        : `El CDR de SUNAT no trae código de respuesta reconocible: ${description || cdrXml.slice(0, 200)}`,
      mode: "soap",
      cdr: cdrXml,
      xml,
    };
  }

  return {
    success: true,
    message: `Comprobante ${doc.fullNumber} aceptado por SUNAT (CDR código 0${description ? `: ${description}` : ""})`,
    mode: "soap",
    cdr: cdrXml,
    xml,
  };
}

export type VoidedDocumentsSendResult = {
  success: boolean;
  message: string;
  ticket?: string;
  xml?: string;
};

/**
 * Envía la Comunicación de Baja (RC) real a SUNAT para uno o más comprobantes. Devuelve un
 * `ticket` — SUNAT procesa esto de forma asíncrona, hay que consultar {@link getSunatTicketStatus}
 * unos segundos/minutos después para saber si la baja fue aceptada.
 */
export async function sendVoidedDocumentsToSunat(
  config: CompanySunatConfig,
  input: {
    id: string;
    referenceDate: string;
    issueDate: string;
    lines: { documentTypeId: string; series: string; number: number; voidReason: string }[];
  }
): Promise<VoidedDocumentsSendResult> {
  if (!config.certificate_pem) {
    return {
      success: false,
      message: "No hay certificado digital configurado. Sube el .p12/.pfx en Configuración > Empresa.",
    };
  }

  const unsignedXml = buildVoidedDocumentsXml({
    ruc: config.number,
    tradeName: config.trade_name,
    referenceDate: input.referenceDate,
    issueDate: input.issueDate,
    id: input.id,
    lines: input.lines,
  });

  let xml: string;
  try {
    xml = signSunatXml(unsignedXml, config.certificate_pem);
  } catch (e) {
    return {
      success: false,
      message: `No se pudo firmar la Comunicación de Baja: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const baseName = `${config.number}-${input.id}`;
  const xmlBuffer = Buffer.from(xml, "utf8");
  const zip = zipSingleFile(`${baseName}.xml`, xmlBuffer);

  try {
    const result = await soapSendSummary(config, `${baseName}.zip`, zip);

    if (result.text.includes("faultstring")) {
      const match = result.text.match(/<faultstring[^>]*>([^<]+)/i);
      return { success: false, message: match?.[1] || `SUNAT rechazó el envío (${result.status})`, xml };
    }

    const ticketMatch = result.text.match(/<ticket>([^<]+)<\/ticket>/i);
    if (!ticketMatch) {
      return {
        success: false,
        message: `SUNAT no devolvió un ticket reconocible (HTTP ${result.status}): ${result.text.slice(0, 300)}`,
        xml,
      };
    }

    return {
      success: true,
      message: `Comunicación de Baja enviada a SUNAT. Ticket: ${ticketMatch[1]} — consulta el estado en unos minutos.`,
      ticket: ticketMatch[1],
      xml,
    };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Error al enviar la Comunicación de Baja", xml };
  }
}

export type SunatTicketStatusResult = {
  /** true si SUNAT ya terminó de procesar el ticket (aceptado o rechazado); false si sigue en cola. */
  done: boolean;
  accepted?: boolean;
  message: string;
  cdr?: string;
};

/** Consulta el estado de un ticket de sendSummary (Comunicación de Baja, Resumen diario, etc.). */
export async function getSunatTicketStatus(
  config: CompanySunatConfig,
  ticket: string
): Promise<SunatTicketStatusResult> {
  const result = await soapGetStatus(config, ticket);

  if (result.text.includes("faultstring")) {
    const match = result.text.match(/<faultstring[^>]*>([^<]+)/i);
    return { done: true, accepted: false, message: match?.[1] || `SUNAT rechazó la consulta (${result.status})` };
  }

  const statusCode = result.text.match(/<statusCode>([^<]+)<\/statusCode>/i)?.[1];
  const contentMatch = result.text.match(/<content>([^<]+)<\/content>/i);

  if (!contentMatch) {
    // Sin <content> todavía = SUNAT sigue procesando el ticket.
    return { done: false, message: `SUNAT sigue procesando (código de estado: ${statusCode ?? "desconocido"})` };
  }

  try {
    const zip = Buffer.from(contentMatch[1], "base64");
    const entry = readFirstZipEntry(zip);
    if (!entry) throw new Error("ZIP de constancia vacío o con formato no reconocido");
    const cdrXml = entry.content.toString("utf8");
    const responseCode = cdrXml.match(/<cbc:ResponseCode[^>]*>([^<]+)<\/cbc:ResponseCode>/)?.[1] ?? null;
    const description = cdrXml.match(/<cbc:Description[^>]*>([^<]*)<\/cbc:Description>/)?.[1] ?? "";

    return {
      done: true,
      accepted: responseCode === "0",
      message:
        responseCode === "0"
          ? `SUNAT aceptó la Comunicación de Baja${description ? `: ${description}` : ""}`
          : `SUNAT no aceptó la Comunicación de Baja (código ${responseCode ?? "?"}): ${description || "sin detalle"}`,
      cdr: cdrXml,
    };
  } catch (e) {
    return { done: true, accepted: false, message: `No se pudo leer la constancia de SUNAT: ${e instanceof Error ? e.message : String(e)}` };
  }
}
