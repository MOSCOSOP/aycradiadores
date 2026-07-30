"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ExtractedShellPage } from "./ExtractedShellPage";
import { UniversalListPage } from "./UniversalListPage";

type ClonedModulePageProps = {
  pathname: string;
  /** Si no hay HTML clonado, muestra este contenido (listados React, reportes, etc.) */
  fallback?: ReactNode;
};

export function ClonedModulePage({ pathname, fallback }: ClonedModulePageProps) {
  const [mode, setMode] = useState<"loading" | "shell" | "fallback">("loading");

  useEffect(() => {
    fetch(`/api/ui-shell${pathname}`, { method: "HEAD" })
      .then((r) => setMode(r.ok ? "shell" : "fallback"))
      .catch(() => setMode("fallback"));
  }, [pathname]);

  if (mode === "loading") {
    return (
      <div className="flex items-center justify-center p-12 text-[var(--muted)]">
        <i className="bi bi-arrow-repeat animate-spin mr-2" />
        Cargando...
      </div>
    );
  }

  if (mode === "shell") return <ExtractedShellPage pathname={pathname} />;

  if (fallback) return <>{fallback}</>;

  return <UniversalListPage pathname={pathname} />;
}
