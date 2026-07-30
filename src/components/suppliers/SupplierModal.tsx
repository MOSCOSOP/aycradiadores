"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import {
  SupplierFormFields,
  emptySupplierForm,
  type SupplierFormData,
} from "@/components/suppliers/SupplierFormFields";

type SupplierModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editId?: number | null;
  initial?: Partial<SupplierFormData>;
};

const TABS = ["Datos de Proveedor", "Otros Datos", "Direcciones", "Contacto"] as const;

export function SupplierModal({ open, onClose, onSaved, editId = null, initial }: SupplierModalProps) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<SupplierFormData>({ ...emptySupplierForm, ...initial });
  const [saving, setSaving] = useState(false);
  const [secondaryAddress, setSecondaryAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const handleSave = async () => {
    if (!form.name.trim() || !form.number.trim()) {
      alert("Nombre y número son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        observations: [form.observations, secondaryAddress ? `Dir. sec: ${secondaryAddress}` : "", contactName ? `Contacto: ${contactName} ${contactPhone}` : ""]
          .filter(Boolean)
          .join(" | "),
      };
      if (editId) await api.suppliers.update(editId, payload);
      else await api.suppliers.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editId ? "Editar proveedor" : "Nuevo proveedor"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>Cerrar</button>
          <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border-light)]">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`px-3 py-2 text-xs font-semibold ${tab === i ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && <SupplierFormFields form={form} setForm={setForm} />}

      {tab === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ify-label">Días de crédito<input type="number" className="ify-input mt-1" defaultValue="0" /></label>
          <label className="ify-label">Nacionalidad<input className="ify-input mt-1" defaultValue="PERÚ" /></label>
          <label className="ify-label sm:col-span-2">Sitio Web<input className="ify-input mt-1" placeholder="https://" /></label>
        </div>
      )}

      {tab === 2 && (
        <div className="grid gap-3">
          <label className="ify-label">Dirección secundaria<input className="ify-input mt-1" value={secondaryAddress} onChange={(e) => setSecondaryAddress(e.target.value)} /></label>
          <label className="ify-label">Referencia<input className="ify-input mt-1" placeholder="Referencia de entrega" /></label>
        </div>
      )}

      {tab === 3 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="ify-label">Nombre y Apellido<input className="ify-input mt-1" value={contactName} onChange={(e) => setContactName(e.target.value)} /></label>
          <label className="ify-label">Teléfono<input className="ify-input mt-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></label>
        </div>
      )}
    </Modal>
  );
}
