"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/DataTable";
import { Modal, PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type SettingDetailPageProps = {
  title: string;
  settingKey: string;
  columns?: { key: string; label: string }[];
};

export function SettingDetailPage({ title, settingKey, columns }: SettingDetailPageProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ name: "", description: "" });

  const load = () => {
    setLoading(true);
    api.generic
      .records(`settings/${settingKey}/records`)
      .then((r) => setRows(r.data ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [settingKey]);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return Object.values(r).some((v) => String(v).toLowerCase().includes(q));
  });

  const cols =
    columns ??
    (rows[0]
      ? Object.keys(rows[0])
          .filter((k) => k !== "id")
          .slice(0, 4)
          .map((k) => ({ key: k, label: k }))
      : [
          { key: "name", label: "Nombre" },
          { key: "description", label: "Descripción" },
        ]);

  const save = async () => {
    await api.generic.create(`settings/${settingKey}/records`, form);
    setModalOpen(false);
    setForm({ name: "", description: "" });
    load();
  };

  return (
    <div className="p-4 md:p-5">
      <PageHeader
        title={title}
        actions={
          <>
            <Link href="/list-settings" className="ify-btn-outline text-xs">
              ← Configuración
            </Link>
            <button type="button" className="ify-btn-primary text-xs" onClick={() => setModalOpen(true)}>
              <i className="bi bi-plus-lg" /> Nuevo
            </button>
          </>
        }
      />
      <div className="ify-card mb-3 p-3">
        <input
          className="ify-input"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <DataTable loading={loading} rows={filtered} columns={cols} emptyMessage="Sin registros — agrega uno nuevo" />
      <Modal
        open={modalOpen}
        title={`Nuevo — ${title}`}
        onClose={() => setModalOpen(false)}
        footer={
          <button type="button" className="ify-btn-primary" onClick={save}>
            Guardar
          </button>
        }
      >
        <div className="grid gap-3">
          <Field label="Nombre">
            <input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Descripción">
            <input className="ify-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
