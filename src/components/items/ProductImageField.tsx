"use client";

import { useRef, useState } from "react";
import { compressProductImage } from "@/lib/items/compress-product-image";

type ProductImageFieldProps = {
  imageUrl: string;
  onChange: (next: { imageUrl: string; imageBase64: string; imageFilename: string }) => void;
};

export function ProductImageField({ imageUrl, onChange }: ProductImageFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const applyFile = async (file?: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const compressed = await compressProductImage(file);
      onChange({
        imageUrl: compressed.dataUrl,
        imageBase64: compressed.dataUrl,
        imageFilename: compressed.filename,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cargar la imagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <label className="ify-label">Imagen del producto</label>
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition ${
          dragOver ? "border-[var(--primary)] bg-[var(--nav-active-bg)]" : "border-[var(--border)] bg-[var(--background)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void applyFile(e.dataTransfer.files?.[0]);
        }}
      >
        {imageUrl ? (
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-xl bg-white shadow-sm sm:mx-0 sm:h-44 sm:w-44">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Producto" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-sm font-semibold text-[var(--foreground)]">Foto lista</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                Se guarda en el servidor y se verá en el listado de productos y en el punto de venta.
                JPG o PNG, se ajusta sola para que cargue rápido.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <button type="button" className="ify-btn-outline text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                  <i className="bi bi-image mr-1" /> Cambiar
                </button>
                <button type="button" className="ify-btn-outline text-xs lg:hidden" disabled={busy} onClick={() => cameraRef.current?.click()}>
                  <i className="bi bi-camera mr-1" /> Cámara
                </button>
                <button
                  type="button"
                  className="ify-btn-ghost text-xs text-red-500"
                  disabled={busy}
                  onClick={() => onChange({ imageUrl: "", imageBase64: "", imageFilename: "" })}
                >
                  <i className="bi bi-trash mr-1" /> Quitar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4 py-7 text-center sm:py-8">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--nav-active-bg)] text-[var(--primary)]">
              <i className="bi bi-cloud-arrow-up text-2xl" />
            </div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Agregar foto del producto</p>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">
              Arrastre la imagen aquí o use los botones. En el celular puede tomar foto con la cámara.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" className="ify-btn-primary text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
                <i className="bi bi-folder2-open mr-1" /> {busy ? "Procesando..." : "Elegir imagen"}
              </button>
              <button type="button" className="ify-btn-outline text-xs lg:hidden" disabled={busy} onClick={() => cameraRef.current?.click()}>
                <i className="bi bi-camera mr-1" /> Tomar foto
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted)]">JPG, PNG o WEBP · se comprime automáticamente</p>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
            Optimizando foto...
          </div>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          void applyFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void applyFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
