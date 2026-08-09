"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/Modal";

export function BackupPage() {
  const [msg, setMsg] = useState("");

  const exportBackup = async () => {
    try {
      const res = await fetch("/api/local/backup/export");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Copia de seguridad descargada correctamente.");
    } catch {
      setMsg("Error al generar la copia de seguridad.");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Copia de seguridad"
        actions={
          <Link href="/list-settings" className="ify-btn-outline text-xs">
            ← Configuración
          </Link>
        }
      />
      <div className="ify-card max-w-lg p-5">
        <p className="mb-4 text-sm text-[var(--muted)]">
          Exporta los datos principales del sistema: productos, clientes, comprobantes, compras e inventario.
        </p>
        <button type="button" className="ify-btn-primary" onClick={exportBackup}>
          <i className="bi bi-cloud-download" /> Descargar backup JSON
        </button>
        {msg && <p className="mt-3 text-sm text-green-700">{msg}</p>}
      </div>
    </div>
  );
}
