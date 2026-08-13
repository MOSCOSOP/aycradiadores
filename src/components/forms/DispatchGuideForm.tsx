"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field } from "@/components/ui/Modal";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { CarrierModal } from "@/components/carriers/CarrierModal";
import { CustomerSearchField } from "@/components/ui/CustomerSearchField";
import { CarrierSearchField, LocalCatalogSearchField, type SearchSelection } from "@/components/ui/EntitySearchField";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";
import {
  TRANSFER_REASONS,
  TRANSPORT_MODES,
  UNIT_MEASURES,
  dispatchFormToPayload,
  emptyDispatchForm,
  type DispatchFormState,
  type DispatchLineItem,
} from "@/lib/dispatch-fields";

type DispatchGuideFormProps = {
  guideType: "09" | "31";
};

function NewLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="ml-1 text-xs font-semibold text-[var(--primary)] hover:underline" onClick={onClick}>
      [+ Nuevo]
    </button>
  );
}

export function DispatchGuideForm({ guideType }: DispatchGuideFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const isCarrier = guideType === "31";
  const title = isCarrier ? "Nueva G.R. Transportista" : "Nueva G.R. Remitente";

  const [form, setForm] = useState<DispatchFormState>(() => emptyDispatchForm(today, COMPANY.address));
  const [items, setItems] = useState<DispatchLineItem[]>([]);
  const [establishments, setEstablishments] = useState<{ id: number; description: string }[]>([]);
  const [series, setSeries] = useState<{ id: number; number: string; document_type_id: string }[]>([]);
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [carriers, setCarriers] = useState<Record<string, unknown>[]>([]);
  const [drivers, setDrivers] = useState<Record<string, unknown>[]>([]);
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [originPoints, setOriginPoints] = useState<Record<string, unknown>[]>([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [customerModalFor, setCustomerModalFor] = useState<"destinatario" | "remitente">("destinatario");
  const [carrierModal, setCarrierModal] = useState(false);
  const [carrierModalFor, setCarrierModalFor] = useState<"freight" | "subcontractor">("freight");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [manual, setManual] = useState({ desc: "", qty: "1", unit: "NIU" });
  const [saving, setSaving] = useState(false);
  const [freightPayer, setFreightPayer] = useState<SearchSelection | null>(null);
  const [subcontractor, setSubcontractor] = useState<SearchSelection | null>(null);
  const [senderSel, setSenderSel] = useState<SearchSelection | null>(null);
  const [recipientSel, setRecipientSel] = useState<SearchSelection | null>(null);
  const [vehicleSel, setVehicleSel] = useState<SearchSelection | null>(null);
  const [driverSel, setDriverSel] = useState<SearchSelection | null>(null);
  const [secondaryVehicleSel, setSecondaryVehicleSel] = useState<SearchSelection | null>(null);
  const [secondaryDriverSel, setSecondaryDriverSel] = useState<SearchSelection | null>(null);

  const filteredSeries = useMemo(
    () => series.filter((s) => String(s.document_type_id) === guideType),
    [series, guideType]
  );

  useEffect(() => {
    Promise.all([
      api.documents.tables(),
      api.customers.records({ page: 1, limit: 200 }),
      api.generic.records("transports/records"),
      api.generic.records("drivers/records"),
      api.generic.records("vehicles/records"),
      api.generic.records("origin-addresses/records"),
    ]).then(([tables, custRes, carriersRes, driversRes, vehiclesRes, originsRes]) => {
      const est = (tables.all_establishments as { id: number; description: string }[]) ?? [];
      const ser = (tables.series as { id: number; number: string; document_type_id: string }[]) ?? [];
      setEstablishments(est);
      setSeries(ser);
      setCustomers(custRes.data ?? []);
      setCarriers(carriersRes.data ?? []);
      setDrivers(driversRes.data ?? []);
      setVehicles(vehiclesRes.data ?? []);
      setOriginPoints(originsRes.data ?? []);

      const matchSeries = ser.filter((s) => String(s.document_type_id) === guideType);
      setForm((f) => ({
        ...f,
        establishment_id: est[0]?.id ?? 0,
        series_id: matchSeries[0]?.id ?? 0,
        customer_id: custRes.data?.[0] ? Number(custRes.data[0].id) : 0,
      }));
    });
  }, [guideType]);

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => api.items.search(search, 8).then((r) => setResults(r.data ?? [])), 300);
    return () => clearTimeout(t);
  }, [search]);

  const setExtra = (patch: Partial<DispatchFormState["extra"]>) => {
    setForm((f) => ({ ...f, extra: { ...f.extra, ...patch } }));
  };

  const setField = <K extends keyof DispatchFormState>(key: K, value: DispatchFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const onCustomerSaved = (c: Record<string, unknown>) => {
    setCustomers((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
    const id = Number(c.id);
    const name = String(c.name ?? "");
    const doc = String(c.number ?? "");
    const sel: SearchSelection = { id: String(id), name, document_number: doc };
    if (customerModalFor === "destinatario") {
      setRecipientSel(sel);
      setField("customer_id", id);
      setExtra({ recipient_id: String(id), recipient_name: name, recipient_document: doc });
      setField("dest_address", String(c.address ?? form.dest_address));
    } else {
      setSenderSel(sel);
      setExtra({ sender_id: String(id), sender_name: name, sender_document: doc });
    }
  };

  const onCarrierSaved = (c: Record<string, unknown>) => {
    setCarriers((prev) => [c, ...prev.filter((x) => x.id !== c.id)]);
    const id = String(c.id ?? "");
    const name = String(c.name ?? c.description ?? "");
    const doc = String(c.document_number ?? "");
    const sel: SearchSelection = { id, name, document_number: doc };
    if (carrierModalFor === "freight") {
      setFreightPayer(sel);
      setExtra({ freight_payer_id: id, freight_payer_name: name });
    } else {
      setSubcontractor(sel);
      setExtra({ subcontractor_id: id, subcontractor_name: name });
    }
  };

  const save = async () => {
    if (!form.customer_id || items.length === 0) {
      alert("Complete destinatario/cliente e ítems");
      return;
    }
    if (!form.series_id) {
      alert("Seleccione una serie");
      return;
    }
    setSaving(true);
    try {
      const res = await api.dispatches.create(dispatchFormToPayload(form, items, guideType));
      const id = (res as { data?: { id?: number } }).data?.id;
      router.push(id ? `/dispatches/${id}` : isCarrier ? "/dispatches-carrier" : "/dispatches");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al emitir guía");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={title}
        actions={
          <button type="button" className="ify-btn-outline" onClick={() => router.back()}>
            ← Volver
          </button>
        }
      />

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Field label="Establecimiento *">
            <select
              className="ify-select"
              value={form.establishment_id}
              onChange={(e) => setField("establishment_id", Number(e.target.value))}
            >
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Serie *">
            <select className="ify-select" value={form.series_id} onChange={(e) => setField("series_id", Number(e.target.value))}>
              <option value={0}>Seleccionar</option>
              {filteredSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha de emisión *">
            <input type="date" className="ify-input" value={form.date_of_issue} onChange={(e) => setField("date_of_issue", e.target.value)} />
          </Field>
          <Field label="Fecha de traslado *">
            <input type="date" className="ify-input" value={form.date_of_transfer} onChange={(e) => setField("date_of_transfer", e.target.value)} />
          </Field>
          <Field label="Unidad de medida *">
            <select className="ify-select" value={form.unit_measure} onChange={(e) => setField("unit_measure", e.target.value)}>
              {UNIT_MEASURES.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peso total *">
            <input type="number" step="0.01" className="ify-input" value={form.total_weight} onChange={(e) => setField("total_weight", e.target.value)} />
          </Field>
          <Field label="Número de paquetes">
            <input type="number" className="ify-input" value={form.package_count} onChange={(e) => setField("package_count", e.target.value)} />
          </Field>
          <Field label="Orden de compra">
            <input className="ify-input" value={form.purchase_order} onChange={(e) => setField("purchase_order", e.target.value)} />
          </Field>
          <Field label="Observaciones" className="md:col-span-2 lg:col-span-3">
            <textarea className="ify-input min-h-[60px]" value={form.observations} onChange={(e) => setField("observations", e.target.value)} placeholder="Observaciones..." />
          </Field>
          <Field label="Guías de remisión relacionadas" className="md:col-span-2 lg:col-span-3">
            <input
              className="ify-input"
              value={form.related_guides}
              onChange={(e) => setField("related_guides", e.target.value)}
              placeholder="T001-0001, T001-0002"
            />
          </Field>
        </div>
      </div>

      {isCarrier && (
        <div className="ify-card mb-4 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field
              label={
                <>
                  Empresa pagador del flete
                  <NewLink
                    onClick={() => {
                      setCarrierModalFor("freight");
                      setCarrierModal(true);
                    }}
                  />
                </>
              }
            >
              <CarrierSearchField
                selected={freightPayer}
                carriers={carriers}
                onSelect={(item) => {
                  setFreightPayer(item);
                  setExtra({
                    freight_payer_id: item.id?.startsWith("cust-") ? item.id : item.id,
                    freight_payer_name: item.name,
                  });
                }}
              />
            </Field>
            <Field
              label={
                <>
                  Empresa subcontratada
                  <NewLink
                    onClick={() => {
                      setCarrierModalFor("subcontractor");
                      setCarrierModal(true);
                    }}
                  />
                </>
              }
            >
              <CarrierSearchField
                selected={subcontractor}
                carriers={carriers}
                onSelect={(item) => {
                  setSubcontractor(item);
                  setExtra({
                    subcontractor_id: item.id?.startsWith("cust-") ? item.id : item.id,
                    subcontractor_name: item.name,
                  });
                }}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label={
              <>
                Remitente *
                <NewLink
                  onClick={() => {
                    setCustomerModalFor("remitente");
                    setCustomerModal(true);
                  }}
                />
              </>
            }
          >
            <CustomerSearchField
              selected={
                senderSel
                  ? { id: senderSel.id, number: senderSel.document_number, name: senderSel.name }
                  : form.extra.sender_name
                    ? { number: form.extra.sender_document, name: form.extra.sender_name }
                    : { number: "", name: COMPANY.name }
              }
              onSelect={(c) => {
                const sel: SearchSelection = {
                  id: String(c.id ?? ""),
                  name: String(c.name ?? ""),
                  document_number: String(c.number ?? ""),
                };
                setSenderSel(sel);
                setExtra({
                  sender_id: String(c.id ?? ""),
                  sender_name: String(c.name ?? ""),
                  sender_document: String(c.number ?? ""),
                });
              }}
              onNew={() => {
                setCustomerModalFor("remitente");
                setCustomerModal(true);
              }}
              placeholder="Buscar remitente por DNI, RUC o nombre..."
            />
          </Field>
          <Field label="Punto de partida *">
            <select
              className="ify-select"
              value={form.extra.origin_point_id ?? ""}
              onChange={(e) => {
                const p = originPoints.find((x) => String(x.id) === e.target.value);
                const addr = p ? String(p.address ?? p.description ?? p.name ?? "") : form.origin_address;
                setExtra({
                  origin_point_id: e.target.value,
                  origin_point_label: p ? String(p.name ?? p.description ?? "") : "",
                });
                setField("origin_address", addr);
              }}
            >
              <option value="">Seleccionar punto de partida</option>
              {originPoints.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.name ?? p.description ?? p.address ?? "Dirección")}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label={
              <>
                Destinatario *
                <NewLink
                  onClick={() => {
                    setCustomerModalFor("destinatario");
                    setCustomerModal(true);
                  }}
                />
              </>
            }
          >
            <CustomerSearchField
              selected={
                recipientSel
                  ? { id: recipientSel.id, number: recipientSel.document_number, name: recipientSel.name }
                  : form.customer_id
                    ? customers.find((c) => Number(c.id) === form.customer_id) ?? null
                    : null
              }
              onSelect={(c) => {
                const sel: SearchSelection = {
                  id: String(c.id ?? ""),
                  name: String(c.name ?? ""),
                  document_number: String(c.number ?? ""),
                };
                setRecipientSel(sel);
                setField("customer_id", Number(c.id));
                setExtra({
                  recipient_id: String(c.id ?? ""),
                  recipient_name: String(c.name ?? ""),
                  recipient_document: String(c.number ?? ""),
                });
                setField("dest_address", String(c.address ?? ""));
              }}
              onNew={() => {
                setCustomerModalFor("destinatario");
                setCustomerModal(true);
              }}
              placeholder="Buscar destinatario por DNI, RUC o nombre..."
            />
          </Field>
          <Field label="Punto de llegada *">
            <input
              className="ify-input"
              value={form.dest_address}
              onChange={(e) => setField("dest_address", e.target.value)}
              placeholder="Dirección de llegada"
            />
          </Field>
        </div>
      </div>

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Datos del vehículo *">
            <LocalCatalogSearchField
              selected={vehicleSel}
              rows={vehicles}
              labelKeys={["plate", "brand", "model", "name"]}
              docKey="plate"
              placeholder="Buscar vehículo por placa..."
              onSelect={(item) => {
                setVehicleSel(item);
                setExtra({ vehicle_id: item.id, vehicle_label: item.document_number || item.name });
                if (item.document_number) setField("vehicle_plate", item.document_number.toUpperCase());
              }}
            />
          </Field>
          <Field label="Datos del conductor *">
            <LocalCatalogSearchField
              selected={driverSel}
              rows={drivers}
              labelKeys={["name", "description"]}
              docKey="document_number"
              placeholder="Buscar conductor por DNI o nombre..."
              onSelect={(item) => {
                setDriverSel(item);
                const d = drivers.find((x) => String(x.id) === item.id);
                setExtra({ driver_id: item.id, driver_label: item.name });
                setField("driver_name", item.name);
                setField("driver_document", String(d?.document_number ?? d?.license ?? item.document_number ?? ""));
              }}
            />
          </Field>
          <Field label="Datos del vehículo secundario">
            <LocalCatalogSearchField
              selected={secondaryVehicleSel}
              rows={vehicles}
              labelKeys={["plate", "brand", "model", "name"]}
              docKey="plate"
              placeholder="Buscar vehículo secundario..."
              onSelect={(item) => {
                setSecondaryVehicleSel(item);
                setExtra({ secondary_vehicle_id: item.id, secondary_vehicle_label: item.document_number || item.name });
              }}
            />
          </Field>
          <Field label="Datos del conductor secundario">
            <LocalCatalogSearchField
              selected={secondaryDriverSel}
              rows={drivers}
              labelKeys={["name", "description"]}
              docKey="document_number"
              placeholder="Buscar conductor secundario..."
              onSelect={(item) => {
                setSecondaryDriverSel(item);
                setExtra({ secondary_driver_id: item.id, secondary_driver_label: item.name });
              }}
            />
          </Field>
          <Field label="Motivo traslado">
            <select className="ify-select" value={form.transfer_reason} onChange={(e) => setField("transfer_reason", e.target.value)}>
              {TRANSFER_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modalidad transporte">
            <select className="ify-select" value={form.mode_transport} onChange={(e) => setField("mode_transport", e.target.value)}>
              {TRANSPORT_MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="ify-card mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">Productos</p>
          <button
            type="button"
            className="ify-btn-primary text-xs"
            onClick={() => {
              if (!manual.desc) return;
              setItems((p) => [
                ...p,
                { id: Date.now(), description: manual.desc, quantity: Number(manual.qty), unit_type_id: manual.unit },
              ]);
              setManual({ desc: "", qty: "1", unit: form.unit_measure });
            }}
          >
            + Agregar Producto
          </button>
        </div>
        <div className="relative mb-3">
          <input className="ify-input" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {results.length > 0 && (
            <ul className="ify-autocomplete-list absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded shadow-lg">
              {results.map((p) => (
                <li key={String(p.id)}>
                  <button
                    type="button"
                    className="ify-autocomplete-item"
                    onClick={() => {
                      setItems((prev) => [
                        ...prev,
                        {
                          id: Date.now(),
                          description: String(p.description),
                          quantity: 1,
                          unit_type_id: String(p.unit_type_id || form.unit_measure),
                        },
                      ]);
                      setSearch("");
                      setResults([]);
                    }}
                  >
                    {String(p.description)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input className="ify-input min-w-[200px] flex-1" placeholder="Descripción manual" value={manual.desc} onChange={(e) => setManual({ ...manual, desc: e.target.value })} />
          <input type="number" className="ify-input w-24" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} />
          <select className="ify-select w-28" value={manual.unit} onChange={(e) => setManual({ ...manual, unit: e.target.value })}>
            {UNIT_MEASURES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ify-card mb-4 overflow-x-auto">
        <table className="ify-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Unidad</th>
              <th>Descripción</th>
              <th>Cantidad / Peso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id}>
                <td>{idx + 1}</td>
                <td>{i.unit_type_id}</td>
                <td>{i.description}</td>
                <td>
                  <input
                    type="number"
                    className="ify-input w-24"
                    value={i.quantity}
                    onChange={(e) =>
                      setItems((p) => p.map((x) => (x.id === i.id ? { ...x, quantity: Number(e.target.value) } : x)))
                    }
                  />
                </td>
                <td>
                  <button type="button" className="text-red-500" onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}>
                    <i className="bi bi-trash" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="ify-btn-primary px-6 py-2" onClick={save} disabled={saving}>
        {saving ? "Emitiendo guía..." : isCarrier ? "Emitir G.R. Transportista" : "Emitir G.R. Remitente"}
      </button>

      <CustomerModal open={customerModal} onClose={() => setCustomerModal(false)} onSaved={onCustomerSaved} />
      <CarrierModal open={carrierModal} onClose={() => setCarrierModal(false)} onSaved={onCarrierSaved} />
    </div>
  );
}
