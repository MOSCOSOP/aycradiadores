"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/Modal";
import { RowActions } from "@/components/ui/RowActions";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { api } from "@/lib/api/client";

const DOC_LABELS: Record<string, string> = {
  "6": "RUC",
  "1": "DNI",
  "4": "C.E.",
  "7": "Pasaporte",
  "0": "Otros",
};

const PAGE_SIZE = 20;

export function CustomersList() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const load = async (value = "", p = 1) => {
    setLoading(true);
    try {
      const res = value
        ? await api.customers.search(value, 50)
        : await api.customers.records({ page: p, limit: PAGE_SIZE });
      setRows(res.data ?? []);
      const meta = res.meta as { total?: number } | undefined;
      setTotal(meta?.total ?? res.data?.length ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar cliente?")) return;
    try {
      await api.customers.delete(id);
      load(search, page);
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se puede eliminar");
    }
  };

  const exportCsv = () => {
    const headers = ["Tipo", "Número", "Nombre", "Teléfono", "Email", "Dirección"];
    const lines = rows.map((r) => [
      DOC_LABELS[String(r.identity_document_type_id || "6")] || "",
      String(r.number ?? ""),
      String(r.name ?? ""),
      String(r.telephone ?? ""),
      String(r.email ?? ""),
      String(r.address ?? ""),
    ]);
    const csv = [headers, ...lines].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean).slice(1);
      let imported = 0;
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"'));
        if (cols.length < 3) continue;
        try {
          await api.customers.create({
            identity_document_type_id: cols[0] === "DNI" ? "1" : "6",
            number: cols[1],
            name: cols[2],
            telephone: cols[3] || "",
            email: cols[4] || "",
            address: cols[5] || "",
          });
          imported++;
        } catch {
          /* skip duplicate or invalid */
        }
      }
      alert(`Importados ${imported} clientes`);
      load(search, page);
    };
    reader.readAsText(file);
  };

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-4 md:p-5">
      <div className="ify-card mb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h1 className="text-base font-bold">Listado de clientes</h1>
            <p className="text-xs text-[var(--muted)]">{total} registros</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="ify-btn-outline cursor-pointer text-sm">
              <i className="bi bi-upload" /> Importar
              <input type="file" accept=".csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
            </label>
            <button type="button" className="ify-btn-outline text-sm" onClick={exportCsv}>
              <i className="bi bi-download" /> Exportar
            </button>
            <button type="button" className="ify-btn-primary text-sm" onClick={openCreate}>
              <i className="bi bi-plus-lg" /> Nuevo
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-3">
          <input
            className="ify-input min-w-[200px] flex-1"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search, 1)}
          />
          <button type="button" className="ify-btn-outline" onClick={() => load(search, 1)}>
            <i className="bi bi-search" /> Buscar
          </button>
        </div>
      </div>

      <DataTable
        loading={loading}
        rows={rows}
        columns={[
          { key: "row", label: "#", render: (_r, i) => (page - 1) * PAGE_SIZE + i + 1 },
          {
            key: "identity_document_type_id",
            label: "Tipo",
            render: (r) => DOC_LABELS[String(r.identity_document_type_id || "6")] || "—",
          },
          { key: "number", label: "Número" },
          { key: "name", label: "Nombre / Razón social" },
          { key: "telephone", label: "Teléfono" },
          { key: "email", label: "Email" },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <RowActions onEdit={() => openEdit(r)} onDelete={() => handleDelete(Number(r.id))} />
            ),
          },
        ]}
      />

      {!search && total > PAGE_SIZE ? (
        <div className="mt-3 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>Página {page} de {lastPage}</span>
          <div className="flex gap-2">
            <button type="button" className="ify-btn-outline" disabled={page <= 1} onClick={() => load("", page - 1)}>Anterior</button>
            <button type="button" className="ify-btn-outline" disabled={page >= lastPage} onClick={() => load("", page + 1)}>Siguiente</button>
          </div>
        </div>
      ) : null}

      <CustomerModal
        open={modalOpen}
        editId={editId}
        onClose={() => setModalOpen(false)}
        onSaved={() => load(search, page)}
      />
    </div>
  );
}
