import forge from "node-forge";

export type CertificateUploadResult = {
  pem: string;
  certificateName: string;
  validFrom: string | null;
  validTo: string | null;
};

function readPkcs12Pem(buffer: Buffer, password: string): CertificateUploadResult {
  const binary = buffer.toString("binary");
  const asn1 = forge.asn1.fromDer(binary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password || undefined);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBagsAlt = p12.getBags({ bagType: forge.pki.oids.keyBag });

  const certs = certBags[forge.pki.oids.certBag] ?? [];
  const keys = [
    ...(keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(keyBagsAlt[forge.pki.oids.keyBag] ?? []),
  ];

  const cert = certs.find((b) => b.cert)?.cert;
  const key = keys.find((b) => b.key)?.key;

  if (!cert) {
    throw new Error("No se encontró certificado dentro del archivo .p12/.pfx");
  }

  const parts: string[] = [];
  if (key) {
    parts.push(forge.pki.privateKeyToPem(key));
  }
  parts.push(forge.pki.certificateToPem(cert));

  const validFrom = cert.validity?.notBefore ? cert.validity.notBefore.toISOString().slice(0, 10) : null;
  const validTo = cert.validity?.notAfter ? cert.validity.notAfter.toISOString().slice(0, 10) : null;

  const cn = cert.subject.getField("CN")?.value;
  const certificateName = cn ? String(cn) : "certificado";

  return {
    pem: parts.join("\n"),
    certificateName,
    validFrom,
    validTo,
  };
}

export function certificateFileToPem(
  buffer: Buffer,
  filename: string,
  password = ""
): CertificateUploadResult {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pem") || lower.endsWith(".crt")) {
    const pem = buffer.toString("utf8").trim();
    if (!pem.includes("BEGIN CERTIFICATE")) {
      throw new Error("El archivo .pem no parece un certificado válido");
    }
    return {
      pem,
      certificateName: filename,
      validFrom: null,
      validTo: null,
    };
  }

  if (lower.endsWith(".p12") || lower.endsWith(".pfx")) {
    try {
      return readPkcs12Pem(buffer, password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("mac")) {
        throw new Error("Contraseña del certificado incorrecta. Use la clave que SUNAT le dio al descargar el .p12");
      }
      throw new Error(`No se pudo leer el .p12: ${msg}`);
    }
  }

  throw new Error("Formato no soportado. Use .p12, .pfx o .pem");
}
