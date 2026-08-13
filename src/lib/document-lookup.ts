export type DocumentLookupResult = {
  identity_document_type_id: string;
  number: string;
  name: string;
  address?: string;
};

export async function lookupRuc(ruc: string): Promise<DocumentLookupResult> {
  const num = ruc.replace(/\D/g, "");
  if (num.length !== 11) throw new Error("RUC debe tener 11 dígitos");
  const res = await fetch(`/api/lookup/ruc?ruc=${num}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "RUC no encontrado");
  return {
    identity_document_type_id: "6",
    number: String(data.number || num),
    name: String(data.name || data.razon_social || ""),
    address: String(data.address || data.direccion || ""),
  };
}

export async function lookupDni(dni: string): Promise<DocumentLookupResult> {
  const num = dni.replace(/\D/g, "");
  if (num.length !== 8) throw new Error("DNI debe tener 8 dígitos");
  const res = await fetch(`/api/lookup/dni/${num}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "DNI no encontrado");
  return {
    identity_document_type_id: "1",
    number: String(data.number || num),
    name: String(data.name || ""),
    address: String(data.address || ""),
  };
}

export async function lookupDocument(
  typeId: string,
  number: string
): Promise<DocumentLookupResult> {
  if (typeId === "1") return lookupDni(number);
  if (typeId === "6") return lookupRuc(number);
  throw new Error("Solo RUC y DNI tienen consulta automática");
}
