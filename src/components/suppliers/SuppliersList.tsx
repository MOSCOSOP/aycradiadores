"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { RowActions } from "@/components/ui/RowActions";
import { SupplierModal } from "@/components/suppliers/SupplierModal";
import { emptySupplierForm } from "@/components/suppliers/SupplierFormFields";
import { api } from "@/lib/api/client";

export function SuppliersList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [initial, setInitial] = useState<Partial<typeof emptySupplierForm>>();

  const load = (value = "") => {
    setLoading(true);
    api.suppliers
      .records()
      .then((r) => {
        let data = r.data ?? [];
        if (value) {
          const q = value.toLowerCase();
          data = data.filter(
            (s) =>
              String(s.name ?? "").toLowerCase().includes(q) ||
              String(s.number ?? "").toLowerCase().includes(q)
          );
        }
        setRows(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditId(null);
    setInitial(undefined);
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setInitial({
      identity_document_type_id: String(r.identity_document_type_id || "6"),
      number: String(r.number || ""),
      name: String(r.name || ""),
      trade_name: String(r.trade_name || ""),
      address: String(r.address || ""),
      telephone: String(r.telephone || ""),
      email: String(r.email || ""),
      country: String(r.country || "PERÚ"),
      ubigeo: String(r.ubigeo || ""),
      observations: String(r.observations || ""),
      internal_code: String(r.internal_code || ""),
      barcode: String(r.barcode || ""),
    });
    setModalOpen(true);
  };

  const remove = async (id: number) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    const res = (await api.suppliers.delete(id)) as { soft_deleted?: boolean; message?: string };
    if (res.soft_deleted) alert(res.message);
    load(search);
  };

  const reactivate = async (id: number) => {
    await api.suppliers.update(id, { active: true });
    load(search);
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Proveedores"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nuevo proveedor
          </button>
        }
      />
      <div className="ify-card mb-3 p-3">
        <div className="flex gap-2">
          <input
            className="ify-input flex-1"
            placeholder="Buscar por nombre o RUC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
          />
          <button type="button" className="ify-btn-primary" onClick={() => load(search)}>
            <i className="bi bi-search" /> Buscar
          </button>
        </div>
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "idx", label: "#", render: (_r, i) => i + 1 },
          { key: "number", label: "RUC/DNI" },
          {
            key: "name",
            label: "Nombre / Razón social",
            render: (r) => (
              <span className="flex items-center gap-2">
                {String(r.name ?? "")}
                {r.active === false && (
                  <span className="rounded bg-[var(--muted-light)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
                    Inactivo
                  </span>
                )}
              </span>
            ),
          },
          { key: "telephone", label: "Teléfono" },
          { key: "email", label: "Email" },
          {
            key: "id",
            label: "Acciones",
            render: (r) => (
              <div className="flex items-center gap-1">
                {r.active === false && (
                  <button type="button" className="ify-btn-outline px-2 py-1 text-[10px] text-green-700" onClick={() => reactivate(Number(r.id))}>
                    Reactivar
                  </button>
                )}
                <RowActions onEdit={() => openEdit(r)} onDelete={() => remove(Number(r.id))} />
              </div>
            ),
          },
        ]}
      />
      <SupplierModal
        open={modalOpen}
        editId={editId}
        initial={initial}
        onClose={() => setModalOpen(false)}
        onSaved={() => load(search)}
      />
    </div>
  );
}
