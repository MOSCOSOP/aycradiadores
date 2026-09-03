import { SignedXml } from "xml-crypto";

/**
 * Firma digital XMLDSig para comprobantes SUNAT (Perú).
 *
 * SUNAT exige que el XML UBL vaya firmado con el certificado digital del emisor antes de enviarlo
 * por `sendBill`/`sendSummary`. Sin esta firma, SUNAT rechaza el comprobante (o el envío "parece"
 * exitoso a nivel HTTP pero nunca llega un CDR de aceptación real).
 *
 * Convención usada (la misma que aplican greenter y otros firmadores usados en Perú):
 * - Firma "enveloped" sobre todo el documento (Reference URI="").
 * - Canonicalización exclusiva (C14N-EXC) + SHA-256 + RSA-SHA256.
 * - El nodo <ds:Signature> se inserta dentro de
 *   <ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent> (que el XML debe traer ya vacío).
 *
 * Requiere que el XML de entrada:
 * 1) declare `xmlns:ds="http://www.w3.org/2000/09/xmldsig#"` en la raíz, y
 * 2) tenga ya el placeholder `<ext:UBLExtensions><ext:UBLExtension><ext:ExtensionContent/></ext:UBLExtension></ext:UBLExtensions>`.
 */

function extractPemBlock(pem: string, typePattern: string): string {
  const re = new RegExp(`-----BEGIN (${typePattern})-----[\\s\\S]+?-----END \\1-----`);
  const match = pem.match(re);
  if (!match) {
    throw new Error(`No se encontró un bloque PEM de tipo "${typePattern}" en el certificado configurado`);
  }
  return match[0];
}

export function splitCertificatePem(certPem: string): { privateKeyPem: string; certificatePem: string } {
  const privateKeyPem = extractPemBlock(certPem, "(?:RSA |ENCRYPTED )?PRIVATE KEY");
  const certificatePem = extractPemBlock(certPem, "CERTIFICATE");
  return { privateKeyPem, certificatePem };
}

/**
 * Firma un XML UBL (Invoice, CreditNote, DebitNote, VoidedDocuments, SummaryDocuments, ...) que ya
 * trae el placeholder de `ext:ExtensionContent` vacío. Devuelve el XML firmado completo.
 */
export function signSunatXml(xml: string, certPem: string, signatureId = "SignatureSP"): string {
  const { privateKeyPem, certificatePem } = splitCertificatePem(certPem);

  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
  });

  sig.addReference({
    xpath: "/*",
    // El comentario de este archivo siempre dijo "C14N-EXC" para la referencia, pero acá
    // solo se aplicaba el transform enveloped-signature — sin canonicalizar explícitamente
    // el XML restante antes de calcular el digest, el resultado no es el que espera SUNAT
    // (confirmado con un envío real a Beta: "Incorrect reference digest value").
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    isEmptyUri: true,
  });

  sig.computeSignature(xml, {
    prefix: "ds",
    attrs: { Id: signatureId },
    location: { reference: "//*[local-name(.)='ExtensionContent']", action: "append" },
  });

  return sig.getSignedXml();
}
