"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Modal";

export type CustomerFormData = {
  identity_document_type_id: string;
  number: string;
  name: string;
  verification_code: string;
  sex: string;
  birth_date: string;
  address: string;
  telephone: string;
  email: string;
};

export const emptyCustomerForm: CustomerFormData = {
  identity_document_type_id: "6",
  number: "",
  name: "",
  verification_code: "",
  sex: "",
  birth_date: "",
  address: "",
  telephone: "",
  email: "",
};

const DOC_TYPES = [
  { id: "6", label: "RUC" },
  { id: "1", label: "DNI" },
  { id: "4", label: "C.E." },
  { id: "7", label: "Pasaporte" },
  { id: "0", label: "Doc.trib.no dom." },
];

type CustomerFormFieldsProps = {
  form: CustomerFormData;
  setForm: React.Dispatch<React.SetStateAction<CustomerFormData>>;
};

export function CustomerFormFields({ form, setForm }: CustomerFormFieldsProps) {
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
          verification_code: String(data.verification_code || ""),
          sex: String(data.sex || ""),
          birth_date: String(data.birth_date || ""),
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
          number: String(data.number || num),
          name: String(data.name || ""),
          address: String(data.address || f.address),
        }));
        setLookupMsg("Datos del RUC cargados");
      } else {
        setLookupMsg("Búsqueda automática solo para DNI y RUC");
      }
    } catch (e) {
      setLookupMsg(e instanceof Error ? e.message : "Error en búsqueda");
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-12 gap-2 items-end">
        <Field label="Tipo Doc. Identidad" className="col-span-12 sm:col-span-3">
          <select
            className="ify-select w-full"
            value={form.identity_document_type_id}
            onChange={(e) => {
              setLookupMsg("");
              setForm({ ...form, identity_document_type_id: e.target.value });
            }}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Número" className="col-span-12 sm:col-span-6">
          <input
            className="ify-input w-full"
            value={form.number}
            maxLength={isRuc ? 11 : isDni ? 8 : 20}
            placeholder={isDni ? "8 dígitos" : isRuc ? "11 dígitos" : "Número"}
            onChange={(e) => setForm({ ...form, number: e.target.value.replace(/\D/g, "") })}
          />
        </Field>
        <div className="col-span-12 sm:col-span-3 pb-0.5">
          <button
            type="button"
            className="ify-btn-primary w-full whitespace-nowrap"
            onClick={handleLookup}
            disabled={looking || (!isDni && !isRuc)}
          >
            {looking ? (
              <><i className="bi bi-arrow-repeat animate-spin" /> Buscando...</>
            ) : (
              <><i className="bi bi-search" /> Buscar</>
            )}
          </button>
        </div>
      </div>

      {lookupMsg ? (
        <p className={`text-xs ${lookupMsg.includes("Error") || lookupMsg.includes("debe") ? "text-red-600" : "text-green-700"}`}>
          {lookupMsg}
        </p>
      ) : null}

      <Field label={isRuc ? "Razón social" : "Nombre completo / Apellidos y Nombres"}>
        <input
          className="ify-input w-full"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      {isDni ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Código verificación">
            <input
              className="ify-input"
              value={form.verification_code}
              maxLength={1}
              onChange={(e) => setForm({ ...form, verification_code: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field label="Sexo">
            <select className="ify-select" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Field>
          <Field label="Fecha nacimiento">
            <input
              className="ify-input"
              placeholder="DD/MM/AAAA"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            />
          </Field>
        </div>
      ) : null}

      <Field label="Dirección">
        <input className="ify-input w-full" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Teléfono">
          <input className="ify-input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className="ify-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
