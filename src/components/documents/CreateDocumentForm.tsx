"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { Modal } from "@/components/ui/Modal";
import { downloadCsv } from "@/lib/download-csv";

const PARK_KEY = "ify_parked_docs";

type LineItem = {
  id: number;
  itemId?: number;
  product: string;
  unit: string;
  quantity: number;
  unitValue: number;
  unitPrice: number;
};

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="ify-label">{label}</label>
      {children}
    </div>
  );
}

export function CreateDocumentForm() {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [showAdditional, setShowAdditional] = useState(false);
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [tables, setTables] = useState<Record<string, unknown> | null>(null);
  const [customerResults, setCustomerResults] = useState<Record<string, unknown>[]>([]);
  const [productResults, setProductResults] = useState<Record<string, unknown>[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, unknown> | null>(null);
  const [exchangeRate, setExchangeRate] = useState("3.396");
  const [apiError, setApiError] = useState("");
  const [saving, setSaving] = useState(false);
  const [docTypeId, setDocTypeId] = useState("01");
  const [seriesId, setSeriesId] = useState<number>(0);
  const [establishmentId, setEstablishmentId] = useState<number>(0);
  const [sellerId, setSellerId] = useState<number>(0);
  const [operationTypeId, setOperationTypeId] = useState("0101");
  const [currencyId, setCurrencyId] = useState("PEN");
  const [dateIssue, setDateIssue] = useState(today);
  const [dateDue, setDateDue] = useState(today);
  const [plate, setPlate] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [multiModal, setMultiModal] = useState(false);
  const [multiSearch, setMultiSearch] = useState("");
  const [multiResults, setMultiResults] = useState<Record<string, unknown>[]>([]);
  const [multiPick, setMultiPick] = useState<number[]>([]);
  const [parkedModal, setParkedModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<Record<string, unknown>[]>([]);
  const [parkedDocs, setParkedDocs] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.documents
      .tables()
      .then((data) => {
        setTables(data);
        const rate = (data as { exchange_rate_sale?: string }).exchange_rate_sale;
        if (rate) setExchangeRate(rate);
        const est = (data.all_establishments as { id: number }[])?.[0];
        const sel = (data.sellers as { id: number }[])?.[0];
        const ser = (data.series as { id: number }[])?.[0];
        if (est) setEstablishmentId(est.id);
        if (sel) setSellerId(sel.id);
        if (ser) setSeriesId(ser.id);
        api.customers.records({ page: 1, limit: 1 }).then((r) => {
          if (r.data?.[0]) setSelectedCustomer(r.data[0]);
        });
      })
      .catch((e) => setApiError(e instanceof Error ? e.message : "Error API"));
  }, []);

  useEffect(() => {
    if (clientSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.customers.search(clientSearch, 8).then((r) => setCustomerResults(r.data ?? []));
    }, 350);
    return () => clearTimeout(t);
  }, [clientSearch]);

  useEffect(() => {
    if (productSearch.length < 2) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(productSearch, 8).then((r) => setProductResults(r.data ?? []));
    }, 350);
    return () => clearTimeout(t);
  }, [productSearch]);

  useEffect(() => {
    if (!multiModal || multiSearch.length < 2) {
      setMultiResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(multiSearch, 20).then((r) => setMultiResults(r.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [multiSearch, multiModal]);

  const parkDocument = () => {
    if (!selectedCustomer || items.length === 0) {
      alert("Agrega cliente e ítems antes de aparcar");
      return;
    }
    const parked = JSON.parse(localStorage.getItem(PARK_KEY) || "[]") as Record<string, unknown>[];
    parked.push({
      id: Date.now(),
      customer: selectedCustomer,
      items,
      docTypeId,
      plate,
      dateIssue,
      label: `${selectedCustomer.name} — ${items.length} ítems`,
    });
    localStorage.setItem(PARK_KEY, JSON.stringify(parked));
    alert("Comprobante aparcado");
  };

  const openParked = () => {
    setParkedDocs(JSON.parse(localStorage.getItem(PARK_KEY) || "[]"));
    setParkedModal(true);
  };

  const restoreParked = (doc: Record<string, unknown>) => {
    setSelectedCustomer(doc.customer as Record<string, unknown>);
    setItems((doc.items as LineItem[]) ?? []);
    setDocTypeId(String(doc.docTypeId || "01"));
    setPlate(String(doc.plate || ""));
    setDateIssue(String(doc.dateIssue || today));
    setParkedModal(false);
  };

  const showHistory = async () => {
    if (!selectedCustomer) {
      alert("Selecciona un cliente");
      return;
    }
    const res = await api.documents.records({ page: 1, limit: 50 });
    const filtered = (res.data ?? []).filter(
      (d) =>
        Number(d.customer_id) === Number(selectedCustomer.id) ||
        String(d.customer_name ?? "").toLowerCase().includes(String(selectedCustomer.name).toLowerCase())
    );
    setHistoryDocs(filtered.slice(0, 15));
    setHistoryModal(true);
  };

  const addMultipleProducts = () => {
    multiResults.filter((p) => multiPick.includes(Number(p.id))).forEach((p) => addProductFromApi(p));
    setMultiModal(false);
    setMultiPick([]);
    setMultiSearch("");
  };

  const downloadExcelTemplate = () => {
    downloadCsv("formato_comprobante.csv", [
      { descripcion: "Producto ejemplo", cantidad: 1, precio_unitario: 10, unidad: "NIU" },
    ]);
  };

  const documentTypes = (tables?.document_types as { id: string; description: string }[]) ?? [];
  const series = (tables?.series as { id: number; number: string; document_type_id: string }[]) ?? [];
  const sellers = (tables?.sellers as { id: number; name: string }[]) ?? [];
  const establishments =
    (tables?.all_establishments as { id: number; description: string }[]) ?? [];
  const operationTypes =
    (tables?.operation_types as { id: string; description: string }[]) ?? [];
  const currencies = (tables?.currency_types as { id: string; description: string }[]) ?? [];

  const totals = items.reduce(
    (acc, item) => ({
      value: acc.value + item.quantity * item.unitValue,
      price: acc.price + item.quantity * item.unitPrice,
    }),
    { value: 0, price: 0 }
  );

  const addProductFromApi = (product: Record<string, unknown>) => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemId: product.id ? Number(product.id) : undefined,
        product: String(product.description ?? product.full_description ?? ""),
        unit: String(product.unit_type_id ?? "NIU"),
        quantity: 1,
        unitValue: Number(product.sale_unit_price ?? 0) / 1.18,
        unitPrice: Number(product.sale_unit_price ?? 0),
      },
    ]);
    setProductSearch("");
    setProductResults([]);
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
      await api.documents.create({
        document_type_id: docTypeId,
        series_id: seriesId,
        establishment_id: establishmentId,
        seller_id: sellerId,
        customer_id: selectedCustomer.id,
        operation_type_id: operationTypeId,
        currency_type_id: currencyId,
        exchange_rate: Number(exchangeRate),
        date_of_issue: dateIssue,
        date_of_due: dateDue,
        plate: plate || undefined,
        items: items.map((i) => ({
          item_id: i.itemId,
          description: i.product,
          unit_type_id: i.unit,
          quantity: i.quantity,
          unit_value: i.unitValue,
          unit_price: i.unitPrice,
        })),
      });
      router.push("/documents");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <div className="p-4 md:p-5">
      {apiError && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          API: {apiError}. <a href="/login" className="underline">Inicia sesión</a> primero.
        </div>
      )}
      {/* Encabezado empresa */}
      <div className="ify-card mb-3 p-4">
        <div className="flex items-center gap-4">
          <Image
            src="/images/logo-client.png"
            alt={COMPANY.tradeName}
            width={56}
            height={56}
            className="ify-doc-header-logo"
          />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide">{COMPANY.name}</h2>
            <p className="text-xs text-[var(--muted)]">RUC {COMPANY.ruc}</p>
          </div>
        </div>
      </div>

      {/* Tipo comprobante + fechas */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Tipo comprobante">
            <select
              className="ify-select"
              value={docTypeId}
              onChange={(e) => {
                setDocTypeId(e.target.value);
                const match = series.find((s) => s.document_type_id === e.target.value);
                if (match) setSeriesId(match.id);
              }}
            >
              {documentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fec. emisión">
            <input type="date" className="ify-input" value={dateIssue} onChange={(e) => setDateIssue(e.target.value)} />
          </Field>
          <Field label="Fec. vencimiento">
            <input type="date" className="ify-input" value={dateDue} onChange={(e) => setDateDue(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Grid 6 columnas */}
      <div className="ify-card mb-3 p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Field label="Establecimiento">
            <select className="ify-select" value={establishmentId} onChange={(e) => setEstablishmentId(Number(e.target.value))}>
              {establishments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Vendedor">
            <select className="ify-select" value={sellerId} onChange={(e) => setSellerId(Number(e.target.value))}>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Serie">
            <select className="ify-select" value={seriesId} onChange={(e) => setSeriesId(Number(e.target.value))}>
              {series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de operación">
            <select className="ify-select" value={operationTypeId} onChange={(e) => setOperationTypeId(e.target.value)}>
              {operationTypes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Moneda">
            <select className="ify-select" value={currencyId} onChange={(e) => setCurrencyId(e.target.value)}>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.description}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de cambio">
            <input
              type="number"
              className="ify-input"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              step="0.001"
            />
          </Field>
          <Field label="N° de placa">
            <input
              type="text"
              className="ify-input uppercase"
              placeholder="ABC-123"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
            />
          </Field>
        </div>
      </div>

      {/* Cliente + productos */}
      <div className="ify-card mb-3 p-4">
        <Field label="Cliente">
          <div className="relative">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="ify-input flex-1"
                placeholder={
                  selectedCustomer
                    ? `${selectedCustomer.name} (${selectedCustomer.number})`
                    : "Buscar cliente por nombre o documento..."
                }
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setSelectedCustomer(null);
                }}
              />
              <button type="button" className="ify-link whitespace-nowrap" onClick={() => setCustomerModalOpen(true)}>
                [+ Nuevo]
              </button>
            </div>
            {customerResults.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--border)] bg-white shadow-lg">
                {customerResults.map((c) => (
                  <li key={String(c.id)}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--border-light)]"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setClientSearch("");
                        setCustomerResults([]);
                      }}
                    >
                      {String(c.name)} — {String(c.number)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>
        <div className="mt-3">
          <Field label="Buscar productos o servicios">
            <div className="relative">
              <input
                type="text"
                className="ify-input"
                placeholder="Escriba el nombre, código o código de barras..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productResults.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-[var(--border)] bg-white shadow-lg">
                  {productResults.map((p) => (
                    <li key={String(p.id)}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--border-light)]"
                        onClick={() => addProductFromApi(p)}
                      >
                        {String(p.description)} — S/ {Number(p.sale_unit_price ?? 0).toFixed(2)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Field>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ify-btn-outline" onClick={() => addProductFromApi({ description: "", sale_unit_price: 0 })}>
            <i className="bi bi-plus-lg" /> Agregar producto
          </button>
          <button type="button" className="ify-btn-outline" onClick={() => { setMultiModal(true); setMultiPick([]); }}>
            <i className="bi bi-files" /> Agregar productos
          </button>
          <Link href="/items" className="ify-btn-outline">
            <i className="bi bi-file-earmark-plus" /> Crear productos
          </Link>
          <button type="button" className="ify-btn-outline" onClick={showHistory}>
            <i className="bi bi-clock-history" /> Historial de cliente
          </button>
          <button type="button" className="ify-btn-outline" onClick={parkDocument}>
            <i className="bi bi-pause-circle" /> Aparcar
          </button>
          <button type="button" className="ify-btn-outline" onClick={openParked}>
            <i className="bi bi-eye" /> Ver aparcados
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-4">
          <button type="button" className="ify-link flex items-center gap-1" onClick={downloadExcelTemplate}>
            <i className="bi bi-download" /> Descargar formato Excel
          </button>
        </div>
      </div>

      {/* Información adicional */}
      <div className="ify-card mb-3">
        <button
          type="button"
          onClick={() => setShowAdditional(!showAdditional)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold text-[var(--primary)]"
        >
          <i className={`bi bi-chevron-${showAdditional ? "up" : "down"}`} />
          Información Adicional
        </button>
        {showAdditional && (
          <div className="grid grid-cols-1 gap-3 border-t border-[var(--border-light)] p-4 md:grid-cols-3">
            <Field label="Orden de compra">
              <input type="text" className="ify-input" placeholder="N° orden de compra" />
            </Field>
            <Field label="Guía de remisión">
              <input type="text" className="ify-input" placeholder="N° guía" />
            </Field>
            <Field label="Observaciones">
              <input type="text" className="ify-input" placeholder="Observaciones" />
            </Field>
          </div>
        )}
      </div>

      {/* Tabla de ítems */}
      <div className="ify-card mb-3 overflow-x-auto">
        <table className="ify-table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th style={{ minWidth: 220 }}>Productos o Servicios</th>
              <th className="w-20">Unidad</th>
              <th className="w-20">Cantidad</th>
              <th className="w-24">Valor U.</th>
              <th className="w-24">Precio U.</th>
              <th className="w-24">Valor Total</th>
              <th className="w-24">Precio Total</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[var(--muted-light)]">
                  No hay productos agregados
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td>
                    <input
                      type="text"
                      className="ify-input"
                      placeholder="Producto o servicio"
                      value={item.product}
                      onChange={(e) => updateItem(item.id, { product: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="ify-input"
                      value={item.unit}
                      onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="ify-input"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="ify-input"
                      step="0.01"
                      value={item.unitValue}
                      onChange={(e) => updateItem(item.id, { unitValue: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="ify-input"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                    />
                  </td>
                  <td className="text-end font-semibold">
                    {(item.quantity * item.unitValue).toFixed(2)}
                  </td>
                  <td className="text-end font-semibold">
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="ify-totals-row">
            <div className="ify-total-item">
              <span>Total Valor</span>
              <strong>S/ {totals.value.toFixed(2)}</strong>
            </div>
            <div className="ify-total-item">
              <span>IGV (18%)</span>
              <strong>S/ {(totals.price - totals.value).toFixed(2)}</strong>
            </div>
            <div className="ify-total-item grand">
              <span>Total Precio</span>
              <strong>S/ {totals.price.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pb-6">
        <button type="button" className="ify-btn-ghost" onClick={() => router.push("/documents")}>
          Cancelar
        </button>
        <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving}>
          <i className="bi bi-check2-circle" /> {saving ? "Guardando..." : "Guardar y emitir"}
        </button>
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={(c) => {
          setSelectedCustomer(c);
          setClientSearch("");
          setCustomerResults([]);
        }}
      />

      <Modal open={multiModal} title="Agregar varios productos" size="lg" onClose={() => setMultiModal(false)}
        footer={
          <button type="button" className="ify-btn-primary" onClick={addMultipleProducts} disabled={!multiPick.length}>
            Agregar seleccionados ({multiPick.length})
          </button>
        }>
        <input className="ify-input mb-3" placeholder="Buscar productos..." value={multiSearch} onChange={(e) => setMultiSearch(e.target.value)} />
        <div className="max-h-64 overflow-auto">
          {multiResults.map((p) => (
            <label key={String(p.id)} className="flex items-center gap-2 border-b px-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={multiPick.includes(Number(p.id))}
                onChange={(e) => {
                  const id = Number(p.id);
                  setMultiPick((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id));
                }}
              />
              <span>{String(p.description)} — S/ {Number(p.sale_unit_price ?? 0).toFixed(2)}</span>
            </label>
          ))}
        </div>
      </Modal>

      <Modal open={parkedModal} title="Comprobantes aparcados" onClose={() => setParkedModal(false)}>
        {parkedDocs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No hay comprobantes aparcados</p>
        ) : (
          <div className="space-y-2">
            {parkedDocs.map((doc) => (
              <div key={String(doc.id)} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{String(doc.label)}</span>
                <button type="button" className="ify-btn-outline text-xs" onClick={() => restoreParked(doc)}>Restaurar</button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal open={historyModal} title="Historial del cliente" size="lg" onClose={() => setHistoryModal(false)}>
        {historyDocs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Sin comprobantes previos</p>
        ) : (
          <table className="ify-table text-sm">
            <thead><tr><th>Número</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              {historyDocs.map((d) => (
                <tr key={String(d.id)}>
                  <td>{String(d.number)}</td>
                  <td>{String(d.date_of_issue)}</td>
                  <td>S/ {Number(d.total).toFixed(2)}</td>
                  <td>{String(d.state_type_description)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
