"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { Modal } from "@/components/ui/Modal";
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

function productImage(url?: string | null) {
  if (!url) return "/images/logo-client.png";
  if (String(url).startsWith("http")) return String(url);
  return String(url).startsWith("/") ? String(url) : `/${url}`;
}

export function PosView() {
  const router = useRouter();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [exchangeRate, setExchangeRate] = useState("3.408");
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, unknown> | null>(null);
  const [customerModal, setCustomerModal] = useState(false);
  const [plate, setPlate] = useState("");
  const [currencyPen, setCurrencyPen] = useState(true);
  const [previewItem, setPreviewItem] = useState<Record<string, unknown> | null>(null);
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    Promise.all([api.pos.tables(), api.customers.records({ page: 1, limit: 50 })])
      .then(([pos, cust]) => {
        setData(pos);
        const list = cust.data ?? [];
        setCustomers(list);
        setSelectedCustomer(list[0] ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCustomer) return;
    const vehicles = (selectedCustomer.vehicles as { plate?: string }[] | undefined) ?? [];
    if (vehicles.length === 1 && vehicles[0]?.plate && !plate) {
      setPlate(String(vehicles[0].plate));
    }
  }, [selectedCustomer, plate]);

  const allItems = (data?.items as Record<string, unknown>[]) ?? [];
  const categories = (data?.categories as { id: number; name: string }[]) ?? [];

  const items = useMemo(() => allItems.filter((i) => {
    const matchCat = !categoryId || Number(i.category_id) === categoryId;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      String(i.description ?? "").toLowerCase().includes(q) ||
      String(i.internal_id ?? "").toLowerCase().includes(q) ||
      String(i.barcode ?? "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  }), [allItems, categoryId, search]);

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
    if (items[0]) addToCart(items[0]);
  };

  const rate = Number(exchangeRate) || 1;
  const totalPen = cart.reduce((s, i) => s + i.quantity * i.sale_unit_price, 0);
  const displayTotal = currencyPen ? totalPen : totalPen / rate;
  const currencyLabel = currencyPen ? "S/" : "$";

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    try {
      await api.pos.sale({
        customer_id: selectedCustomer?.id,
        plate,
        currency_type_id: currencyPen ? "PEN" : "USD",
        exchange_rate: rate,
        items: cart,
      });
      setCart([]);
      router.push("/documents");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error en venta");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-5 text-[var(--muted)]">Cargando POS...</div>;

  return (
    <div className="flex h-[calc(100vh-52px)] flex-col bg-[#f4f6f8]">
      <div className="flex flex-wrap items-center gap-3 border-b bg-white px-4 py-2">
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
          <div className="border-b bg-white px-4 py-3">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <select
                  className="ify-select w-full text-xs"
                  value={String(selectedCustomer?.id ?? "")}
                  onChange={(e) => {
                    const c = customers.find((x) => String(x.id) === e.target.value);
                    setSelectedCustomer(c ?? null);
                  }}
                >
                  <option value="">— Consumidor final —</option>
                  {customers.map((c) => (
                    <option key={String(c.id)} value={String(c.id)}>
                      {String(c.number)} - {String(c.name)}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="ify-btn-primary px-2 py-1 text-xs" onClick={() => setCustomerModal(true)}>
                <i className="bi bi-plus-lg" />
              </button>
              <button type="button" className="ify-btn-outline px-2 py-1 text-xs" onClick={() => setSelectedCustomer(null)} title="Limpiar cliente">
                <i className="bi bi-trash" />
              </button>
              <button
                type="button"
                className={`ify-btn-outline px-3 py-1 text-xs ${currencyPen ? "!bg-[var(--primary)] !text-white" : ""}`}
                onClick={() => setCurrencyPen(true)}
              >
                S/
              </button>
              <button
                type="button"
                className={`ify-btn-outline px-3 py-1 text-xs ${!currencyPen ? "!bg-[var(--primary)] !text-white" : ""}`}
                onClick={() => setCurrencyPen(false)}
              >
                $
              </button>
            </div>
            <div className="mb-2 flex gap-2">
              <input
                className="ify-input flex-1 text-sm"
                placeholder={barcodeMode ? "Escanee código de barra..." : "Buscar productos"}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKey}
              />
              <Link href="/items" className="ify-btn-primary px-3">
                <i className="bi bi-plus-lg" />
              </Link>
            </div>
            <div className="flex gap-2">
              <input
                className="ify-input max-w-[140px] text-xs uppercase"
                placeholder="N° placa"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
              />
              <div className="flex flex-wrap gap-1">
                <button type="button" className={`rounded px-2 py-1 text-[11px] ${!categoryId ? "bg-[var(--primary)] text-white" : "bg-[var(--border-light)]"}`} onClick={() => setCategoryId(null)}>Todos</button>
                {categories.slice(0, 8).map((c) => (
                  <button key={c.id} type="button" className={`rounded px-2 py-1 text-[11px] ${categoryId === c.id ? "bg-[var(--primary)] text-white" : "bg-[var(--border-light)]"}`} onClick={() => setCategoryId(c.id)}>{c.name}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {items.map((item) => (
                <div key={String(item.id)} className="ify-card overflow-hidden bg-white">
                  <div className="relative flex h-24 items-center justify-center bg-[#fafafa] p-2">
                    <Image src={productImage(String(item.image_url_small || item.image_url || ""))} alt={String(item.description)} width={80} height={80} className="max-h-20 w-auto object-contain" unoptimized />
                    <Link href={`/items?edit=${item.id}`} className="absolute right-1 top-1 rounded bg-white/90 p-1 text-[var(--primary)] shadow-sm" title="Editar">
                      <i className="bi bi-pencil-square text-sm" />
                    </Link>
                  </div>
                  <div className="border-t p-2">
                    <p className="line-clamp-2 min-h-[2rem] text-[11px] font-semibold leading-tight">{String(item.description)}</p>
                    <p className="text-[10px] text-[var(--muted)]">{String(item.unit_type_id || "UND")} {String(item.internal_id || "")}</p>
                    <p className="text-[10px] text-[var(--muted)]">Stock: {Number(item.stock)}</p>
                    <p className="my-1 text-sm font-bold text-[var(--primary)]">S/ {Number(item.sale_unit_price).toFixed(2)}</p>
                    <div className="flex items-center justify-between gap-1 border-t pt-1">
                      <button type="button" className="ify-btn-ghost px-1 py-0.5 text-xs" title="Ver" onClick={() => setPreviewItem(item)}>
                        <i className="bi bi-search" />
                      </button>
                      <button type="button" className="ify-btn-ghost px-1 py-0.5 text-xs" title="Detalle" onClick={() => setDetailItem(item)}>
                        <i className="bi bi-list-ul" />
                      </button>
                      <button type="button" className="ify-btn-ghost px-1 py-0.5 text-xs text-[var(--primary)]" title="Agregar al carrito" onClick={() => addToCart(item)}>
                        <i className="bi bi-cart-plus" />
                      </button>
                      <Link href={`/items?edit=${item.id}`} className="ify-btn-ghost px-1 py-0.5 text-xs" title="Editar">
                        <i className="bi bi-eye" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col border-t border-[var(--border)] bg-white lg:w-[320px] lg:border-l lg:border-t-0">
          <button type="button" className="w-full bg-[#4a5568] py-4 text-center text-lg font-bold text-white hover:bg-[#374151]" onClick={checkout} disabled={processing || cart.length === 0}>
            {processing ? "Procesando..." : `PAGAR ${currencyLabel} ${displayTotal.toFixed(2)}`}
          </button>
          <div className="flex-1 overflow-auto p-3">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted)]">Carrito vacío</p>
            ) : (
              cart.map((c) => (
                <div key={c.id} className="mb-2 rounded border border-[var(--border-light)] p-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">{c.description}</span>
                    <button type="button" className="text-red-500" onClick={() => setCart((p) => p.filter((x) => x.id !== c.id))}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button type="button" className="rounded border px-1.5" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}>-</button>
                      <span>{c.quantity}</span>
                      <button type="button" className="rounded border px-1.5" onClick={() => setCart((p) => p.map((x) => (x.id === c.id ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
                    </div>
                    <strong>{currencyLabel} {(currencyPen ? c.quantity * c.sale_unit_price : (c.quantity * c.sale_unit_price) / rate).toFixed(2)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CustomerModal
        open={customerModal}
        onClose={() => setCustomerModal(false)}
        onSaved={(c) => {
          setCustomers((prev) => [c, ...prev]);
          setSelectedCustomer(c);
        }}
      />

      <Modal open={!!previewItem} title="Vista rápida" onClose={() => setPreviewItem(null)} footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={() => setPreviewItem(null)}>Cerrar</button>
          {previewItem ? (
            <button type="button" className="ify-btn-primary" onClick={() => { addToCart(previewItem); setPreviewItem(null); }}>Agregar al carrito</button>
          ) : null}
        </>
      }>
        {previewItem ? (
          <div className="grid gap-2 text-sm">
            <p><strong>{String(previewItem.description)}</strong></p>
            <p>Código: {String(previewItem.internal_id || "—")}</p>
            <p>Barra: {String(previewItem.barcode || "—")}</p>
            <p>Stock: {Number(previewItem.stock)}</p>
            <p className="text-lg font-bold text-[var(--primary)]">S/ {Number(previewItem.sale_unit_price).toFixed(2)}</p>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!detailItem} title="Detalle del producto" size="lg" onClose={() => setDetailItem(null)} footer={
        <button type="button" className="ify-btn-ghost" onClick={() => setDetailItem(null)}>Cerrar</button>
      }>
        {detailItem ? (
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div><dt className="text-[var(--muted)]">Descripción</dt><dd>{String(detailItem.description)}</dd></div>
            <div><dt className="text-[var(--muted)]">Código interno</dt><dd>{String(detailItem.internal_id || "—")}</dd></div>
            <div><dt className="text-[var(--muted)]">Código barra</dt><dd>{String(detailItem.barcode || "—")}</dd></div>
            <div><dt className="text-[var(--muted)]">Unidad</dt><dd>{String(detailItem.unit_type_id || "NIU")}</dd></div>
            <div><dt className="text-[var(--muted)]">Stock</dt><dd>{Number(detailItem.stock)}</dd></div>
            <div><dt className="text-[var(--muted)]">Precio venta</dt><dd>S/ {Number(detailItem.sale_unit_price).toFixed(2)}</dd></div>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
