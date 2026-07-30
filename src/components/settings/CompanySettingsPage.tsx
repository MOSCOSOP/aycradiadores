"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { PageHeader } from "@/components/ui/Modal";

type CompanyForm = Record<string, string | boolean | number>;

const EMPTY: CompanyForm = {
  number: "",
  name: "",
  trade_name: "",
  soap_send_id: "01",
  soap_type_id: "02",
  soap_username: "",
  soap_password: "",
  soap_sunat_username: "",
  soap_sunat_password: "",
  api_sunat_id: "",
  api_sunat_secret: "",
  certificate: "",
  pse: false,
  pse_url: "",
  client_id_pse: "",
  send_document_to_pse: false,
  type_send_pse: 2,
  is_rus: false,
};

export function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [testMsg, setTestMsg] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    api.company
      .get()
      .then((r) => {
        const d = r.data as Record<string, unknown>;
        setForm({
          ...EMPTY,
          number: String(d.number ?? ""),
          name: String(d.name ?? ""),
          trade_name: String(d.trade_name ?? ""),
          soap_send_id: String(d.soap_send_id ?? "01"),
          soap_type_id: String(d.soap_type_id ?? "02"),
          soap_username: "",
          soap_password: "",
          soap_sunat_username: "",
          soap_sunat_password: "",
          api_sunat_id: String(d.api_sunat_id ?? ""),
          api_sunat_secret: "",
          certificate: String(d.certificate ?? ""),
          pse: Boolean(d.pse),
          pse_url: String(d.pse_url ?? ""),
          client_id_pse: String(d.client_id_pse ?? ""),
          send_document_to_pse: Boolean(d.send_document_to_pse),
          type_send_pse: Number(d.type_send_pse ?? 2),
          is_rus: Boolean(d.is_rus),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k: string, v: string | boolean | number) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = { ...form };
      ["soap_password", "soap_sunat_password", "api_sunat_secret"].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      await api.company.update(payload);
      setMsg("Empresa y credenciales SUNAT guardadas");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (kind: "soap" | "api" | "sire") => {
    setTestMsg("");
    try {
      const fn =
        kind === "soap" ? api.company.testSoap : kind === "api" ? api.company.testApi : api.company.testSire;
      const res = await fn();
      setTestMsg((res as { message?: string }).message || "Conexión exitosa");
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Error de conexión");
    }
  };

  if (loading) {
    return <div className="p-4 md:p-5 text-[var(--muted)]">Cargando empresa...</div>;
  }

  return (
    <div className="p-4 md:p-5 max-w-4xl">
      <PageHeader
        title="Empresa"
        subtitle="Datos comerciales, SOAP SUNAT y credenciales SIRE"
        actions={
          <Link href="/list-settings" className="ify-btn-outline text-xs">
            ← Configuración
          </Link>
        }
      />

      {msg && (
        <div className={`mb-4 rounded border p-3 text-sm ${msg.includes("Error") ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          {msg}
        </div>
      )}

      <section className="ify-card mb-4 p-4">
        <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">Datos generales</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="ify-label">
            RUC
            <input className="ify-input mt-1" value={String(form.number)} onChange={(e) => set("number", e.target.value)} />
          </label>
          <label className="ify-label">
            Nombre / Razón social
            <input className="ify-input mt-1" value={String(form.name)} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label className="ify-label md:col-span-2">
            Nombre comercial
            <input className="ify-input mt-1" value={String(form.trade_name)} onChange={(e) => set("trade_name", e.target.value)} />
          </label>
        </div>
      </section>

      <section className="ify-card mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--primary)]">SOAP SUNAT (emisión CPE)</h2>
          <button type="button" className="ify-btn-outline text-xs" onClick={() => runTest("soap")}>
            Probar SOAP
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="ify-label">
            Ambiente
            <select className="ify-select mt-1" value={String(form.soap_type_id)} onChange={(e) => set("soap_type_id", e.target.value)}>
              <option value="01">Beta (pruebas)</option>
              <option value="02">Producción</option>
            </select>
          </label>
          <label className="ify-label">
            Certificado (.pem)
            <input className="ify-input mt-1" value={String(form.certificate)} onChange={(e) => set("certificate", e.target.value)} placeholder="certificate_RUC.pem" />
          </label>
          <label className="ify-label">
            Usuario SOL
            <input className="ify-input mt-1" value={String(form.soap_username)} onChange={(e) => set("soap_username", e.target.value)} placeholder="RUC + usuario SOL" autoComplete="off" />
          </label>
          <label className="ify-label">
            Clave SOL
            <input type="password" className="ify-input mt-1" value={String(form.soap_password)} onChange={(e) => set("soap_password", e.target.value)} placeholder="Dejar vacío para no cambiar" autoComplete="new-password" />
          </label>
          <label className="ify-label">
            Usuario SOAP SUNAT
            <input className="ify-input mt-1" value={String(form.soap_sunat_username)} onChange={(e) => set("soap_sunat_username", e.target.value)} placeholder="Igual al SOL si aplica" />
          </label>
          <label className="ify-label">
            Clave SOAP SUNAT
            <input type="password" className="ify-input mt-1" value={String(form.soap_sunat_password)} onChange={(e) => set("soap_sunat_password", e.target.value)} placeholder="Dejar vacío para no cambiar" />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          En Vercel sube el certificado como variable <code>SUNAT_CERTIFICATE_BASE64</code> (contenido .pem en base64).
        </p>
      </section>

      <section className="ify-card mb-4 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--primary)]">API SUNAT / SIRE</h2>
          <div className="flex gap-2">
            <button type="button" className="ify-btn-outline text-xs" onClick={() => runTest("api")}>
              Probar API
            </button>
            <button type="button" className="ify-btn-outline text-xs" onClick={() => runTest("sire")}>
              Probar SIRE
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="ify-label">
            Client ID (api_sunat_id)
            <input className="ify-input mt-1" value={String(form.api_sunat_id)} onChange={(e) => set("api_sunat_id", e.target.value)} />
          </label>
          <label className="ify-label">
            Client Secret (api_sunat_secret)
            <input type="password" className="ify-input mt-1" value={String(form.api_sunat_secret)} onChange={(e) => set("api_sunat_secret", e.target.value)} placeholder="Dejar vacío para no cambiar" />
          </label>
        </div>
        {testMsg && <p className="mt-3 text-sm text-[var(--foreground)]">{testMsg}</p>}
      </section>

      <section className="ify-card mb-4 p-4">
        <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">PSE (opcional)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.pse)} onChange={(e) => set("pse", e.target.checked)} />
            Usar PSE
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={Boolean(form.send_document_to_pse)} onChange={(e) => set("send_document_to_pse", e.target.checked)} />
            Enviar comprobantes al PSE
          </label>
          <label className="ify-label">
            URL PSE
            <input className="ify-input mt-1" value={String(form.pse_url)} onChange={(e) => set("pse_url", e.target.value)} />
          </label>
          <label className="ify-label">
            Client ID PSE
            <input className="ify-input mt-1" value={String(form.client_id_pse)} onChange={(e) => set("client_id_pse", e.target.value)} />
          </label>
        </div>
      </section>

      <div className="flex gap-2">
        <button type="button" className="ify-btn-primary" disabled={saving} onClick={save}>
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
      </div>
    </div>
  );
}
