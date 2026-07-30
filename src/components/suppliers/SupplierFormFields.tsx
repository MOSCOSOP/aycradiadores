"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Modal";

export type SupplierFormData = {
  identity_document_type_id: string;
  number: string;
  name: string;
  trade_name: string;
  address: string;
  telephone: string;
  email: string;
  country: string;
  ubigeo: string;
  observations: string;
  internal_code: string;
  barcode: string;
};

export const emptySupplierForm: SupplierFormData = {
  identity_document_type_id: "6",
  number: "",
  name: "",
  trade_name: "",
  address: "",
  telephone: "",
  email: "",
  country: "PERÚ",
  ubigeo: "",
  observations: "",
  internal_code: "",
  barcode: "",
};

const DOC_TYPES = [
  { id: "6", label: "RUC" },
  { id: "1", label: "DNI" },
  { id: "4", label: "C.E." },
  { id: "7", label: "Pasaporte" },
];

type SupplierFormFieldsProps = {
  form: SupplierFormData;
  setForm: React.Dispatch<React.SetStateAction<SupplierFormData>>;
};

export function SupplierFormFields({ form, setForm }: SupplierFormFieldsProps) {
  const [looking, setLooking] = useState(false);
  const [lookupMsg, setLookupMsg] = useState("");

  const isDni = form.identity_document_type_id === "1";
  const isRuc = form.identity_document_type_id === "6";

  const handleLookup = async () => {
    const num = form.number.replace(/\D/g, "");
    if (!num) {
      setLookupMsg("Ingrese el número de documento");
      return;
    }
    setLooking(true);
    setLookupMsg("");
    try {
      if (isDni) {
        if (num.length !== 8) throw new Error("DNI debe tener 8 dígitos");
        const res = await fetch(`/api/lookup/dni/${num}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No encontrado");
        setForm((f) => ({
          ...f,
          number: String(data.number || num),
          name: String(data.name || ""),
          address: String(data.address || f.address),
        }));
        setLookupMsg("Datos del DNI cargados");
      } else if (isRuc) {
        if (num.length !== 11) throw new Error("RUC debe tener 11 dígitos");
        const res = await fetch(`/api/lookup/ruc?ruc=${num}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No encontrado");
        setForm((f) => ({
          ...f,
          number: String(data.ruc || num),
          name: String(data.razon_social || data.name || ""),
          trade_name: String(data.nombre_comercial || f.trade_name),
          address: String(data.direccion || f.address),
        }));
        setLookupMsg("Datos del RUC cargados");
      }
    } catch (e) {
      setLookupMsg(e instanceof Error ? e.message : "Error en consulta");
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tipo Doc. Identidad *">
        <select
          className="ify-select"
          value={form.identity_document_type_id}
          onChange={(e) => setForm({ ...form, identity_document_type_id: e.target.value, number: "", name: "" })}
        >
          {DOC_TYPES.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </Field>
      <Field label="Número *">
        <div className="flex gap-2">
          <input
            className="ify-input flex-1"
            value={form.number}
            maxLength={isDni ? 8 : isRuc ? 11 : 20}
            onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "") })}
          />
          {(isDni || isRuc) && (
            <button type="button" className="ify-btn-outline whitespace-nowrap text-xs" onClick={handleLookup} disabled={looking}>
              {looking ? "..." : "Buscar"}
            </button>
          )}
        </div>
        {lookupMsg && <p className="mt-1 text-[11px] text-[var(--primary)]">{lookupMsg}</p>}
      </Field>
      <Field label="Nombre / Razón social *" className="sm:col-span-2">
        <input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Nombre comercial">
        <input className="ify-input" value={form.trade_name} onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
      </Field>
      <Field label="País">
        <input className="ify-input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
      </Field>
      <Field label="Ubigeo">
        <input className="ify-input" placeholder="Seleccionar" value={form.ubigeo} onChange={(e) => setForm({ ...form, ubigeo: e.target.value })} />
      </Field>
      <Field label="Dirección" className="sm:col-span-2">
        <input className="ify-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>
      <Field label="Teléfono">
        <input className="ify-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
      </Field>
      <Field label="Correo electrónico">
        <input type="email" className="ify-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </Field>
      <Field label="Código interno">
        <input className="ify-input" value={form.internal_code} onChange={(e) => setForm({ ...form, internal_code: e.target.value })} />
      </Field>
      <Field label="Código de barra">
        <input className="ify-input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
      </Field>
      <Field label="Observaciones" className="sm:col-span-2">
        <textarea className="ify-input min-h-[60px]" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
      </Field>
    </div>
  );
}
