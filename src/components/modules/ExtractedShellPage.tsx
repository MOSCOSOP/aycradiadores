"use client";

import { useEffect, useState } from "react";
import { findNavLabel } from "@/lib/page-registry";
import { PageHeader } from "@/components/ui/Modal";

type ExtractedShellPageProps = {
  pathname: string;
};

export function ExtractedShellPage({ pathname }: ExtractedShellPageProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const title = findNavLabel(pathname) || pathname;

  useEffect(() => {
    fetch(`/api/ui-shell${pathname}`, { method: "HEAD" })
      .then((r) => setAvailable(r.ok))
      .catch(() => setAvailable(false));
  }, [pathname]);

  if (available === null) {
    return <div className="p-5 text-[var(--muted)]">Cargando diseño original...</div>;
  }

  if (!available) return null;

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      <div className="pos-panel border-b px-4 py-2 md:hidden">
        <PageHeader title={title} subtitle="Vista clonada del sistema original" />
      </div>
      <iframe
        title={title}
        src={`/api/ui-shell${pathname}`}
        className="min-h-0 flex-1 w-full border-0 bg-[#f8f9fa]"
      />
    </div>
  );
}
