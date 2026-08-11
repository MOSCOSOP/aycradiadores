/** Normaliza DNI/RUC: solo dígitos, sin ceros a la izquierda. */
export function normalizeDocumentNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value.trim().toUpperCase();
  return digits.replace(/^0+/, "") || digits;
}

/** Compara si dos documentos son el mismo o muy similares (mismo DNI/RUC). */
export function documentsMatch(a: string, b: string): boolean {
  const na = normalizeDocumentNumber(a);
  const nb = normalizeDocumentNumber(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // Misma cola numérica con padding distinto (ej. 012345678 vs 12345678)
  if (na.length >= 8 && nb.length >= 8) {
    const minLen = Math.min(na.length, nb.length);
    return na.slice(-minLen) === nb.slice(-minLen) && Math.abs(na.length - nb.length) <= 3;
  }
  return false;
}

export type CustomerRecord = { id: number; name: string; number: string };

export function findDuplicateInList(
  number: string,
  list: Record<string, unknown>[],
  excludeId?: number
): CustomerRecord | null {
  const match = list.find(
    (c) =>
      (!excludeId || Number(c.id) !== excludeId) &&
      documentsMatch(String(c.number ?? ""), number)
  );
  if (!match) return null;
  return {
    id: Number(match.id),
    name: String(match.name ?? ""),
    number: String(match.number ?? ""),
  };
}
