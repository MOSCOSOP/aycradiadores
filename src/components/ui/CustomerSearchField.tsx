"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

type CustomerSearchFieldProps = {
  selected: Record<string, unknown> | null;
  onSelect: (customer: Record<string, unknown>) => void;
  onNew?: () => void;
  placeholder?: string;
};

export function CustomerSearchField({
  selected,
  onSelect,
  onNew,
  placeholder = "Buscar DNI, RUC o nombre...",
}: CustomerSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<Record<string, unknown>[]>([]);
  const [remote, setRemote] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.customers.records({ page: 1, limit: 500 }).then((r) => setPool(r.data ?? []));
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setRemote([]);
      return;
    }
    const t = setTimeout(() => {
      api.customers.search(q, 15).then((r) => setRemote(r.data ?? []));
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = remote.length && q.length >= 1 ? remote : pool;
    if (!q) return source.slice(0, 12);
    return source
      .filter(
        (c) =>
          String(c.name ?? "").toLowerCase().includes(q) ||
          String(c.number ?? "").includes(q)
      )
      .slice(0, 12);
  }, [pool, query, remote]);

  const displayValue =
    open || query
      ? query
      : selected
        ? `${selected.number} - ${selected.name}`
        : "";

  const pick = (c: Record<string, unknown>) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
    setRemote([]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <i className="bi bi-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            className="ify-input pl-8"
            placeholder={selected ? `${selected.name} (${selected.number})` : placeholder}
            value={displayValue}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          />
        </div>
        {onNew ? (
          <button type="button" className="ify-link whitespace-nowrap" onClick={onNew}>
            [+ Nuevo]
          </button>
        ) : null}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md shadow-lg">
          {suggestions.map((c) => (
            <li key={String(c.id ?? c.number)}>
              <button
                type="button"
                className="ify-autocomplete-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(c)}
              >
                <span className="font-semibold text-[var(--primary)]">{String(c.number)}</span>
                {" — "}
                {String(c.name)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
