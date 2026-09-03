"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

/** Buscador simple de producto (autocompletar), reutilizado por pantallas que enlazan un
 * registro a un producto del catálogo (referencias, lotes, devoluciones). */
export function ItemPicker({
  selectedLabel,
  onSelect,
}: {
  selectedLabel?: string;
  onSelect: (item: { id: number; description: string }) => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (search.length < 1) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      api.items.search(search, 8).then((r) => setResults(r.data ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="relative">
      <input
        className="ify-input"
        placeholder={selectedLabel || "Buscar producto..."}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="ify-autocomplete-list absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md shadow-lg">
          {results.map((p) => (
            <li key={String(p.id)}>
              <button
                type="button"
                className="ify-autocomplete-item w-full text-left"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect({ id: Number(p.local_id ?? p.id), description: String(p.description ?? "") });
                  setSearch("");
                  setResults([]);
                }}
              >
                {String(p.description)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
