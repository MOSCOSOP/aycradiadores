"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { Modal } from "@/components/ui/Modal";
import { PosCheckoutModal } from "@/components/pos/PosCheckoutModal";
import { PosSuccessModal } from "@/components/pos/PosSuccessModal";
import type { ReceiptData } from "@/components/documents/DocumentPrintTemplate";
import { mergeCategoriesList } from "@/lib/default-categories";
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
  const [customerModal, setCustomerModal] = useState(false);
  const [plate, setPlate] = useState("");
  const [currencyPen, setCurrencyPen] = useState(true);
  const [previewItem, setPreviewItem] = useState<Record<string, unknown> | null>(null);
  const [page, setPage] = useState(1);
  const [checkoutMode, setCheckoutMode] = useState<null | "pay" | "credit">(null);
  const [successReceipt, setSuccessReceipt] = useState<ReceiptData | null>(null);

  const reloadCustomers = () =>
    api.customers.records({ page: 1, limit: 200 }).then((cust) => {
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
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={barcodeMode} onChange={(e) => setBarcodeMode(e.target.checked)} />
          Buscar con escáner de código de barra
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs">
            T/C
            <input className="ify-input w-20 py-1 text-xs" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
          </label>
          <span className="text-xs font-semibold text-[var(--primary)]">ADMINISTRADOR</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="pos-panel border-b px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <select
                  className="ify-select w-full text-xs"
                  value={selectedCustomerNumber}
                  onChange={(e) => setSelectedCustomerNumber(e.target.value)}
                >
                  <option value={DEFAULT_CUSTOMER_NUMBER}>99999999 - Clientes - Varios</option>
                  {customers
                    .filter((c) => String(c.number) !== DEFAULT_CUSTOMER_NUMBER)
                    .map((c) => (
                      <option key={String(c.number)} value={String(c.number)}>
                        {String(c.number)} - {String(c.name)}
                      </option>
                    ))}
                </select>
              </div>
              <button type="button" className="ify-btn-primary px-2 py-1 text-xs" onClick={() => setCustomerModal(true)}>
                <i className="bi bi-plus-lg" />
              </button>
              <input
                className="ify-input max-w-[140px] text-xs uppercase"
                placeholder="N° placa"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
            </div>
            <div className="mb-2 flex gap-2">
              <input
                className="ify-input flex-1 text-sm"
                placeholder={barcodeMode ? "Escanee código de barra..." : "Buscar productos"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              <button type="button" className="ify-btn-primary px-4" onClick={() => cart.length && setCheckoutMode("pay")} disabled={!cart.length}>
                Pagar S/ {displayTotal.toFixed(2)}
              </button>
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

        <div className="pos-panel flex w-full flex-col border-t lg:w-[300px] lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-1 p-2">
            <button type="button" className="bg-[var(--primary)] py-3 text-xs font-bold text-white" disabled={!cart.length} onClick={() => setCheckoutMode("pay")}>PAGAR</button>
            <button type="button" className="bg-[#2563eb] py-3 text-xs font-bold text-white" disabled={!cart.length} onClick={() => setCheckoutMode("credit")}>CRÉDITO</button>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Carrito vacío</p>
            ) : (
              cart.map((c) => (
                <div key={c.id} className="pos-cart-item mb-2 rounded p-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{c.description}</span>
                    <button type="button" className="text-red-400" onClick={() => setCart((p) => p.filter((x) => x.id !== c.id))}><i className="bi bi-trash" /></button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button type="button" className="pos-page-btn rounded px-1.5" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>-</button>
                      <span>{c.quantity}</span>
                      <button type="button" className="pos-page-btn rounded px-1.5" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
                    </div>
                    <strong className="text-[var(--primary)]">S/ {(c.quantity * c.sale_unit_price).toFixed(2)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t p-3 text-center text-lg font-bold text-[var(--primary)]">
            TOTAL S/ {displayTotal.toFixed(2)}
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
          if (savedNumber) setSelectedCustomerNumber(savedNumber);
          else if (match) setSelectedCustomerNumber(String(match.number));
          setCustomerModal(false);
        }}
      />

      <Modal open={!!previewItem} title="Vista rápida" onClose={() => setPreviewItem(null)}>
        {previewItem ? <p className="text-sm">{String(previewItem.description)}</p> : null}
      </Modal>
    </div>
  );
}
