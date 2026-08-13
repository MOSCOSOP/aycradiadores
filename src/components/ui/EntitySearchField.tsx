"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";

export type SearchSelection = {
  id?: string;
  name: string;
  document_number?: string;
};

type CarrierSearchFieldProps = {
  selected: SearchSelection | null;
  onSelect: (item: SearchSelection) => void;
  carriers: Record<string, unknown>[];
  placeholder?: string;
};

export function CarrierSearchField({
  selected,
  onSelect,
  carriers,
  placeholder = "Escriba el nombre o número de documento...",
}: CarrierSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [remote, setRemote] = useState<Record<string, unknown>[]>([]);

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
    const fromCarriers = carriers
      .filter((c) => {
        if (!q) return true;
        const name = String(c.name ?? c.description ?? "").toLowerCase();
        const doc = String(c.document_number ?? "").toLowerCase();
        return name.includes(q) || doc.includes(q);
      })
      .map(
        (c): SearchSelection => ({
          id: String(c.id ?? ""),
          name: String(c.name ?? c.description ?? ""),
          document_number: String(c.document_number ?? ""),
        })
      );

    const fromCustomers = (q.length >= 1 ? remote : [])
      .map(
        (c): SearchSelection => ({
          id: `cust-${c.id}`,
          name: String(c.name ?? ""),
          document_number: String(c.number ?? ""),
        })
      )
      .filter((c) => !fromCarriers.some((x) => x.document_number === c.document_number && c.document_number));

    const merged = [...fromCarriers, ...fromCustomers];
    if (!q) return merged.slice(0, 12);
    return merged.slice(0, 12);
  }, [carriers, query, remote]);

  const displayValue = open || query ? query : selected ? `${selected.document_number ? `${selected.document_number} — ` : ""}${selected.name}` : "";

  const pick = (item: SearchSelection) => {
    onSelect(item);
    setQuery("");
    setOpen(false);
    setRemote([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <i className="bi bi-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          className="ify-input pl-8"
          placeholder={selected ? `${selected.document_number ?? ""} — ${selected.name}` : placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md shadow-lg">
          {suggestions.map((item) => (
            <li key={`${item.id}-${item.document_number}`}>
              <button
                type="button"
                className="ify-autocomplete-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                {item.document_number ? (
                  <>
                    <span className="font-semibold text-[var(--primary)]">{item.document_number}</span>
                    {" — "}
                  </>
                ) : null}
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query.trim().length >= 1 && suggestions.length === 0 && (
        <ul className="ify-autocomplete-list absolute z-20 mt-1 w-full rounded-md shadow-lg">
          <li className="ify-autocomplete-item text-[var(--muted)]">Sin resultados — use [+ Nuevo]</li>
        </ul>
      )}
    </div>
  );
}

type LocalCatalogSearchFieldProps = {
  selected: SearchSelection | null;
  onSelect: (item: SearchSelection) => void;
  rows: Record<string, unknown>[];
  labelKeys?: string[];
  docKey?: string;
  placeholder?: string;
};

export function LocalCatalogSearchField({
  selected,
  onSelect,
  rows,
  labelKeys = ["name", "description", "plate"],
  docKey = "document_number",
  placeholder = "Buscar...",
}: LocalCatalogSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (!q) return true;
        const parts = labelKeys.map((k) => String(r[k] ?? "").toLowerCase());
        parts.push(String(r[docKey] ?? "").toLowerCase());
        return parts.some((p) => p.includes(q));
      })
      .slice(0, 12)
      .map(
        (r): SearchSelection => ({
          id: String(r.id ?? ""),
          name: String(r[labelKeys[0] ?? "name"] ?? r.description ?? r.plate ?? ""),
          document_number: String(r[docKey] ?? r.plate ?? ""),
        })
      );
  }, [rows, query, labelKeys, docKey]);

  const displayValue = open || query ? query : selected ? `${selected.document_number ? `${selected.document_number} — ` : ""}${selected.name}` : "";

  const pick = (item: SearchSelection) => {
    onSelect(item);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <i className="bi bi-search pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          className="ify-input pl-8"
          placeholder={selected ? `${selected.name}` : placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-md shadow-lg">
          {suggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="ify-autocomplete-item"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                {item.document_number ? (
                  <>
                    <span className="font-semibold text-[var(--primary)]">{item.document_number}</span>
                    {" — "}
                  </>
                ) : null}
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
