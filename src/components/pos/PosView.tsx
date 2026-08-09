"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { Modal } from "@/components/ui/Modal";
import { PosCheckoutModal } from "@/components/pos/PosCheckoutModal";
import { PosSuccessModal } from "@/components/pos/PosSuccessModal";
import type { ReceiptData } from "@/components/documents/DocumentPrintTemplate";
import { mergeCategoriesList } from "@/lib/default-categories";
import { splitIgv } from "@/lib/tax";
import { api } from "@/lib/api/client";

type CartItem = {
  id: number;
  description: string;
  sale_unit_price: number;
  quantity: number;
  unit_type_id: string;
  internal_id?: string;
  stock?: number;
};

const PAGE_SIZE = 30;
const DEFAULT_CUSTOMER_NUMBER = "99999999";

function pickDefaultCustomer(list: Record<string, unknown>[]) {
  return (
    list.find((c) => String(c.number) === DEFAULT_CUSTOMER_NUMBER) ??
    list.find((c) => String(c.name).toLowerCase().includes("varios")) ??
    null
  );
}

function productImage(url?: string | null) {
  if (!url) return "/images/logo-client.png";
  if (String(url).startsWith("http")) return String(url);
  return String(url).startsWith("/") ? String(url) : `/${url}`;
}

export function PosView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("3.408");
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [selectedCustomerNumber, setSelectedCustomerNumber] = useState<string>(DEFAULT_CUSTOMER_NUMBER);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerRemote, setCustomerRemote] = useState<Record<string, unknown>[]>([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [plate, setPlate] = useState("");
  const [currencyPen, setCurrencyPen] = useState(true);
  const [previewItem, setPreviewItem] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [checkoutMode, setCheckoutMode] = useState<null | "pay" | "credit">(null);
  const [successReceipt, setSuccessReceipt] = useState<ReceiptData | null>(null);

  const reloadCustomers = () =>
    api.customers.records({ page: 1, limit: 500 }).then((cust) => {
      const list = cust.data ?? [];
      setCustomers(list);
      return list;
    });

  useEffect(() => {
    Promise.all([api.pos.tables(), reloadCustomers()])
      .then(([pos, list]) => {
        setData(pos);
        const def = pickDefaultCustomer(list);
        if (def) setSelectedCustomerNumber(String(def.number));
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.number) === selectedCustomerNumber) ?? null,
    [customers, selectedCustomerNumber]
  );

  const defaultCustomerRow = useMemo(
    () => ({ number: DEFAULT_CUSTOMER_NUMBER, name: "Clientes - Varios", id: 0 }),
    []
  );

  const customerSuggestions = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const pool = [
      defaultCustomerRow,
      ...customers.filter((c) => String(c.number) !== DEFAULT_CUSTOMER_NUMBER),
    ];
    const source = customerRemote.length && q.length >= 2 ? customerRemote : pool;
    if (!q) return source.slice(0, 10);
    return source
      .filter(
        (c) =>
          String(c.name ?? "").toLowerCase().includes(q) ||
          String(c.number ?? "").includes(q)
      )
      .slice(0, 12);
  }, [customers, customerQuery, customerRemote, defaultCustomerRow]);

  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerRemote([]);
      return;
    }
    const t = setTimeout(() => {
      api.customers.search(q, 15).then((r) => setCustomerRemote(r.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  const selectCustomer = (c: Record<string, unknown>) => {
    setSelectedCustomerNumber(String(c.number));
    setCustomerQuery("");
    setCustomerSearchOpen(false);
    setCustomerRemote([]);
  };

  const customerInputDisplay =
    customerSearchOpen || customerQuery
      ? customerQuery
      : `${selectedCustomer?.number ?? DEFAULT_CUSTOMER_NUMBER} - ${selectedCustomer?.name ?? "Clientes - Varios"}`;

  const allItems = (data?.items as Record<string, unknown>[]) ?? [];
  const rawCategories = (data?.categories as { id: number; name: string }[]) ?? [];
  const categories = useMemo(() => mergeCategoriesList(rawCategories), [rawCategories]);
  const series = (data?.series as { number: string; document_type_id: string }[]) ?? [];

  const filteredItems = useMemo(() => {
    const cat = categories.find((c) => c.id === categoryId);
    return allItems.filter((i) => {
      const matchCat =
        !categoryId ||
        Number(i.category_id) === categoryId ||
        (cat && String(i.category_name ?? "").toUpperCase() === cat.name.toUpperCase());
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        String(i.description ?? "").toLowerCase().includes(q) ||
        String(i.internal_id ?? "").toLowerCase().includes(q) ||
        String(i.barcode ?? "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [allItems, categoryId, search, categories]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId]);

  const findByCode = (code: string) => {
    const q = code.trim().toLowerCase();
    if (!q) return null;
    return allItems.find(
      (i) =>
        String(i.barcode ?? "").toLowerCase() === q ||
        String(i.internal_id ?? "").toLowerCase() === q
    ) ?? null;
  };

  const addToCart = (item: Record<string, unknown>) => {
    const id = Number(item.id);
    setCart((prev) => {
      const existing = prev.find((c) => c.id === id);
      if (existing) {
        return prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          id,
          description: String(item.description),
          sale_unit_price: Number(item.sale_unit_price),
          quantity: 1,
          unit_type_id: String(item.unit_type_id || "NIU"),
          internal_id: String(item.internal_id || ""),
          stock: Number(item.stock),
        },
      ];
    });
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if (barcodeMode) {
      const found = findByCode(search);
      if (found) {
        addToCart(found);
        setSearch("");
      } else {
        alert("Producto no encontrado para el código escaneado");
      }
      return;
    }
    if (pageItems[0]) addToCart(pageItems[0]);
  };

  const rate = Number(exchangeRate) || 1;
  const totalPen = cart.reduce((s, i) => s + i.quantity * i.sale_unit_price, 0);
  const displayTotal = currencyPen ? totalPen : totalPen / rate;
  const { taxed, igv } = useMemo(() => splitIgv(totalPen), [totalPen]);

  const confirmCheckout = async (extra: Record<string, unknown>) => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      const res = await api.pos.sale({
        customer_id: selectedCustomer?.id,
        customer_number: selectedCustomer?.number ?? selectedCustomerNumber,
        customer_name: selectedCustomer?.name ?? "Clientes - Varios",
        plate,
        currency_type_id: currencyPen ? "PEN" : "USD",
        exchange_rate: rate,
        items: cart,
        ...extra,
      }) as { receipt?: ReceiptData };
      if (res.receipt) {
        setSuccessReceipt(res.receipt);
        setCheckoutMode(null);
        setCart([]);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error en venta");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-5 text-[var(--muted)]">Cargando POS...</div>;

  if (successReceipt) {
    return (
      <PosSuccessModal
        receipt={successReceipt}
        onNewSale={() => {
          setSuccessReceipt(null);
          reloadCustomers();
        }}
      />
    );
  }

  return (
    <div className="pos-shell flex h-[calc(100dvh-52px)] flex-col">
      <div className="pos-panel flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <label className="flex items-center gap-2 text-xs text-[var(--foreground)]">
          <input type="checkbox" checked={barcodeMode} onChange={(e) => setBarcodeMode(e.target.checked)} />
          Buscar con escáner de código de barra
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="pos-panel border-b px-4 py-3">
            <div className="mb-2 flex gap-2">
              <input
                className="ify-input flex-1 text-sm"
                placeholder={barcodeMode ? "Escanee código de barra..." : "Buscar productos"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              <button type="button" className={`pos-cat-btn rounded px-2 py-1 text-[11px] ${!categoryId ? "active" : ""}`} onClick={() => setCategoryId(null)}>Todos</button>
              {categories.map((c) => (
                <button key={`${c.id}-${c.name}`} type="button" className={`pos-cat-btn rounded px-2 py-1 text-[11px] ${categoryId === c.id ? "active" : ""}`} onClick={() => setCategoryId(c.id)}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {pageItems.map((item) => (
                <div key={String(item.id)} className="pos-product-card overflow-hidden rounded">
                  <div className="pos-product-img relative flex h-24 items-center justify-center p-2">
                    <Image src={productImage(String(item.image_url_small || item.image_url || ""))} alt={String(item.description)} width={80} height={80} className="max-h-20 w-auto object-contain" unoptimized />
                  </div>
                  <div className="border-t p-2">
                    <p className="line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-tight">{String(item.description)}</p>
                    <p className="text-[10px] text-[var(--muted)]">{String(item.unit_type_id || "UND")} {String(item.internal_id || "")}</p>
                    <p className="text-[10px] text-[var(--muted)]">Stock: {Number(item.stock)}</p>
                    <p className="my-1 text-sm font-bold text-[var(--primary)]">S/ {Number(item.sale_unit_price).toFixed(2)}</p>
                    <button type="button" className="ify-btn-primary w-full py-1 text-[10px]" onClick={() => addToCart(item)}>Agregar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pos-panel border-t px-4 py-2 text-center">
            <div className="inline-flex items-center gap-2 text-xs">
              <span className="text-[var(--muted)]">Total {filteredItems.length}</span>
              <button type="button" className="pos-page-btn rounded px-2 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" className={`pos-page-btn rounded px-2 py-1 ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              {totalPages > 7 ? <span className="text-[var(--muted)]">...</span> : null}
              <button type="button" className="pos-page-btn rounded px-2 py-1 disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            </div>
          </div>
        </div>

        <div className="pos-cart-sidebar pos-panel flex w-full min-h-0 flex-col border-t lg:w-[340px] lg:shrink-0 lg:border-l lg:border-t-0">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <span className="text-xs font-bold">T/C</span>
            <input
              className="ify-input w-16 py-1 text-center text-xs"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
            <span className="ml-auto text-xs font-bold uppercase text-[var(--primary)]">Administrador</span>
          </div>

          <div className="shrink-0 border-b border-[var(--border)] p-2">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Cliente</label>
            <div className="flex items-start gap-1">
              <div className="relative min-w-0 flex-1">
                <i className="bi bi-search pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className="ify-input py-1 pl-7 text-xs"
                  placeholder="Buscar DNI, RUC o nombre..."
                  value={customerInputDisplay}
                  onChange={(e) => {
                    setCustomerQuery(e.target.value);
                    setCustomerSearchOpen(true);
                  }}
                  onFocus={() => setCustomerSearchOpen(true)}
                  onBlur={() => window.setTimeout(() => setCustomerSearchOpen(false), 180)}
                />
                {customerSearchOpen && (customerQuery || customerSuggestions.length > 0) && (
                  <ul className="ify-autocomplete-list absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-md shadow-lg">
                    {customerSuggestions.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-[var(--muted)]">Sin coincidencias</li>
                    ) : (
                      customerSuggestions.map((c) => (
                        <li key={String(c.number)}>
                          <button
                            type="button"
                            className="ify-autocomplete-item text-xs"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectCustomer(c)}
                          >
                            <span className="font-semibold text-[var(--primary)]">{String(c.number)}</span>
                            {" — "}
                            {String(c.name)}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
              <button type="button" className="pos-icon-btn" title="Nuevo cliente" onClick={() => setCustomerModal(true)}>
                <i className="bi bi-plus-lg" />
              </button>
              <button type="button" className="pos-icon-btn danger" title="Vaciar carrito" disabled={!cart.length} onClick={() => setCart([])}>
                <i className="bi bi-trash" />
              </button>
              <button
                type="button"
                className="pos-icon-btn"
                title={currencyPen ? "Cambiar a USD" : "Cambiar a PEN"}
                onClick={() => setCurrencyPen((v) => !v)}
              >
                {currencyPen ? "S/" : "$"}
              </button>
            </div>
          </div>

          <input
            className="ify-input mx-2 mt-2 max-w-[calc(100%-1rem)] text-xs uppercase"
            placeholder="N° placa"
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
          />

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--muted)]">Carrito vacío — agregue productos</p>
            ) : (
              cart.map((c) => (
                <div key={c.id} className="pos-cart-line border-b border-[var(--border)] py-2">
                  <p className="text-[11px] font-bold leading-snug">{c.description}</p>
                  <div className="mt-1.5 grid grid-cols-[2.5rem_1fr_3.5rem_3.5rem] items-center gap-1 text-[11px]">
                    <span className="text-[var(--muted)]">{c.unit_type_id || "UND"}</span>
                    <div className="flex items-center justify-center gap-1">
                      <button type="button" className="pos-cart-qty-btn" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>-</button>
                      <span className="min-w-[1.25rem] text-center font-bold">{c.quantity}</span>
                      <button type="button" className="pos-cart-qty-btn" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
                    </div>
                    <span className="text-right text-[var(--primary)]">{c.sale_unit_price.toFixed(2)}</span>
                    <span className="text-right font-bold text-[var(--primary)]">{(c.quantity * c.sale_unit_price).toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="shrink-0 space-y-1 border-t border-[var(--border)] px-3 py-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">OP. GRAVADAS</span>
              <span className="font-semibold text-[var(--primary)]">S/ {taxed.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">IGV 18%</span>
              <span className="font-semibold text-[var(--primary)]">S/ {igv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 text-sm font-bold">
              <span>TOTAL</span>
              <span className="text-[var(--primary)]">S/ {displayTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="shrink-0 space-y-2 border-t border-[var(--border)] p-3">
            <button
              type="button"
              className="pos-pay-main"
              disabled={!cart.length}
              onClick={() => setCheckoutMode("pay")}
            >
              PAGAR S/ {displayTotal.toFixed(2)} →
            </button>
            <button
              type="button"
              className="pos-credit-btn w-full"
              disabled={!cart.length}
              onClick={() => setCheckoutMode("credit")}
            >
              CRÉDITO
            </button>
          </div>
        </div>
      </div>

      <PosCheckoutModal
        open={checkoutMode !== null}
        mode={checkoutMode === "credit" ? "credit" : "pay"}
        cart={cart}
        total={totalPen}
        series={series}
        processing={processing}
        onClose={() => setCheckoutMode(null)}
        onConfirm={confirmCheckout}
      />

      <CustomerModal
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        onSaved={async (c) => {
          const savedNumber = String(c.number ?? "").trim();
          const list = await reloadCustomers();
          const match = list.find((x) => String(x.number) === savedNumber);
          if (savedNumber) {
            setSelectedCustomerNumber(savedNumber);
            setCustomerQuery("");
          } else if (match) setSelectedCustomerNumber(String(match.number));
          setCustomerModal(false);
        }}
      />

      <Modal open={!!previewItem} title="Vista rápida" onClose={() => setPreviewItem(null)}>
        {previewItem ? <p className="text-sm">{String(previewItem.description)}</p> : null}
      </Modal>
    </div>
  );
}
