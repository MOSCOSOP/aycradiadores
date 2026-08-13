"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CarrierModal } from "@/components/carriers/CarrierModal";
import { DispatchesList } from "@/components/modules/AdvancedModules";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

export function TransportsList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.generic.records("transports/records");
      setRows(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const remove = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar transportista ${name}?`)) return;
    try {
      await api.generic.delete("transports", id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Listado de Transportistas"
        actions={
          <button type="button" className="ify-btn-primary" onClick={() => { setEditId(null); setModalOpen(true); }}>
            <i className="bi bi-plus-lg" /> Nuevo Transportista
          </button>
        }
      />
      <div className="ify-card mb-3 p-3">
        <input className="ify-input" placeholder="Buscar transportista..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <DataTable
        loading={loading}
        rows={filtered}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          { key: "document_number", label: "Documento", render: (r) => String(r.document_number ?? "—") },
          { key: "name", label: "Nombre", render: (r) => String(r.name ?? r.description ?? "—") },
          { key: "address", label: "Dirección fiscal", render: (r) => String(r.address ?? "—") },
          { key: "mtc", label: "MTC", render: (r) => String(r.mtc ?? "—") },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <RowActions
                onEdit={() => {
                  setEditId(Number(r.id));
                  setModalOpen(true);
                }}
                onDelete={() => remove(Number(r.id), String(r.name ?? r.description ?? ""))}
              />
            ),
          },
        ]}
        emptyMessage="Sin transportistas — registra el primero"
      />
      <CarrierModal
        open={modalOpen}
        editId={editId}
        onClose={() => setModalOpen(false)}
        onSaved={() => load()}
      />
    </div>
  );
}

export function DispatchesCarrierList() {
  return <DispatchesList guideType="31" />;
}
