/** IGV Perú — 18% */
export const IGV_RATE = 0.18;
export const IGV_FACTOR = 1 + IGV_RATE;

export function priceWithIgv(unitValue: number) {
  return Math.round(unitValue * IGV_FACTOR * 100) / 100;
}

export function valueFromPrice(unitPrice: number) {
  return Math.round((unitPrice / IGV_FACTOR) * 10000) / 10000;
}

export function splitIgv(total: number) {
  const taxed = Math.round((total / IGV_FACTOR) * 100) / 100;
  const igv = Math.round((total - taxed) * 100) / 100;
  return { taxed, igv, total };
}
