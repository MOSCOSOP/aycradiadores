const MAX_SIZE = 900;
const JPEG_QUALITY = 0.82;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = src;
  });
}

export async function compressProductImage(file: File): Promise<{
  dataUrl: string;
  filename: string;
}> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo se aceptan imágenes JPG, PNG o WEBP");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("La imagen no debe superar 12 MB");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, MAX_SIZE / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    const base = file.name.replace(/\.[^.]+$/, "") || "producto";
    return { dataUrl, filename: `${base}.jpg` };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function profitPercentFromPrices(purchase: number, sale: number) {
  if (purchase <= 0) return sale > 0 ? 100 : 0;
  return Number((((sale - purchase) / purchase) * 100).toFixed(2));
}

export function saleFromProfitPercent(purchase: number, percent: number) {
  if (purchase <= 0) return 0;
  return Number((purchase * (1 + percent / 100)).toFixed(2));
}
