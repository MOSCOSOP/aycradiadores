"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import { api } from "@/lib/api/client";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { ItemEditModal } from "@/components/items/ItemEditModal";
import { CustomerSearchField } from "@/components/ui/CustomerSearchField";
import { ProductSuggestItem } from "@/components/ui/ProductSuggestItem";
import { Modal } from "@/components/ui/Modal";
import { DocumentPrintTemplate } from "@/components/documents/DocumentPrintTemplate";
import { buildReceiptFromPos, docTypeLabelFromId } from "@/lib/comprobante/build-receipt-data";
import { downloadCsv } from "@/lib/download-csv";

const PARK_KEY = "ify_parked_docs";

type PaymentLine = {
  id: number;
  destination: string;
  reference: string;
  gloss: string;
  amount: number;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [tables, setTables] = useState<Record<string, unknown> | null>(null);
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
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [multiModal, setMultiModal] = useState(false);
  const [multiSearch, setMultiSearch] = useState("");
  const [multiResults, setMultiResults] = useState<Record<string, unknown>[]>([]);
  const [multiPick, setMultiPick] = useState<number[]>([]);
  const [parkedModal, setParkedModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<Record<string, unknown>[]>([]);
  const [parkedDocs, setParkedDocs] = useState<Record<string, unknown>[]>([]);
  const [discount, setDiscount] = useState(0);
  const [otherCharges, setOtherCharges] = useState(0);
  const [useOtherCharges, setUseOtherCharges] = useState(false);
  const [paymentCondition, setPaymentCondition] = useState("Contado");
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [cashBoxes, setCashBoxes] = useState<Record<string, unknown>[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<LineItem | null>(null);

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
    api.cash.records().then((r) => setCashBoxes(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (productSearch.length < 1) {
      setProductResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(productSearch, 12).then((r) => setProductResults(r.data ?? []));
    }, 250);
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

  const igv = round2(totals.price - totals.value);
  const grandTotal = round2(totals.price - discount + (useOtherCharges ? otherCharges : 0));
  const defaultDestination =
    String(cashBoxes[0]?.description ?? "CAJA GENERAL - ADMINISTRADOR");

  useEffect(() => {
    if (items.length === 0) {
      setPayments([]);
      return;
    }
    setPayments((prev) => {
      if (prev.length === 0) {
        return [{ id: Date.now(), destination: defaultDestination, reference: "", gloss: "", amount: grandTotal }];
      }
      if (prev.length === 1) {
        return [{ ...prev[0], amount: grandTotal }];
      }
      return prev;
    });
  }, [grandTotal, items.length, defaultDestination]);

  const addProductFromApi = (product: Record<string, unknown>) => {
    const itemId = product.local_id ? Number(product.local_id) : product.id ? Number(product.id) : undefined;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        itemId,
        product: String(product.description ?? product.full_description ?? ""),
        unit: String(product.unit_type_id ?? "NIU"),
        quantity: 1,
        unitValue: round2(Number(product.sale_unit_price ?? 0) / 1.18),
        unitPrice: round2(Number(product.sale_unit_price ?? 0)),
      },
    ]);
    setProductSearch("");
    setProductResults([]);
    setProductSearchOpen(false);
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
      const res = await api.documents.create({
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
      }) as { data?: { id?: number }; sunat?: { success?: boolean; message?: string } | null };

      const docId = res.data?.id;
      const sunat = res.sunat;
      if (sunat?.message) {
        const ok = sunat.success !== false;
        sessionStorage.setItem(
          "ify_sunat_flash",
          JSON.stringify({
            ok,
            message: sunat.message,
          })
        );
      } else {
        sessionStorage.setItem(
          "ify_sunat_flash",
          JSON.stringify({
            ok: false,
            message: "Comprobante guardado localmente. No se intentó envío SUNAT (revise usuario SOL en Empresa).",
          })
        );
      }

      router.push(docId ? `/documents/${docId}` : "/documents");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (id: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, ...patch };
        if ("unitPrice" in patch && patch.unitPrice !== undefined) {
          next.unitValue = round2(patch.unitPrice / 1.18);
        } else if ("unitValue" in patch && patch.unitValue !== undefined) {
          next.unitPrice = round2(patch.unitValue * 1.18);
        }
        return next;
      })
    );
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const previewSeries = series.find((s) => String(s.document_type_id) === String(docTypeId));
  const previewNumber = previewSeries
    ? `${String(previewSeries.number)}-00000001`
    : "PREVIEW-00000001";

  const previewReceipt = useMemo(
    () =>
      buildReceiptFromPos({
        kind: docTypeId === "01" ? "factura" : docTypeId === "03" ? "boleta" : "document",
        number: previewNumber,
        document_type_id: docTypeId,
        document_type_label: docTypeLabelFromId(docTypeId),
        customer_name: String(selectedCustomer?.name ?? ""),
        customer_number: String(selectedCustomer?.number ?? ""),
        customer_address: String(selectedCustomer?.address ?? ""),
        customer_province: "Huánuco",
        customer_district: "Pillco Marca",
        seller_name: "ADMINISTRADOR",
        items: items.map((i) => ({
          code: i.itemId ? String(i.itemId) : undefined,
          description: i.product,
          quantity: i.quantity,
          unit: i.unit || "NIU",
          unit_price: i.unitPrice,
          total: round2(i.quantity * i.unitPrice),
        })),
        total: grandTotal,
        total_taxed: round2(totals.value),
        total_igv: igv,
        payment_method: "Efectivo",
        payment_condition: paymentCondition,
        date_of_issue: dateIssue,
        date_of_due: dateIssue,
        plate: plate || undefined,
      }),
    [
      docTypeId,
      previewNumber,
      selectedCustomer,
      items,
      grandTotal,
      totals.value,
      igv,
      paymentCondition,
      dateIssue,
      plate,
    ]
  );

  const openPreview = () => {
    if (!selectedCustomer) {
      alert("Selecciona un cliente");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <div className="ify-page">
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
          <CustomerSearchField
            selected={selectedCustomer}
            onSelect={setSelectedCustomer}
            onNew={() => setCustomerModalOpen(true)}
          />
        </Field>
        <div className="mt-3">
          <Field label="Buscar productos o servicios">
            <div className="relative">
              <input
                type="text"
                className="ify-input"
                placeholder="Nombre, código o código de barras (mayúsculas o minúsculas)..."
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
                        onClick={() => addProductFromApi(p)}
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
          <button type="button" className="ify-btn-outline" onClick={() => setProductModalOpen(true)}>
            <i className="bi bi-file-earmark-plus" /> Crear producto
          </button>
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

      {/* Tabla de ítems + resumen y pagos */}
      <div className="doc-form-section">
        <div className="doc-form-table-wrap">
          <table className="doc-form-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th style={{ minWidth: 260 }}>Productos o Servicios</th>
                <th>Unidad</th>
                <th>Cantidad</th>
                <th>Valor U.</th>
                <th>Precio U.</th>
                <th>Valor Total</th>
                <th>Precio Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="doc-form-empty">No hay productos agregados — busca o crea un producto arriba</div>
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="col-num">{idx + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="ify-input"
                        placeholder="Producto o servicio"
                        value={item.product}
                        onChange={(e) => updateItem(item.id, { product: e.target.value })}
                      />
                      <div className="doc-form-item-actions mt-1">
                        <button type="button" onClick={() => setDetailItem(item)}>
                          Ver detalle
                        </button>
                        <button type="button" className="danger" onClick={() => removeItem(item.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="ify-input input-sm"
                        value={item.unit}
                        onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ify-input input-sm"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, { quantity: Number(e.target.value) || 1 })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ify-input input-sm"
                        step="0.01"
                        value={round2(item.unitValue)}
                        onChange={(e) => updateItem(item.id, { unitValue: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="ify-input input-sm"
                        step="0.01"
                        value={round2(item.unitPrice)}
                        onChange={(e) => updateItem(item.id, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="col-total">{round2(item.quantity * item.unitValue).toFixed(2)}</td>
                    <td className="col-total">{round2(item.quantity * item.unitPrice).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {items.length > 0 && (
          <div className="doc-form-bottom">
            <div>
              <table className="doc-form-payments-table">
                <thead>
                  <tr>
                    <th>Destino</th>
                    <th>Referencia</th>
                    <th>Glosa</th>
                    <th style={{ width: 120 }}>Monto</th>
                    <th style={{ width: 36 }} />
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <select
                          className="ify-select"
                          value={p.destination}
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, destination: e.target.value } : x))
                            )
                          }
                        >
                          {cashBoxes.map((c) => (
                            <option key={String(c.id)} value={String(c.description)}>
                              {String(c.description)}
                            </option>
                          ))}
                          {!cashBoxes.length && (
                            <option value={defaultDestination}>{defaultDestination}</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <input
                          className="ify-input"
                          value={p.reference}
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, reference: e.target.value } : x))
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="ify-input"
                          value={p.gloss}
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, gloss: e.target.value } : x))
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="ify-input"
                          step="0.01"
                          value={p.amount}
                          onChange={(e) =>
                            setPayments((prev) =>
                              prev.map((x) => (x.id === p.id ? { ...x, amount: Number(e.target.value) } : x))
                            )
                          }
                        />
                      </td>
                      <td>
                        {payments.length > 1 ? (
                          <button
                            type="button"
                            className="ify-btn-ghost px-2 py-1 text-danger"
                            onClick={() => setPayments((prev) => prev.filter((x) => x.id !== p.id))}
                          >
                            <i className="bi bi-trash" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="ify-link mt-2 text-xs"
                onClick={() =>
                  setPayments((prev) => [
                    ...prev,
                    { id: Date.now(), destination: defaultDestination, reference: "", gloss: "", amount: 0 },
                  ])
                }
              >
                + Agregar pago
              </button>
            </div>

            <div className="doc-form-summary">
              <div className="doc-form-summary-row">
                <label>
                  Descuento monto
                  <i className="bi bi-question-circle text-[var(--muted-light)]" title="Descuento global" />
                </label>
                <input
                  type="number"
                  className="ify-input"
                  step="0.01"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                />
              </div>
              <div className="doc-form-summary-row">
                <span>Op. Gravadas</span>
                <strong>S/ {round2(totals.value).toFixed(2)}</strong>
              </div>
              <div className="doc-form-summary-row">
                <span>IGV (18%)</span>
                <strong>S/ {igv.toFixed(2)}</strong>
              </div>
              <div className="doc-form-summary-row">
                <label>
                  <input
                    type="checkbox"
                    checked={useOtherCharges}
                    onChange={(e) => setUseOtherCharges(e.target.checked)}
                  />
                  Otros cargos
                </label>
                <input
                  type="number"
                  className="ify-input"
                  step="0.01"
                  min={0}
                  disabled={!useOtherCharges}
                  value={otherCharges}
                  onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                />
              </div>
              <div className="doc-form-summary-row grand">
                <span>Total a pagar</span>
                <strong>S/ {grandTotal.toFixed(2)}</strong>
              </div>
              <div className="doc-form-summary-row">
                <span>Condición de pago</span>
                <select
                  className="ify-select"
                  style={{ width: "auto", minWidth: 120 }}
                  value={paymentCondition}
                  onChange={(e) => setPaymentCondition(e.target.value)}
                >
                  <option value="Contado">Contado</option>
                  <option value="Crédito">Crédito</option>
                </select>
              </div>
              <div className="doc-form-summary-row">
                <span>Pagado</span>
                <strong>S/ {payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Acciones finales */}
      <div className="doc-form-actions">
        <button type="button" className="ify-btn-preview" onClick={openPreview}>
          <i className="bi bi-eye" /> Vista Previa
        </button>
        <button type="button" className="ify-btn-ghost px-5" onClick={() => router.push("/documents")}>
          Cancelar
        </button>
        <button type="button" className="ify-btn-primary px-6" onClick={handleSave} disabled={saving}>
          {saving ? "Generando..." : "Generar"}
        </button>
      </div>

      <CustomerModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaved={(c) => {
          setSelectedCustomer(c);
        }}
      />

      <ItemEditModal
        open={productModalOpen}
        editId={null}
        onClose={() => setProductModalOpen(false)}
        onSaved={(created) => {
          if (created) addProductFromApi(created);
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
            <label key={String(p.id)} className="flex cursor-pointer items-center gap-2 border-b px-2 py-2 text-sm">
              <input
                type="checkbox"
                checked={multiPick.includes(Number(p.id))}
                onChange={(e) => {
                  const id = Number(p.id);
                  setMultiPick((prev) => e.target.checked ? [...prev, id] : prev.filter((x) => x !== id));
                }}
              />
              <ProductSuggestItem product={p} />
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

      <Modal
        open={previewOpen}
        title={`Vista previa — ${docTypeLabelFromId(docTypeId)}`}
        size="xl"
        onClose={() => setPreviewOpen(false)}
      >
        <div className="max-h-[70vh] overflow-auto rounded border border-[var(--border-light)] bg-white p-2">
          <DocumentPrintTemplate key={`${docTypeId}-${previewNumber}`} receipt={previewReceipt} />
        </div>
      </Modal>

      <Modal open={!!detailItem} title="Detalle del ítem" onClose={() => setDetailItem(null)}>
        {detailItem ? (
          <div className="space-y-2 text-sm">
            <p><strong>Producto:</strong> {detailItem.product}</p>
            <p><strong>Unidad:</strong> {detailItem.unit}</p>
            <p><strong>Cantidad:</strong> {detailItem.quantity}</p>
            <p><strong>Valor unitario:</strong> S/ {round2(detailItem.unitValue).toFixed(2)}</p>
            <p><strong>Precio unitario:</strong> S/ {round2(detailItem.unitPrice).toFixed(2)}</p>
            <p><strong>Total:</strong> S/ {round2(detailItem.quantity * detailItem.unitPrice).toFixed(2)}</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
