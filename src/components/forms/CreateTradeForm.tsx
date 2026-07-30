"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type LineItem = {
  id: number;
  itemId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type PartyType = "customer" | "supplier";

type CreateTradeFormProps = {
  title: string;
  partyType: PartyType;
  partyLabel: string;
  redirectPath: string;
  linkStock?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<unknown>;
};

export function CreateTradeForm({
  title,
  partyType,
  partyLabel,
  redirectPath,
  linkStock = false,
  onSubmit,
}: CreateTradeFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<LineItem[]>([]);
  const [parties, setParties] = useState<Record<string, unknown>[]>([]);
  const [partyId, setPartyId] = useState<number>(0);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Record<string, unknown>[]>([]);
  const [manualDesc, setManualDesc] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualPrice, setManualPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = partyType === "customer"
      ? api.customers.records({ page: 1, limit: 100 })
      : api.suppliers.records();
    load.then((r) => {
      const list = r.data ?? [];
      setParties(list);
      if (list[0]) setPartyId(Number(list[0].id));
    });
  }, [partyType]);

  useEffect(() => {
    if (productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(productSearch, 8).then((r) => setProductResults(r.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [productSearch]);

  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const addProduct = (p: Record<string, unknown>) => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        itemId: Number(p.id),
        description: String(p.description),
        quantity: 1,
        unitPrice: Number(p.sale_unit_price || 0),
      },
    ]);
    setProductSearch("");
    setProductResults([]);
  };

  const addManual = () => {
    if (!manualDesc.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: manualDesc,
        quantity: Number(manualQty || 1),
        unitPrice: Number(manualPrice || 0),
      },
    ]);
    setManualDesc("");
    setManualQty("1");
    setManualPrice("");
  };

  const handleSave = async () => {
    if (!partyId || items.length === 0) {
      setError("Selecciona " + partyLabel.toLowerCase() + " y al menos un ítem");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unitPrice,
          ...(linkStock && i.itemId ? { item_id: i.itemId } : {}),
        })),
      };
      if (partyType === "customer") payload.customer_id = partyId;
      else payload.supplier_id = partyId;

      await onSubmit(payload);
      router.push(redirectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-5">
      <PageHeader title={title} actions={
        <button type="button" className="ify-btn-outline" onClick={() => router.back()}>← Volver</button>
      } />

      {error && <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="ify-card mb-4 p-4">
        <Field label={partyLabel}>
          <select className="ify-select" value={partyId} onChange={(e) => setPartyId(Number(e.target.value))}>
            {parties.map((p) => (
              <option key={String(p.id)} value={String(p.id)}>{String(p.name)} — {String(p.number)}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="ify-card mb-4 p-4">
        <h3 className="mb-3 font-bold text-sm">Agregar productos</h3>
        <div className="relative mb-3">
          <input className="ify-input" placeholder="Buscar producto..." value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)} />
          {productResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow-lg">
              {productResults.map((p) => (
                <button key={String(p.id)} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onClick={() => addProduct(p)}>
                  {String(p.description)} — S/ {Number(p.sale_unit_price).toFixed(2)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          <input className="ify-input md:col-span-2" placeholder="Descripción manual" value={manualDesc}
            onChange={(e) => setManualDesc(e.target.value)} />
          <input type="number" className="ify-input" placeholder="Cant." value={manualQty}
            onChange={(e) => setManualQty(e.target.value)} />
          <input type="number" className="ify-input" placeholder="Precio" value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)} />
        </div>
        <button type="button" className="ify-btn-outline mt-2" onClick={addManual}>+ Agregar línea manual</button>
      </div>

      <div className="ify-card mb-4 overflow-x-auto">
        <table className="ify-table">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="py-6 text-center text-[var(--muted)]">Sin ítems</td></tr>
            ) : items.map((i) => (
              <tr key={i.id}>
                <td>{i.description}</td>
                <td>
                  <input type="number" className="ify-input w-20" value={i.quantity}
                    onChange={(e) => setItems((p) => p.map((x) => x.id === i.id ? { ...x, quantity: Number(e.target.value) } : x))} />
                </td>
                <td>
                  <input type="number" className="ify-input w-24" value={i.unitPrice}
                    onChange={(e) => setItems((p) => p.map((x) => x.id === i.id ? { ...x, unitPrice: Number(e.target.value) } : x))} />
                </td>
                <td>S/ {(i.quantity * i.unitPrice).toFixed(2)}</td>
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

      <div className="flex items-center justify-between">
        <strong className="text-lg">Total: S/ {total.toFixed(2)}</strong>
        <button type="button" className="ify-btn-primary px-6 py-2" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
