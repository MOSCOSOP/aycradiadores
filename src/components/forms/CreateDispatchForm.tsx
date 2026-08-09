"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field } from "@/components/ui/Modal";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";

type LineItem = { id: number; description: string; quantity: number; unit_type_id: string };

const TRANSPORT_MODES = [
  { id: "01", label: "Transporte público" },
  { id: "02", label: "Transporte privado" },
];

const TRANSFER_REASONS = ["Venta", "Traslado entre establecimientos", "Consignación", "Devolución", "Importación", "Exportación"];

export function CreateDispatchForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [customerId, setCustomerId] = useState(0);
  const [customerModal, setCustomerModal] = useState(false);
  const [dateIssue, setDateIssue] = useState(today);
  const [origin, setOrigin] = useState(COMPANY.address);
  const [dest, setDest] = useState("");
  const [reason, setReason] = useState("Venta");
  const [modeTransport, setModeTransport] = useState("02");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverDocument, setDriverDocument] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [manual, setManual] = useState({ desc: "", qty: "1" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.customers.records({ page: 1, limit: 100 }).then((r) => {
      setCustomers(r.data ?? []);
      if (r.data?.[0]) setCustomerId(Number(r.data[0].id));
    });
  }, []);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    const t = setTimeout(() => api.items.search(search, 8).then((r) => setResults(r.data ?? [])), 300);
    return () => clearTimeout(t);
  }, [search]);

  const save = async () => {
    if (!customerId || items.length === 0) return alert("Complete cliente e ítems");
    setSaving(true);
    try {
      await api.dispatches.create({
        customer_id: customerId,
        date_of_issue: dateIssue,
        origin_address: origin,
        dest_address: dest,
        transfer_reason: reason,
        mode_transport: modeTransport,
        vehicle_plate: vehiclePlate.toUpperCase(),
        driver_name: driverName,
        driver_document: driverDocument,
        total_weight: Number(totalWeight || 0),
        items: items.map((i) => ({ description: i.description, quantity: i.quantity, unit_type_id: i.unit_type_id })),
      });
      router.push("/dispatches");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ify-page">
      <PageHeader title="Nueva guía de remisión remitente" actions={
        <button type="button" className="ify-btn-outline" onClick={() => router.back()}>← Volver</button>
      } />

      <div className="ify-card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Fec. emisión">
            <input type="date" className="ify-input" value={dateIssue} onChange={(e) => setDateIssue(e.target.value)} />
          </Field>
          <Field label="Cliente">
            <div className="flex gap-2">
              <select className="ify-select flex-1" value={customerId} onChange={(e) => setCustomerId(Number(e.target.value))}>
                {customers.map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.number)} - {String(c.name)}</option>)}
              </select>
              <button type="button" className="ify-btn-outline px-2" onClick={() => setCustomerModal(true)}>+</button>
            </div>
          </Field>
          <Field label="Motivo traslado">
            <select className="ify-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              {TRANSFER_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Modalidad transporte">
            <select className="ify-select" value={modeTransport} onChange={(e) => setModeTransport(e.target.value)}>
              {TRANSPORT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Placa vehículo">
            <input className="ify-input uppercase" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())} placeholder="ABC-123" />
          </Field>
          <Field label="Peso total (KG)">
            <input type="number" className="ify-input" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} />
          </Field>
          <Field label="Conductor">
            <input className="ify-input" value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Nombre completo" />
          </Field>
          <Field label="Doc. conductor">
            <input className="ify-input" value={driverDocument} onChange={(e) => setDriverDocument(e.target.value)} placeholder="DNI / Licencia" />
          </Field>
          <Field label="Punto de partida" className="md:col-span-2 lg:col-span-3">
            <input className="ify-input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
          </Field>
          <Field label="Punto de llegada" className="md:col-span-2 lg:col-span-3">
            <input className="ify-input" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Dirección de entrega" />
          </Field>
        </div>
      </div>

      <div className="ify-card mb-4 p-4">
        <p className="mb-2 text-sm font-bold">Productos a trasladar</p>
        <div className="relative mb-3">
          <input className="ify-input" placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          {results.length > 0 && (
            <ul className="ify-autocomplete-list absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded shadow-lg">
              {results.map((p) => (
                <li key={String(p.id)}>
                  <button type="button" className="ify-autocomplete-item"
                    onClick={() => {
                      setItems((prev) => [...prev, { id: Date.now(), description: String(p.description), quantity: 1, unit_type_id: String(p.unit_type_id || "NIU") }]);
                      setSearch(""); setResults([]);
                    }}>
                    {String(p.description)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2">
          <input className="ify-input flex-1" placeholder="Descripción manual" value={manual.desc} onChange={(e) => setManual({ ...manual, desc: e.target.value })} />
          <input type="number" className="ify-input w-24" value={manual.qty} onChange={(e) => setManual({ ...manual, qty: e.target.value })} />
          <button type="button" className="ify-btn-outline" onClick={() => {
            if (!manual.desc) return;
            setItems((p) => [...p, { id: Date.now(), description: manual.desc, quantity: Number(manual.qty), unit_type_id: "NIU" }]);
            setManual({ desc: "", qty: "1" });
          }}>Agregar</button>
        </div>
      </div>

      <div className="ify-card mb-4 overflow-x-auto">
        <table className="ify-table">
          <thead><tr><th>#</th><th>Descripción</th><th>Unidad</th><th>Cant.</th><th /></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={i.id}>
                <td>{idx + 1}</td>
                <td>{i.description}</td>
                <td>{i.unit_type_id}</td>
                <td>
                  <input type="number" className="ify-input w-20" value={i.quantity}
                    onChange={(e) => setItems((p) => p.map((x) => x.id === i.id ? { ...x, quantity: Number(e.target.value) } : x))} />
                </td>
                <td><button type="button" className="text-red-500" onClick={() => setItems((p) => p.filter((x) => x.id !== i.id))}><i className="bi bi-trash" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="ify-btn-primary px-6 py-2" onClick={save} disabled={saving}>
        {saving ? "Emitiendo guía..." : "Emitir guía de remisión"}
      </button>

      <CustomerModal
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        onSaved={(c) => {
          setCustomers((prev) => [c, ...prev]);
          setCustomerId(Number(c.id));
        }}
      />
    </div>
  );
}
