"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { findNavLabel, findNavParent } from "@/lib/page-registry";
import { useTheme } from "@/components/layout/ThemeProvider";

/** Barra superior liviana: botón de menú en móvil + breadcrumb, para que el usuario siempre
 * sepa dónde está dentro del sistema. No reemplaza el encabezado propio de cada página
 * (PageHeader) — solo da contexto de ubicación. */
export function Topbar() {
  const pathname = usePathname();
  const { setMobileOpen } = useTheme();
  const parent = findNavParent(pathname);
  const label = findNavLabel(pathname);

  return (
    <header className="ify-topbar">
      <button type="button" className="ify-topbar-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
        <i className="bi bi-list" />
      </button>
      <nav className="ify-breadcrumb" aria-label="Ubicación actual">
        <Link href="/dashboard">Inicio</Link>
        {parent && (
          <>
            <span className="ify-breadcrumb-sep">/</span>
            <span>{parent}</span>
          </>
        )}
        {label && (
          <>
            <span className="ify-breadcrumb-sep">/</span>
            <span className="ify-breadcrumb-current">{label}</span>
          </>
        )}
      </nav>
    </header>
  );
}
