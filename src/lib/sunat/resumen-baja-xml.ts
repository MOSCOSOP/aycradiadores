import { TRIBUTO_BY_AFECTACION } from "./tributo-catalog";

function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Resumen de Baja de Boletas — UBL "SummaryDocuments" con línea(s) en estado "3" (Anulado).
 *
 * SUNAT NO permite anular una Boleta con la Comunicación de Baja normal (schema VoidedDocuments):
 * esa solo acepta Factura/Nota de Crédito/Nota de Débito (código 2308 "DocumentTypeCode -
 * El valor del tipo de documento es invalido" si se intenta con una boleta "03"). Las boletas
 * (y sus notas relacionadas) se anulan reportándolas de nuevo en un Resumen con ConditionCode
 * "3", igual que se reportarían normalmente con "1" — estructura verificada contra la
 * documentación real de greenter (librería de facturación electrónica peruana ampliamente usada).
 */
export function buildResumenBajaXml(input: {
  ruc: string;
  tradeName: string;
  /** Fecha de emisión de la boleta que se anula (YYYY-MM-DD). */
  referenceDate: string;
  /** Fecha de este resumen (YYYY-MM-DD). */
  issueDate: string;
  /** Correlativo único del día, ej. "RC-20260905-1". */
  id: string;
  lines: {
    series: string;
    number: number;
    customerDocType: string;
    customerNumber: string;
    currency: string;
    totalTaxed: number;
    totalIgv: number;
    totalExonerated: number;
    total: number;
    /** Afectación dominante de la boleta, para elegir el tributo del monto exonerado/inafecto. */
    saleAffectationTypeId?: string;
  }[];
}) {
  const lines = input.lines
    .map((l, i) => {
      const exemptCode = l.saleAffectationTypeId && l.saleAffectationTypeId !== "10" ? l.saleAffectationTypeId : "20";
      const exemptTributo = TRIBUTO_BY_AFECTACION[exemptCode] ?? TRIBUTO_BY_AFECTACION["20"];

      const taxSubtotals = [
        // El resumen SIEMPRE necesita el TaxSubtotal de IGV (aunque sea 0.00) — sin él SUNAT
        // rechaza con "2278 - Debe indicar Información acerca del importe total de IGV/IVAP",
        // confirmado con un envío real rechazado antes de este fix. A diferencia de la factura
        // (donde cada línea usa el tributo de SU propia afectación), aquí el tributo 1000/IGV va
        // siempre presente y el monto exonerado/inafecto se declara aparte.
        `
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="${l.currency}">${l.totalIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cac:TaxScheme><cbc:ID>1000</cbc:ID><cbc:Name>IGV</cbc:Name><cbc:TaxTypeCode>VAT</cbc:TaxTypeCode></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`,
        l.totalExonerated > 0
          ? `
      <cac:TaxSubtotal>
        <cbc:TaxAmount currencyID="${l.currency}">0.00</cbc:TaxAmount>
        <cac:TaxCategory>
          <cac:TaxScheme><cbc:ID>${exemptTributo.id}</cbc:ID><cbc:Name>${exemptTributo.name}</cbc:Name><cbc:TaxTypeCode>${exemptTributo.typeCode}</cbc:TaxTypeCode></cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>`
          : "",
      ].join("");

      return `
    <sac:SummaryDocumentsLine>
      <cbc:LineID>${i + 1}</cbc:LineID>
      <cbc:DocumentTypeCode>03</cbc:DocumentTypeCode>
      <cbc:ID>${l.series}-${l.number}</cbc:ID>
      <cac:AccountingCustomerParty>
        <cbc:CustomerAssignedAccountID>${escapeXml(l.customerNumber)}</cbc:CustomerAssignedAccountID>
        <cbc:AdditionalAccountID>${l.customerDocType}</cbc:AdditionalAccountID>
      </cac:AccountingCustomerParty>
      <cac:Status>
        <cbc:ConditionCode>3</cbc:ConditionCode>
      </cac:Status>
      <sac:TotalAmount currencyID="${l.currency}">${l.total.toFixed(2)}</sac:TotalAmount>
      <sac:BillingPayment>
        <cbc:PaidAmount currencyID="${l.currency}">${l.total.toFixed(2)}</cbc:PaidAmount>
        <cbc:InstructionID>01</cbc:InstructionID>
      </sac:BillingPayment>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${l.currency}">${l.totalIgv.toFixed(2)}</cbc:TaxAmount>${taxSubtotals}
      </cac:TaxTotal>
    </sac:SummaryDocumentsLine>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<SummaryDocuments xmlns="urn:sunat:names:specification:ubl:peru:schema:xsd:SummaryDocuments-1"
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
  <cbc:CustomizationID>1.1</cbc:CustomizationID>
  <cbc:ID>${input.id}</cbc:ID>
  <cbc:ReferenceDate>${input.referenceDate}</cbc:ReferenceDate>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cac:Signature>
    <cbc:ID>${input.ruc}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyIdentification><cbc:ID>${input.ruc}</cbc:ID></cac:PartyIdentification>
      <cac:PartyName><cbc:Name>${escapeXml(input.tradeName)}</cbc:Name></cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>#${input.ruc}-SIGN</cbc:URI></cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cbc:CustomerAssignedAccountID>${input.ruc}</cbc:CustomerAssignedAccountID>
    <cbc:AdditionalAccountID>6</cbc:AdditionalAccountID>
    <cac:Party><cac:PartyLegalEntity><cbc:RegistrationName>${escapeXml(input.tradeName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party>
  </cac:AccountingSupplierParty>${lines}
</SummaryDocuments>`;
}
