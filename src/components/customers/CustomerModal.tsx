"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import {
  CustomerFormFields,
  emptyCustomerForm,
  type CustomerFormData,
} from "@/components/customers/CustomerFormFields";
import {
  buildCustomerPayload,
  customerRowToExtra,
  customerRowToForm,
  emptyCustomerExtra,
  type CustomerExtraData,
  type CustomerVehicle,
} from "@/lib/customer-fields";

type CustomerModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (customer: Record<string, unknown>) => void;
  editId?: number | null;
  initial?: Partial<CustomerFormData>;
};

const TABS = ["Datos de Cliente", "Otros Datos", "Vehículos", "Direcciones de envío", "Aval"] as const;

const emptyVehicle = (): CustomerVehicle => ({
  plate: "",
  brand: "",
  model: "",
  year: "",
  color: "",
});

export function CustomerModal({ open, onClose, onSaved, editId, initial }: CustomerModalProps) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<CustomerFormData>({ ...emptyCustomerForm, ...initial });
  const [extra, setExtra] = useState<CustomerExtraData>(emptyCustomerExtra);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab(0);
    if (editId) {
      setLoading(true);
      api.customers
        .get(editId)
        .then((res) => {
          const row = res.data;
          setForm(customerRowToForm(row));
          setExtra(customerRowToExtra(row));
        })
        .finally(() => setLoading(false));
    } else {
      setForm({ ...emptyCustomerForm, ...initial });
      setExtra(emptyCustomerExtra);
    }
  }, [open, editId, initial]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.number.trim()) {
      alert("Nombre y número son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const payload = buildCustomerPayload(form, extra);
      const res = editId
        ? await api.customers.update(editId, payload)
        : await api.customers.create(payload);
      const data = (res as { data?: Record<string, unknown> }).data ?? payload;
      onSaved(data);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar cliente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editId ? "Editar cliente" : "Nuevo cliente"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>Cerrar</button>
          <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving || loading}>
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

      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Cargando cliente...</p>
      ) : (
        <>
          {tab === 0 && <CustomerFormFields form={form} setForm={setForm} />}

          {tab === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ify-label">Nombre comercial<input className="ify-input mt-1" value={extra.trade_name} onChange={(e) => setExtra({ ...extra, trade_name: e.target.value })} /></label>
              <label className="ify-label">País<input className="ify-input mt-1" value={extra.country} onChange={(e) => setExtra({ ...extra, country: e.target.value })} /></label>
              <label className="ify-label">Ubigeo<input className="ify-input mt-1" value={extra.ubigeo} onChange={(e) => setExtra({ ...extra, ubigeo: e.target.value })} placeholder="Ej: 150101" /></label>
              <label className="ify-label">Días de crédito<input type="number" className="ify-input mt-1" value={extra.credit_days} onChange={(e) => setExtra({ ...extra, credit_days: e.target.value })} /></label>
              <label className="ify-label">Código interno<input className="ify-input mt-1" value={extra.internal_code} onChange={(e) => setExtra({ ...extra, internal_code: e.target.value })} /></label>
              <label className="ify-label">Código de barra<input className="ify-input mt-1" value={extra.barcode} onChange={(e) => setExtra({ ...extra, barcode: e.target.value })} /></label>
              <label className="ify-label">Nacionalidad<input className="ify-input mt-1" value={extra.nationality} onChange={(e) => setExtra({ ...extra, nationality: e.target.value })} /></label>
              <label className="ify-label">Zona<input className="ify-input mt-1" value={extra.zone} onChange={(e) => setExtra({ ...extra, zone: e.target.value })} placeholder="Seleccionar" /></label>
              <label className="ify-label sm:col-span-2">Ubicación Google Maps<input className="ify-input mt-1" value={extra.google_maps} onChange={(e) => setExtra({ ...extra, google_maps: e.target.value })} /></label>
              <label className="ify-label sm:col-span-2">Observaciones<textarea className="ify-input mt-1 min-h-[60px]" value={extra.observations} onChange={(e) => setExtra({ ...extra, observations: e.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={extra.apply_retention} onChange={(e) => setExtra({ ...extra, apply_retention: e.target.checked })} />
                ¿Aplica retención?
              </label>
              <div className="sm:col-span-2 border-t pt-3">
                <p className="ify-label mb-2">Contacto</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input className="ify-input" placeholder="Nombre y Apellido" value={extra.contact_name} onChange={(e) => setExtra({ ...extra, contact_name: e.target.value })} />
                  <input className="ify-input" placeholder="Teléfono" value={extra.contact_phone} onChange={(e) => setExtra({ ...extra, contact_phone: e.target.value })} />
                  <input className="ify-input" placeholder="Documento" value={extra.contact_document} onChange={(e) => setExtra({ ...extra, contact_document: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={extra.has_vehicle}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setExtra({
                      ...extra,
                      has_vehicle: checked,
                      vehicles: checked && extra.vehicles.length === 0 ? [emptyVehicle()] : extra.vehicles,
                    });
                  }}
                />
                ¿El cliente tiene vehículo(s)?
              </label>
              {extra.has_vehicle && (
                <>
                  {extra.vehicles.map((v, idx) => (
                    <div key={idx} className="rounded border border-[var(--border-light)] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--primary)]">Vehículo #{idx + 1}</span>
                        {extra.vehicles.length > 1 && (
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() =>
                              setExtra({
                                ...extra,
                                vehicles: extra.vehicles.filter((_, i) => i !== idx),
                              })
                            }
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="ify-label">Placa<input className="ify-input mt-1 uppercase" value={v.plate} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, plate: e.target.value.toUpperCase() };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="ABC-123" /></label>
                        <label className="ify-label">Marca<input className="ify-input mt-1" value={v.brand} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, brand: e.target.value };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="Toyota" /></label>
                        <label className="ify-label">Modelo<input className="ify-input mt-1" value={v.model} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, model: e.target.value };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="Hilux" /></label>
                        <label className="ify-label">Año<input className="ify-input mt-1" value={v.year} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, year: e.target.value };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="2020" /></label>
                        <label className="ify-label sm:col-span-2">Color<input className="ify-input mt-1" value={v.color} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, color: e.target.value };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="Blanco" /></label>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="ify-btn-outline text-xs"
                    onClick={() => setExtra({ ...extra, vehicles: [...extra.vehicles, emptyVehicle()] })}
                  >
                    <i className="bi bi-plus-lg" /> Agregar otro vehículo
                  </button>
                </>
              )}
            </div>
          )}

          {tab === 3 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ify-label sm:col-span-2">Dirección secundaria<input className="ify-input mt-1" value={extra.secondary_address} onChange={(e) => setExtra({ ...extra, secondary_address: e.target.value })} /></label>
              <label className="ify-label">Teléfono<input className="ify-input mt-1" value={extra.secondary_phone} onChange={(e) => setExtra({ ...extra, secondary_phone: e.target.value })} /></label>
              <label className="ify-label">Referencia<input className="ify-input mt-1" placeholder="Referencia de entrega" value={extra.delivery_reference} onChange={(e) => setExtra({ ...extra, delivery_reference: e.target.value })} /></label>
            </div>
          )}

          {tab === 4 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="ify-label">Nombre del aval<input className="ify-input mt-1" value={extra.guarantor_name} onChange={(e) => setExtra({ ...extra, guarantor_name: e.target.value })} /></label>
              <label className="ify-label">Documento del aval<input className="ify-input mt-1" value={extra.guarantor_document} onChange={(e) => setExtra({ ...extra, guarantor_document: e.target.value })} /></label>
              <label className="ify-label">Teléfono del aval<input className="ify-input mt-1" value={extra.guarantor_phone} onChange={(e) => setExtra({ ...extra, guarantor_phone: e.target.value })} /></label>
              <label className="ify-label sm:col-span-2">Dirección del aval<textarea className="ify-input mt-1 min-h-[60px]" value={extra.guarantor_address} onChange={(e) => setExtra({ ...extra, guarantor_address: e.target.value })} /></label>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
