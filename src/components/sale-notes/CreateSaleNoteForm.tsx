"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/constants";
import { Field } from "@/components/ui/Modal";
import { CustomerSearchField } from "@/components/ui/CustomerSearchField";
import { ProductSuggestItem } from "@/components/ui/ProductSuggestItem";
import { api } from "@/lib/api/client";

type LineItem = {
  id: number;
  itemId?: number;
  description: string;
  unit: string;
  quantity: number;
  unitValue: number;
  unitPrice: number;
};

type PaymentLine = {
  id: number;
  date: string;
  method: string;
  destination: string;
  reference: string;
  gloss: string;
  amount: number;
};

export function CreateSaleNoteForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [items, setItems] = useState<LineItem[]>([]);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [tables, setTables] = useState<Record<string, unknown> | null>(null);
  const [productResults, setProductResults] = useState<Record<string, unknown>[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, unknown> | null>(null);
  const [cashBoxes, setCashBoxes] = useState<Record<string, unknown>[]>([]);
  const [exchangeRate, setExchangeRate] = useState("3.396");
  const [saving, setSaving] = useState(false);
  const [establishmentId, setEstablishmentId] = useState(0);
  const [sellerId, setSellerId] = useState(0);
  const [currencyId, setCurrencyId] = useState("PEN");
  const [dateIssue, setDateIssue] = useState(today);
  const [dateDue, setDateDue] = useState("");
  const [seriesNumber, setSeriesNumber] = useState("NV01");
  const [customerAddress, setCustomerAddress] = useState("");
  const [periodType, setPeriodType] = useState("");
  const [periodQty, setPeriodQty] = useState("0");
  const [plate, setPlate] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [purchaseOrder, setPurchaseOrder] = useState("");
  const [observation, setObservation] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payDestination, setPayDestination] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payGloss, setPayGloss] = useState("");
  const [payAmount, setPayAmount] = useState("0");

  useEffect(() => {
    Promise.all([api.documents.tables(), api.cash.records(), api.customers.records({ page: 1, limit: 1 })])
      .then(([data, cash, cust]) => {
        setTables(data);
        setCashBoxes(cash.data ?? []);
        const rate = (data as { exchange_rate_sale?: string }).exchange_rate_sale;
        if (rate) setExchangeRate(rate);
        const est = (data.all_establishments as { id: number }[])?.[0];
        const sel = (data.sellers as { id: number }[])?.[0];
        if (est) setEstablishmentId(est.id);
        if (sel) setSellerId(sel.id);
        if (cash.data?.[0]) {
          setPayDestination(String(cash.data[0].description || "CAJA GENERAL"));
        }
        if (cust.data?.[0]) {
          setSelectedCustomer(cust.data[0]);
          setCustomerAddress(String(cust.data[0].address || ""));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (productSearch.length < 1) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => api.items.search(productSearch, 12).then((r) => setProductResults(r.data ?? [])), 250);
    return () => clearTimeout(t);
  }, [productSearch]);

  const sellers = (tables?.sellers as { id: number; name: string }[]) ?? [];
  const establishments = (tables?.all_establishments as { id: number; description: string }[]) ?? [];
  const currencies = (tables?.currency_types as { id: string; description: string }[]) ?? [];

  const totals = items.reduce(
    (acc, item) => ({
      value: acc.value + item.quantity * item.unitValue,
      price: acc.price + item.quantity * item.unitPrice,
    }),
    { value: 0, price: 0 }
  );

  const addProduct = (product: Record<string, unknown>) => {
    const price = Number(product.sale_unit_price ?? 0);
    setItems((prev) => [
      ...prev,
      {
        id: Date.now() + prev.length,
        itemId: product.id ? Number(product.id) : undefined,
        description: String(product.description ?? ""),
        unit: String(product.unit_type_id ?? "NIU"),
        quantity: 1,
        unitValue: price / 1.18,
        unitPrice: price,
      },
    ]);
    setProductSearch("");
    setProductResults([]);
  };

  const addEmptyProduct = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: "",
        unit: "NIU",
        quantity: 1,
        unitValue: 0,
        unitPrice: 0,
      },
    ]);
  };

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const addPayment = () => {
    setPayments((prev) => [
      ...prev,
      {
        id: Date.now(),
        date: payDate,
        method: payMethod,
        destination: payDestination,
        reference: payReference,
        gloss: payGloss,
        amount: Number(payAmount || 0),
      },
    ]);
    setPayAmount("0");
    setPayReference("");
    setPayGloss("");
  };

  const handleSave = async () => {
    if (!selectedCustomer?.id) {
      alert("Selecciona un cliente");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }
    setSaving(true);
    try {
      await api.saleNotes.create({
        customer_id: selectedCustomer.id,
        series: seriesNumber,
        establishment_id: establishmentId,
        seller_id: sellerId,
        currency_type_id: currencyId,
        exchange_rate: Number(exchangeRate),
        date_of_issue: dateIssue,
        date_of_due: dateDue || dateIssue,
        observation,
        shipping_address: shippingAddress,
        purchase_order: purchaseOrder,
        plate,
        items: items.map((i) => ({
          description: i.description,
          unit_type_id: i.unit,
          quantity: i.quantity,
          unit_value: i.unitValue,
          unit_price: i.unitPrice,
        })),
        payments,
      });
      router.push("/sale-notes");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ify-page">
      {/* Encabezado — igual al original */}
      <div className="ify-card mb-3 p-4">
        <div className="flex items-start gap-4">
          <Image src="/images/logo-client.png" alt={COMPANY.tradeName} width={64} height={64} className="ify-doc-header-logo" />
          <div>
            <h1 className="text-base font-bold text-[var(--foreground)]">Nota de venta</h1>
            <p className="text-sm font-semibold uppercase">{COMPANY.name}</p>
            <p className="text-xs text-[var(--muted)]">{COMPANY.address}</p>
          </div>
        </div>
      </div>

      {/* Cliente + Dirección */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <Field label="Cliente" className="lg:col-span-3">
            <CustomerSearchField
              selected={selectedCustomer}
              onSelect={(c) => {
                setSelectedCustomer(c);
                setCustomerAddress(String(c.address || ""));
              }}
              onNew={() => window.open("/persons/customers", "_blank")}
            />
          </Field>
          <Field label="Dirección">
            <select className="ify-select" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)}>
              <option value="">Seleccionar</option>
              {customerAddress && <option value={customerAddress}>{customerAddress}</option>}
              <option value={COMPANY.address}>{COMPANY.address}</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Fila 1: Establecimiento, Serie, Moneda, fechas, TC */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Field label="Establecimiento">
            <select className="ify-select" value={establishmentId} onChange={(e) => setEstablishmentId(Number(e.target.value))}>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.description}</option>
              ))}
            </select>
          </Field>
          <Field label="Serie">
            <select className="ify-select" value={seriesNumber} onChange={(e) => setSeriesNumber(e.target.value)}>
              <option value="NV01">NV01</option>
              <option value="NV02">NV02</option>
            </select>
          </Field>
          <Field label="Moneda">
            <select className="ify-select" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>{c.description}</option>
              ))}
            </select>
          </Field>
          <Field label="Fec. Emisión">
            <input type="date" className="ify-input" value={dateIssue} onChange={(e) => setDateIssue(e.target.value)} />
          </Field>
          <Field label="Fec. Vencimiento">
            <input type="date" className="ify-input" value={dateDue} onChange={(e) => setDateDue(e.target.value)} />
          </Field>
          <Field label="Tipo de cambio">
            <input type="number" className="ify-input" step="0.001" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Fila 2: periodo, placa, envío, OC */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Field label="Tipo periodo">
            <select className="ify-select" value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="">Seleccionar</option>
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
            </select>
          </Field>
          <Field label="Cant. Periodos">
            <input type="number" className="ify-input" value={periodQty} onChange={(e) => setPeriodQty(e.target.value)} />
          </Field>
          <Field label="Placa">
            <div className="relative">
              <input type="text" className="ify-input pr-8" value={plate} onChange={(e) => setPlate(e.target.value)} />
              <i className="bi bi-search absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            </div>
          </Field>
          <Field label="Dirección de envío">
            <input type="text" className="ify-input" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </Field>
          <Field label="Orden de compra">
            <input type="text" className="ify-input" value={purchaseOrder} onChange={(e) => setPurchaseOrder(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Vendedor + Establecimiento */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Vendedor">
            <select className="ify-select" value={sellerId} onChange={(e) => setSellerId(Number(e.target.value))}>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Establecimiento">
            <select className="ify-select" value={establishmentId} onChange={(e) => setEstablishmentId(Number(e.target.value))}>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>{e.description}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {/* Observación */}
      <div className="ify-card mb-3 p-4">
        <Field label="Observación">
          <textarea className="ify-input min-h-[72px] resize-y" value={observation} onChange={(e) => setObservation(e.target.value)} />
        </Field>
      </div>

      {/* Buscar productos */}
      <div className="ify-card mb-3 p-4">
        <Field label="Buscar productos o servicios">
          <div className="relative">
            <input
              type="text"
              className="ify-input"
              placeholder="Nombre, código o código de barras..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setProductSearchOpen(true);
              }}
              onFocus={() => setProductSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setProductSearchOpen(false), 180)}
            />
            {productSearchOpen && productResults.length > 0 && (
              <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md shadow-lg">
                {productResults.map((p) => (
                  <li key={String(p.id)}>
                    <button
                      type="button"
                      className="ify-autocomplete-item w-full p-0"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addProduct(p)}
                    >
                      <ProductSuggestItem product={p} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>
      </div>

      {/* Pagos — fila como en el original */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-7 lg:items-end">
          <Field label="F. Pago">
            <input type="date" className="ify-input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </Field>
          <Field label="Método de pago">
            <select className="ify-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Tarjeta</option>
              <option>Yape / Plin</option>
            </select>
          </Field>
          <Field label="Destino">
            <select className="ify-select" value={payDestination} onChange={(e) => setPayDestination(e.target.value)}>
              {cashBoxes.map((c) => (
                <option key={String(c.id)} value={String(c.description)}>{String(c.description)}</option>
              ))}
              {!cashBoxes.length && <option>CAJA GENERAL - ADMINISTRADOR</option>}
            </select>
          </Field>
          <Field label="Referencia">
            <input className="ify-input" value={payReference} onChange={(e) => setPayReference(e.target.value)} />
          </Field>
          <Field label="Glosa">
            <input className="ify-input" value={payGloss} onChange={(e) => setPayGloss(e.target.value)} />
          </Field>
          <Field label="Monto">
            <input type="number" className="ify-input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </Field>
          <div className="flex gap-1 pb-1">
            <button type="button" className="ify-link text-xs whitespace-nowrap" onClick={addPayment}>[+ Agregar]</button>
            <button type="button" className="text-red-500"><i className="bi bi-trash" /></button>
          </div>
        </div>
      </div>

      {/* Botones acción */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" className="ify-btn-outline" onClick={addEmptyProduct}>
          <i className="bi bi-plus-lg" /> Agregar Producto
        </button>
        <button type="button" className="ify-btn-outline">
          <i className="bi bi-clock-history" /> Historial de cliente
        </button>
      </div>

      {/* Tabla ítems */}
      <div className="ify-card mb-3 overflow-x-auto">
        <table className="ify-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th style={{ minWidth: 200 }}>Descripción</th>
              <th className="w-20">Unidad</th>
              <th className="w-20">Cantidad</th>
              <th className="w-24">Valor U.</th>
              <th className="w-24">Precio U.</th>
              <th className="w-24">Subtotal</th>
              <th className="w-24">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-[var(--muted-light)]">
                  No hay productos agregados
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <input type="text" className="ify-input" value={item.description} onChange={(e) => updateItem(item.id, { description: e.target.value })} />
                  </td>
                  <td>
                    <input type="text" className="ify-input" value={item.unit} onChange={(e) => updateItem(item.id, { unit: e.target.value })} />
                  </td>
                  <td>
                    <input type="number" className="ify-input" min={1} value={item.quantity} onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input type="number" className="ify-input" step="0.01" value={item.unitValue.toFixed(2)} onChange={(e) => updateItem(item.id, { unitValue: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input type="number" className="ify-input" step="0.01" value={item.unitPrice.toFixed(2)} onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })} />
                  </td>
                  <td className="text-end font-semibold">{(item.quantity * item.unitValue).toFixed(2)}</td>
                  <td className="text-end font-semibold">{(item.quantity * item.unitPrice).toFixed(2)}</td>
                  <td>
                    <button type="button" className="text-red-500" onClick={() => setItems((p) => p.filter((x) => x.id !== item.id))}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="ify-totals-row">
            <div className="ify-total-item">
              <span>Subtotal</span>
              <strong>S/ {totals.value.toFixed(2)}</strong>
            </div>
            <div className="ify-total-item">
              <span>IGV (18%)</span>
              <strong>S/ {(totals.price - totals.value).toFixed(2)}</strong>
            </div>
            <div className="ify-total-item grand">
              <span>Total</span>
              <strong>S/ {totals.price.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pb-6">
        <button type="button" className="ify-btn-ghost" onClick={() => router.push("/sale-notes")}>
          Cancelar
        </button>
        <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving}>
          <i className="bi bi-check2-circle" /> {saving ? "Guardando..." : "Generar"}
        </button>
      </div>
    </div>
  );
}
