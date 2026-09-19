import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "product-images";
const MAX_BYTES = 900_000;

function stripDataUrl(base64: string) {
  return base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
}

function extFromFilename(filename: string) {
  const match = filename.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/);
  return match ? match[1].replace("jpeg", "jpg") : "jpg";
}

function contentTypeFromExt(ext: string) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function ensureBucket() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Almacenamiento de imágenes no configurado");
  const { data } = await client.storage.getBucket(BUCKET);
  if (data) return client;
  const { error } = await client.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(`No se pudo crear el almacén de fotos: ${error.message}`);
  }
  return client;
}

export async function uploadProductImage(opts: {
  filename: string;
  base64: string;
}): Promise<string> {
  const client = await ensureBucket();
  const raw = stripDataUrl(opts.base64);
  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length) throw new Error("La imagen está vacía");
  if (buffer.length > MAX_BYTES) {
    throw new Error("La imagen es muy pesada. Use JPG o PNG de hasta 1 MB.");
  }
  const ext = extFromFilename(opts.filename);
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage.from(BUCKET).upload(path, buffer, {
    contentType: contentTypeFromExt(ext),
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`No se pudo guardar la imagen: ${error.message}`);
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("No se obtuvo la URL de la imagen");
  return data.publicUrl;
}

export async function deleteProductImage(url?: string | null) {
  if (!url || !url.includes(`/${BUCKET}/`)) return;
  const client = getSupabaseAdmin();
  if (!client) return;
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx < 0) return;
  const path = decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  if (!path) return;
  await client.storage.from(BUCKET).remove([path]);
}
