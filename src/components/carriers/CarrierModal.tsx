"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

export type CarrierFormData = {
  identity_document_type_id: string;
  document_number: string;
  name: string;
  address: string;
  mtc: string;
  is_default: boolean;
};

const DOC_TYPES = [
  { id: "6", label: "RUC" },
  { id: "1", label: "DNI" },
  { id: "4", label: "C.E." },
  { id: "7", label: "Pasaporte" },
];

export const emptyCarrierForm = (): CarrierFormData => ({
  identity_document_type_id: "6",
  document_number: "",
  name: "",
  address: "",
  mtc: "",
  is_default: false,
});

type CarrierModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (carrier: Record<string, unknown>) => void;
  editId?: number | null;
};

export function CarrierModal({ open, onClose, onSaved, editId }: CarrierModalProps) {
  const [form, setForm] = useState<CarrierFormData>(emptyCarrierForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editId) {
      setLoading(true);
      api.generic
        .records("transports/records")
        .then((res) => {
          const row = (res.data ?? []).find((r) => Number(r.id) === editId);
          if (!row) return;
          setForm({
            identity_document_type_id: String(row.identity_document_type_id ?? "6"),
            document_number: String(row.document_number ?? ""),
            name: String(row.name ?? ""),
            address: String(row.address ?? ""),
            mtc: String(row.mtc ?? ""),
            is_default: Boolean(row.is_default),
          });
        })
        .finally(() => setLoading(false));
    } else {
      setForm(emptyCarrierForm());
    }
  }, [open, editId]);

  const lookupSunat = async () => {
    if (form.identity_document_type_id !== "6" || form.document_number.length !== 11) {
      alert("Ingrese un RUC válido de 11 dígitos");
      return;
    }
    try {
      const res = await api.customers.search(form.document_number, 5);
      const hit = (res.data ?? []).find((r) => String(r.number) === form.document_number);
      if (hit) {
        setForm((f) => ({
          ...f,
          name: String(hit.name ?? f.name),
          address: String(hit.address ?? f.address),
        }));
      } else {
        alert("No se encontró el RUC en SUNAT/local. Complete los datos manualmente.");
      }
    } catch {
      alert("No se pudo consultar SUNAT. Complete los datos manualmente.");
    }
  };

  const save = async () => {
    if (!form.name.trim() || !form.document_number.trim()) {
      alert("Nombre y número son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.name.trim(),
        document_number: form.document_number.trim(),
        identity_document_type_id: form.identity_document_type_id,
        address: form.address.trim(),
        mtc: form.mtc.trim(),
        is_default: form.is_default,
        state: "Activo",
      };
      const res = editId
        ? await api.generic.update("transports", editId, payload)
        : await api.generic.create("transports", payload);
      onSaved((res as { data?: Record<string, unknown> }).data ?? payload);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar transportista");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editId ? "Editar transportista" : "Nuevo Transportista"}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="ify-btn-primary" onClick={save} disabled={saving || loading}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo Doc. Identidad *">
            <select
              className="ify-select"
              value={form.identity_document_type_id}
              onChange={(e) => setForm({ ...form, identity_document_type_id: e.target.value })}
            >
              {DOC_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Número *">
            <div className="flex gap-2">
              <input
                className="ify-input flex-1"
                value={form.document_number}
                maxLength={form.identity_document_type_id === "6" ? 11 : 20}
                onChange={(e) => setForm({ ...form, document_number: e.target.value.replace(/\D/g, "") })}
                placeholder={form.identity_document_type_id === "6" ? "11 dígitos" : "N° documento"}
              />
              {form.identity_document_type_id === "6" && (
                <button type="button" className="ify-btn-outline whitespace-nowrap px-3 text-xs" onClick={lookupSunat}>
                  <i className="bi bi-search" /> SUNAT
                </button>
              )}
            </div>
          </Field>
          <Field label="Nombre *" className="sm:col-span-2">
            <input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Dirección fiscal" className="sm:col-span-2">
            <input className="ify-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="MTC">
            <input className="ify-input" value={form.mtc} onChange={(e) => setForm({ ...form, mtc: e.target.value })} placeholder="N° registro MTC" />
          </Field>
          <Field label="Predeterminado">
            <label className="flex cursor-pointer items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              />
              <span className="text-sm">Usar como transportista predeterminado</span>
            </label>
          </Field>
        </div>
      )}
    </Modal>
  );
}
