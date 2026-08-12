"use client";

type LineItem = { description: string; quantity: string; unit_price: string };

export function LineItemsEditor({
  items,
  onChange,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Ítems</p>
      <div className="space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 rounded border border-[var(--border)] p-2 sm:grid-cols-[1fr_80px_100px_32px]">
            <input
              className="ify-input text-xs"
              placeholder="Descripción"
              value={it.description}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], description: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="ify-input text-xs"
              type="number"
              placeholder="Cant."
              value={it.quantity}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], quantity: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="ify-input text-xs"
              type="number"
              placeholder="P. unit."
              value={it.unit_price}
              onChange={(e) => {
                const next = [...items];
                next[idx] = { ...next[idx], unit_price: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="ify-btn-ghost text-red-600"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              title="Quitar línea"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="ify-btn-outline mt-2 text-xs"
        onClick={() => onChange([...items, { description: "", quantity: "1", unit_price: "0" }])}
      >
        <i className="bi bi-plus" /> Agregar ítem
      </button>
    </div>
  );
}

export function mapApiItems(items: Record<string, unknown>[] | undefined) {
  if (!items?.length) return [{ description: "", quantity: "1", unit_price: "0" }];
  return items.map((it) => ({
    description: String(it.description ?? ""),
    quantity: String(it.quantity ?? 1),
    unit_price: String(it.unit_price ?? 0),
  }));
}

export function serializeLineItems(items: { description: string; quantity: string; unit_price: string }[]) {
  return items.map((it) => ({
    description: it.description,
    quantity: Number(it.quantity || 1),
    unit_price: Number(it.unit_price || 0),
  }));
}
