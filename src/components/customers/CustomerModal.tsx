"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { SelectWithAdd } from "@/components/ui/SelectWithAdd";
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
import { findDuplicateInList, type CustomerRecord } from "@/lib/customer-duplicate";

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
  const [duplicateWarning, setDuplicateWarning] = useState<CustomerRecord | null>(null);
  const [zones, setZones] = useState<{ id: number; name: string }[]>([]);
  const [vehicleLookup, setVehicleLookup] = useState<Record<number, { loading: boolean; message: string }>>({});

  const lookupVehicle = async (idx: number, plate: string) => {
    const clean = plate.trim().replace(/[^A-Za-z0-9]/g, "");
    if (!clean) {
      setVehicleLookup((prev) => ({ ...prev, [idx]: { loading: false, message: "Escribe la placa primero" } }));
      return;
    }
    setVehicleLookup((prev) => ({ ...prev, [idx]: { loading: true, message: "" } }));
    try {
      const res = await fetch(`/api/lookup/vehicle/${clean}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo consultar");
      if (!data.exists) {
        setVehicleLookup((prev) => ({
          ...prev,
          [idx]: { loading: false, message: "No se encontró esa placa — completa los datos a mano" },
        }));
        return;
      }
      setExtra((prevExtra) => {
        const vehicles = [...prevExtra.vehicles];
        vehicles[idx] = {
          ...vehicles[idx],
          brand: data.brand || vehicles[idx].brand,
          model: data.model || vehicles[idx].model,
          color: data.color || vehicles[idx].color,
          image_url: data.image_url || vehicles[idx].image_url,
        };
        return { ...prevExtra, vehicles };
      });
      setVehicleLookup((prev) => ({ ...prev, [idx]: { loading: false, message: "Datos encontrados" } }));
    } catch (e) {
      setVehicleLookup((prev) => ({
        ...prev,
        [idx]: { loading: false, message: e instanceof Error ? e.message : "No se pudo consultar la placa" },
      }));
    }
  };

  useEffect(() => {
    if (!open) return;
    setTab(0);
    setDuplicateWarning(null);
    api.zones.records().then((r) => setZones((r.data ?? []) as { id: number; name: string }[]));
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

  useEffect(() => {
    setDuplicateWarning(null);
  }, [form.number]);

  const saveCustomer = async (forceDuplicate = false) => {
    if (!form.name.trim() || !form.number.trim()) {
      alert("Nombre y número son obligatorios");
      return;
    }

    if (!forceDuplicate) {
      try {
        const searchRes = await api.customers.search(form.number.trim(), 40);
        const dup = findDuplicateInList(form.number, searchRes.data ?? [], editId ?? undefined);
        if (dup) {
          setDuplicateWarning(dup);
          return;
        }
      } catch {
        /* continuar — el servidor validará */
      }
    }

    setSaving(true);
    try {
      const payload = {
        ...buildCustomerPayload(form, extra),
        ...(forceDuplicate ? { force_duplicate: true } : {}),
      };
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
      setDuplicateWarning(null);
    }
  };

  const useExistingCustomer = async () => {
    if (!duplicateWarning) return;
    try {
      const full = await api.customers.get(duplicateWarning.id);
      onSaved(full.data ?? duplicateWarning);
      onClose();
    } catch {
      onSaved(duplicateWarning);
      onClose();
    }
  };

  const handleSave = () => saveCustomer(false);

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
          {duplicateWarning ? (
            <div className="doc-duplicate-alert mb-4">
              <p className="doc-duplicate-title">
                <i className="bi bi-exclamation-triangle-fill" /> Cliente ya en la lista
              </p>
              <p className="doc-duplicate-text">
                Ya existe un cliente con el documento <strong>{duplicateWarning.number}</strong>:
              </p>
              <p className="doc-duplicate-name">{duplicateWarning.name}</p>
              <div className="doc-duplicate-actions">
                <button type="button" className="ify-btn-primary text-xs" onClick={useExistingCustomer}>
                  Usar cliente existente
                </button>
                <button type="button" className="ify-btn-outline text-xs" onClick={() => saveCustomer(true)}>
                  Crear de todas formas
                </button>
                <button type="button" className="ify-btn-ghost text-xs" onClick={() => setDuplicateWarning(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

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
              <label className="ify-label">
                Zona
                <div className="mt-1">
                  <SelectWithAdd
                    value={String(zones.find((z) => z.name === extra.zone)?.id ?? "")}
                    options={zones}
                    placeholder="Zona"
                    onChange={(_id, name) => setExtra({ ...extra, zone: name })}
                    onCreate={async (name) => {
                      try {
                        const res = (await api.zones.create({ name })) as { data?: { id: number; name: string } };
                        if (res.data) {
                          setZones((prev) => [...prev, res.data as { id: number; name: string }]);
                          return res.data;
                        }
                        return null;
                      } catch (e) {
                        alert(e instanceof Error ? e.message : "No se pudo crear la zona");
                        return null;
                      }
                    }}
                  />
                </div>
              </label>
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
                        <label className="ify-label sm:col-span-2">
                          Placa
                          <div className="mt-1 flex gap-2">
                            <input
                              className="ify-input flex-1 uppercase"
                              value={v.plate}
                              onChange={(e) => {
                                const vehicles = [...extra.vehicles];
                                vehicles[idx] = { ...v, plate: e.target.value.toUpperCase() };
                                setExtra({ ...extra, vehicles });
                              }}
                              placeholder="ABC-123"
                            />
                            <button
                              type="button"
                              className="ify-btn-outline whitespace-nowrap px-3 text-xs"
                              onClick={() => lookupVehicle(idx, v.plate)}
                              disabled={vehicleLookup[idx]?.loading}
                            >
                              {vehicleLookup[idx]?.loading ? "Buscando..." : "Buscar"}
                            </button>
                          </div>
                          {vehicleLookup[idx]?.message ? (
                            <span className="mt-1 block text-xs font-normal normal-case text-[var(--muted)]">
                              {vehicleLookup[idx].message}
                            </span>
                          ) : null}
                        </label>
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
                        <label className="ify-label">Color<input className="ify-input mt-1" value={v.color} onChange={(e) => {
                          const vehicles = [...extra.vehicles];
                          vehicles[idx] = { ...v, color: e.target.value };
                          setExtra({ ...extra, vehicles });
                        }} placeholder="Blanco" /></label>
                      </div>
                      {v.image_url ? (
                        <div className="mt-3 flex items-center gap-3 rounded border border-[var(--border-light)] bg-[var(--background)] p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.image_url} alt={`${v.brand} ${v.model}`.trim()} className="h-16 w-16 object-contain" />
                          <span className="text-xs text-[var(--muted)]">Imagen referencial — no es la foto real del vehículo del cliente.</span>
                        </div>
                      ) : null}
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
