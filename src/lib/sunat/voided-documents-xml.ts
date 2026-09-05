function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Comunicación de Baja (RC) — UBL "VoidedDocuments". Es el mecanismo real que SUNAT exige para
 * anular un comprobante ya aceptado: se declara qué comprobantes se anulan y por qué, se firma
 * igual que una factura, y se envía con `sendSummary` (no `sendBill`) — la respuesta es un
 * `ticket` que hay que consultar después con `getStatus` para obtener la constancia.
 */
export function buildVoidedDocumentsXml(input: {
  ruc: string;
  tradeName: string;
  /** Fecha de emisión de los comprobantes que se están dando de baja (YYYY-MM-DD). */
  referenceDate: string;
  /** Fecha de esta comunicación de baja (YYYY-MM-DD). */
  issueDate: string;
  /** Correlativo único del día, ej. "RC-20260902-1". */
  id: string;
  lines: {
    documentTypeId: string;
    series: string;
    number: number;
    voidReason: string;
  }[];
}) {
  const lines = input.lines
    .map(
      (l, i) => `
    <sac:VoidedDocumentsLine>
      <cbc:LineID>${i + 1}</cbc:LineID>
      <cbc:DocumentTypeCode>${l.documentTypeId}</cbc:DocumentTypeCode>
      <sac:DocumentSerialID>${escapeXml(l.series)}</sac:DocumentSerialID>
      <sac:DocumentNumberID>${l.number}</sac:DocumentNumberID>
      <sac:VoidReasonDescription>${escapeXml(l.voidReason || "Error en la emisión")}</sac:VoidReasonDescription>
    </sac:VoidedDocumentsLine>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<VoidedDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:VoidedDocuments-1"
 xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
 xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
 xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
 xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1"
 xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.0</cbc:UBLVersionID>
  <cbc:CustomizationID>1.0</cbc:CustomizationID>
  <cbc:ID>${input.id}</cbc:ID>
  <cbc:ReferenceDate>${input.referenceDate}</cbc:ReferenceDate>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cac:Signature>
    <cbc:ID>SignatureSP</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification><cbc:ID>${input.ruc}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(input.tradeName)}</cbc:Name></cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>#SignatureSP</cbc:URI></cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>${input.ruc}</cbc:CustomerAssignedAccountID>
    <cbc:AdditionalAccountID>6</cbc:AdditionalAccountID>
    <cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.tradeName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party>
  </cac:AccountingSupplierParty>${lines}
</VoidedDocuments>`;
}
