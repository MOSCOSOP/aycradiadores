"use client";

import { useState } from "react";

/** Select respaldado por un catálogo real (Marca, Línea, Zona, etc.), con opción de crear uno
 * nuevo sin salir del formulario donde se usa. */
export function SelectWithAdd({
  value,
  options,
  placeholder,
  onChange,
  onCreate,
}: {
  value: string;
  options: { id: number; name: string }[];
  placeholder: string;
  onChange: (id: string, name: string) => void;
  onCreate: (name: string) => Promise<{ id: number; name: string } | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  if (adding) {
    return (
      <div className="flex gap-1">
        <input
          className="ify-input"
          autoFocus
          placeholder={`Nueva ${placeholder.toLowerCase()}...`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter" && newName.trim()) {
              const created = await onCreate(newName.trim());
              if (created) onChange(String(created.id), created.name);
              setAdding(false);
              setNewName("");
            }
          }}
        />
        <button type="button" className="ify-btn-ghost px-2" onClick={() => setAdding(false)}>
          <i className="bi bi-x" />
        </button>
      </div>
    );
  }

  return (
    <select
      className="ify-select"
      value={value}
      onChange={(e) => {
        if (e.target.value === "__new__") {
          setAdding(true);
          return;
        }
        const opt = options.find((o) => String(o.id) === e.target.value);
        onChange(e.target.value, opt?.name ?? "");
      }}
    >
      <option value="">{`Sin ${placeholder.toLowerCase()}`}</option>
      {options.map((o) => (
        <option key={o.id} value={String(o.id)}>{o.name}</option>
      ))}
      <option value="__new__">+ Nueva {placeholder.toLowerCase()}...</option>
    </select>
  );
}
