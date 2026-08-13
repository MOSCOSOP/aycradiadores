"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { lookupDocument } from "@/lib/document-lookup";
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
  const [form, setForm] = useState<CarrierFormData>(emptyCarrierForm());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  const isDni = form.identity_document_type_id === "1";
  const isRuc = form.identity_document_type_id === "6";
  const canLookup = isDni || isRuc;

  useEffect(() => {
    if (!open) return;
    setLookupMsg("");
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

  const handleLookup = async () => {
    const num = form.document_number.replace(/\D/g, "");
    if (!num) {
      setLookupMsg("Ingrese el número de documento");
      return;
    }
    setLooking(true);
    setLookupMsg("");
    try {
      const data = await lookupDocument(form.identity_document_type_id, num);
      setForm((f) => ({
        ...f,
        document_number: data.number,
        name: data.name || f.name,
        address: data.address || f.address,
      }));
      setLookupMsg(isDni ? "Datos del DNI cargados" : "Datos del RUC cargados desde SUNAT");
    } catch (e) {
      setLookupMsg(e instanceof Error ? e.message : "No se pudo consultar");
    } finally {
      setLooking(false);
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
      const saved = (res as { data?: Record<string, unknown> }).data ?? { ...payload, id: Date.now() };
      onSaved(saved);
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
              onChange={(e) =>
                setForm({ ...form, identity_document_type_id: e.target.value, document_number: "", name: "" })
              }
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
                maxLength={isDni ? 8 : isRuc ? 11 : 20}
                onChange={(e) => setForm({ ...form, document_number: e.target.value.replace(/\D/g, "") })}
                placeholder={isDni ? "8 dígitos" : isRuc ? "11 dígitos" : "N° documento"}
              />
              {canLookup && (
                <button
                  type="button"
                  className="ify-btn-outline whitespace-nowrap px-3 text-xs"
                  onClick={handleLookup}
                  disabled={looking}
                >
                  {looking ? "..." : isRuc ? "SUNAT" : "Buscar"}
                </button>
              )}
            </div>
            {lookupMsg ? <p className="mt-1 text-xs text-[var(--muted)]">{lookupMsg}</p> : null}
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
              <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
              <span className="text-sm">Usar como transportista predeterminado</span>
            </label>
          </Field>
        </div>
      )}
    </Modal>
  );
}
