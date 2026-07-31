"use client";

import { useEffect, useMemo, useState } from "react";
import { splitIgv } from "@/lib/tax";

type CartItem = {
  id: number;
  description: string;
  sale_unit_price: number;
  quantity: number;
  unit_type_id: string;
};

type Props = {
  open: boolean;
  mode: "pay" | "credit";
  cart: CartItem[];
  total: number;
  series: { number: string; document_type_id: string }[];
  onClose: () => void;
  onConfirm: (payload: Record<string, unknown>) => void;
  processing: boolean;
};

const DOC_TABS = [
  { key: "factura", label: "FACTURA", type: "01" },
  { key: "boleta", label: "BOLETA", type: "03" },
  { key: "sale_note", label: "N. VENTA", type: "NV" },
  { key: "quotation", label: "COTIZACIÓN", type: "COT" },
] as const;

const PAY_METHODS = [
  { id: "efectivo", label: "Efectivo" },
  { id: "yape", label: "Yape" },
  { id: "transferencia", label: "Transferencia" },
  { id: "contado", label: "Contado" },
];

export function PosCheckoutModal({ open, mode, cart, total, series, onClose, onConfirm, processing }: Props) {
  const [docKind, setDocKind] = useState<(typeof DOC_TABS)[number]["key"]>("boleta");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [amountIn, setAmountIn] = useState(String(total.toFixed(2)));
  const [discount, setDiscount] = useState("0");
  const [creditRows, setCreditRows] = useState([{ amount: total, due_date: new Date().toISOString().slice(0, 10) }]);

  useEffect(() => {
    if (open) {
      setAmountIn(total.toFixed(2));
      setCreditRows([{ amount: total, due_date: new Date().toISOString().slice(0, 10) }]);
    }
  }, [open, total]);

  const { taxed, igv } = useMemo(() => splitIgv(total), [total]);
  const change = Math.max(0, Number(amountIn || 0) - total);
  const assigned = creditRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const pendingCredit = Math.max(0, total - assigned);

  const activeSeries = series.find((s) => {
    if (docKind === "factura") return s.document_type_id === "01";
    if (docKind === "boleta") return s.document_type_id === "03";
    return false;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40">
      <div className="flex min-h-0 flex-1 flex-col bg-[#f4f6f8] lg:flex-row">
        {/* Resumen carrito */}
        <div className="flex w-full flex-col border-r bg-white lg:w-[340px]">
          <div className="border-b p-3 text-sm font-bold">Resumen de venta</div>
          <div className="flex-1 overflow-auto p-3">
            {cart.map((c) => (
              <div key={c.id} className="mb-2 border-b pb-2 text-xs">
                <p className="font-semibold">{c.quantity} {c.description}</p>
                <p className="text-right text-[var(--primary)]">S/ {(c.quantity * c.sale_unit_price).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t p-3 text-xs">
            <div className="flex justify-between"><span>Subtotal gravado</span><span>S/ {taxed.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>IGV 18%</span><span>S/ {igv.toFixed(2)}</span></div>
            <div className="mt-2 flex justify-between bg-[var(--primary)] px-2 py-2 text-base font-bold text-white">
              <span>TOTAL</span><span>S/ {total.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            <button type="button" className="ify-btn-primary py-3 text-xs" disabled={processing} onClick={() => onConfirm(buildPayload())}>
              {processing ? "..." : "PAGAR"}
            </button>
            <button type="button" className="ify-btn-primary py-3 text-xs opacity-90" disabled={processing} onClick={() => onConfirm(buildPayload("credito"))}>
              CRÉDITO
            </button>
            <button type="button" className="rounded bg-red-600 py-3 text-xs font-bold text-white" onClick={onClose}>CANCELAR</button>
          </div>
        </div>

        {/* Panel pago */}
        <div className="flex flex-1 flex-col overflow-auto bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {DOC_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`rounded px-3 py-2 text-xs font-bold ${docKind === t.key ? "bg-[var(--primary)] text-white" : "border"}`}
                onClick={() => setDocKind(t.key)}
              >
                {t.label}
              </button>
            ))}
            {activeSeries ? (
              <select className="ify-select ml-auto w-24 text-xs" defaultValue={activeSeries.number}>
                <option>{activeSeries.number}</option>
              </select>
            ) : null}
          </div>

          {mode === "credit" || docKind === "sale_note" ? (
            <div className="mb-4 rounded border p-3">
              <h3 className="mb-3 text-sm font-bold text-[var(--primary)]">Cuotas de Crédito</h3>
              <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                <label className="ify-label">Total<input className="ify-input mt-1" readOnly value={total.toFixed(2)} /></label>
                <label className="ify-label">Por asignar<input className="ify-input mt-1" readOnly value={pendingCredit.toFixed(2)} /></label>
                <label className="ify-label">Método de pago
                  <select className="ify-select mt-1" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    {PAY_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
                <label className="ify-label">Fecha vencimiento
                  <input type="date" className="ify-input mt-1" value={creditRows[0]?.due_date} onChange={(e) => setCreditRows([{ ...creditRows[0], due_date: e.target.value }])} />
                </label>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th>#</th><th>Monto Cuota</th><th>Fecha</th><th /></tr></thead>
                <tbody>
                  {creditRows.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td>{i + 1}</td>
                      <td><input className="ify-input w-24" type="number" value={r.amount} onChange={(e) => setCreditRows(creditRows.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) } : x))} /></td>
                      <td><input type="date" className="ify-input" value={r.due_date} onChange={(e) => setCreditRows(creditRows.map((x, j) => j === i ? { ...x, due_date: e.target.value } : x))} /></td>
                      <td>Crédito</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" className="mt-2 text-xs text-[var(--primary)]" onClick={() => setCreditRows([...creditRows, { amount: 0, due_date: new Date().toISOString().slice(0, 10) }])}>+ Cuota</button>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--muted)]">Monto a cobrar</p>
              <p className="text-3xl font-bold text-[var(--primary)]">S/ {total.toFixed(2)}</p>
              <label className="mt-3 block text-xs">Ingrese monto
                <input className="ify-input mt-1 text-lg" value={amountIn} onChange={(e) => setAmountIn(e.target.value)} />
              </label>
              <p className="mt-2 text-sm">Vuelto: <strong>S/ {change.toFixed(2)}</strong></p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold">Método de pago</p>
              <div className="flex flex-wrap gap-2">
                {PAY_METHODS.map((m) => (
                  <button key={m.id} type="button" className={`rounded border px-3 py-2 text-xs ${payMethod === m.id ? "border-[var(--primary)] bg-blue-50 text-[var(--primary)]" : ""}`} onClick={() => setPayMethod(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[10, 20, 50, 100].map((b) => (
                  <button key={b} type="button" className="rounded border px-3 py-1 text-xs" onClick={() => setAmountIn(String(b))}>S/{b}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <label className="ify-label">Monto descuento<input className="ify-input mt-1" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label>
          </div>

          <div className="mt-6">
            <button type="button" className="ify-btn-primary px-8 py-3" disabled={processing} onClick={() => onConfirm(buildPayload(mode === "credit" ? "credito" : "contado"))}>
              {processing ? "Procesando..." : "Confirmar pago e imprimir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function buildPayload(condition = "contado") {
    return {
      document_kind: docKind,
      payment_method: payMethod,
      payment_condition: condition,
      credit_installments: condition === "credito" ? creditRows : [],
      amount_paid: Number(amountIn || total),
      discount: Number(discount || 0),
    };
  }
}
