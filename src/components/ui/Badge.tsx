"use client";

type BadgeTone = "success" | "warning" | "error" | "info" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "ify-badge-success",
  warning: "ify-badge-warning",
  error: "ify-badge-error",
  info: "ify-badge-info",
  neutral: "ify-badge-neutral",
};

/** Insignia de estado consistente (colores semánticos: verde=éxito, ámbar=advertencia,
 * rojo=error/crítico, azul=informativo, gris=neutral) — reemplaza los <span> de color
 * armados a mano que había repetidos en cada tabla. */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`ify-badge ${TONE_CLASS[tone]}`}>{children}</span>;
}
