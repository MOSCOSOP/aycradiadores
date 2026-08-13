const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
const DECENAS = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const ESPECIALES: Record<number, string> = {
  10: "DIEZ",
  11: "ONCE",
  12: "DOCE",
  13: "TRECE",
  14: "CATORCE",
  15: "QUINCE",
  16: "DIECISEIS",
  17: "DIECISIETE",
  18: "DIECIOCHO",
  19: "DIECINUEVE",
};

function under100(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 20) return ESPECIALES[n] ?? "";
  const d = Math.floor(n / 10);
  const u = n % 10;
  if (u === 0) return DECENAS[d];
  if (d === 2) return `VEINTI${UNIDADES[u]}`;
  return `${DECENAS[d]} Y ${UNIDADES[u]}`;
}

function under1000(n: number): string {
  if (n < 100) return under100(n);
  const c = Math.floor(n / 100);
  const r = n % 100;
  const cent =
    c === 1 ? "CIEN" : c === 5 ? "QUINIENTOS" : c === 7 ? "SETECIENTOS" : c === 9 ? "NOVECIENTOS" : `${UNIDADES[c]}CIENTOS`;
  return r ? `${cent} ${under100(r)}` : cent;
}

function integerWords(n: number): string {
  if (n === 0) return "CERO";
  if (n < 1000) return under1000(n);
  if (n < 1_000_000) {
    const miles = Math.floor(n / 1000);
    const r = n % 1000;
    const milesTxt = miles === 1 ? "MIL" : `${under1000(miles)} MIL`;
    return r ? `${milesTxt} ${under1000(r)}` : milesTxt;
  }
  return String(n);
}

export function amountWordsEs(total: number): string {
  const ent = Math.floor(total);
  const dec = Math.round((total - ent) * 100);
  return `${integerWords(ent)} CON ${String(dec).padStart(2, "0")}/100 Soles`;
}
