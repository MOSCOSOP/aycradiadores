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
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateDue, setCertificateDue] = useState<string | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [certUploading, setCertUploading] = useState(false);
  const [certMsg, setCertMsg] = useState("");
  const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});
  const [usesEnvCredentials, setUsesEnvCredentials] = useState(false);

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
          soap_username: String(d.soap_username ?? ""),
          soap_password: "",
          soap_sunat_username: String(d.soap_sunat_username ?? d.soap_username ?? ""),
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
        const st = (d.config_status as Record<string, boolean>) ?? {};
        setConfigStatus(st);
        setUsesEnvCredentials(Boolean(st.uses_env_credentials));
        setHasCertificate(Boolean(d.has_certificate));
        setCertificateDue(d.certificate_due ? String(d.certificate_due) : null);
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
      if (kind === "api" && String(form.api_sunat_secret).trim()) {
        await api.company.update({
          ...form,
          api_sunat_secret: form.api_sunat_secret,
        });
        setMsg("Client Secret guardado antes de probar API");
      }
      const fn =
        kind === "soap" ? api.company.testSoap : kind === "api" ? api.company.testApi : api.company.testSire;
      const res = await fn();
      setTestMsg((res as { message?: string }).message || "Conexión exitosa");
      if (kind === "api") load();
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Error de conexión");
    }
  };

  const uploadCertificate = async (file: File) => {
    setCertUploading(true);
    setCertMsg("");
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const file_base64 = btoa(binary);
      const res = await api.company.uploadCertificate({
        filename: file.name,
        file_base64,
        password: certPassword,
      });
      setCertMsg(res.message || "Certificado cargado correctamente");
      setCertPassword("");
      load();
    } catch (e) {
      setCertMsg(e instanceof Error ? e.message : "Error al subir certificado");
    } finally {
      setCertUploading(false);
    }
  };

  if (loading) {
    return <div className="ify-page text-[var(--muted)]">Cargando empresa...</div>;
  }

  return (
    <div className="ify-page max-w-4xl">
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
        <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">Estado de configuración</h2>
        <div className="grid gap-2 text-sm md:grid-cols-2">
          <div className={configStatus.has_certificate ? "text-green-700" : "text-amber-700"}>
            {configStatus.has_certificate ? "✓" : "○"} Certificado digital cargado
          </div>
          <div className={configStatus.has_soap_username ? "text-green-700" : "text-amber-700"}>
            {configStatus.has_soap_username ? "✓" : "○"} Usuario SOL guardado
            {form.soap_username ? ` (${form.soap_username})` : ""}
          </div>
          <div className={configStatus.has_soap_password ? "text-green-700" : "text-amber-700"}>
            {configStatus.has_soap_password ? "✓" : "○"} Clave SOL guardada
          </div>
          <div className={configStatus.has_api_secret ? "text-green-700" : "text-amber-700"}>
            {configStatus.has_api_secret ? "✓" : "○"} Client Secret API guardado
          </div>
        </div>
        {usesEnvCredentials && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            Parte de las credenciales SOAP vienen de variables de entorno en Vercel (no se muestran completas por seguridad).
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">
          Las contraseñas nunca se vuelven a mostrar completas. Si el estado marca ✓, ya están guardadas — deje el campo de clave vacío para mantenerlas.
        </p>
      </section>

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
        <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">Certificado digital SUNAT</h2>
        <p className="mb-3 text-xs text-[var(--muted)]">
          Suba el archivo <strong>certificado.p12</strong> que descargó de SUNAT. El sistema lo convierte a .pem y lo guarda en la base de datos (funciona en aycradiadores.vercel.app sin OpenSSL).
        </p>
        {hasCertificate ? (
          <div className="mb-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Certificado cargado {form.certificate ? `(${form.certificate})` : ""}
            {certificateDue ? ` — vigente hasta ${certificateDue}` : ""}
          </div>
        ) : (
          <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Aún no hay certificado en el sistema. Suba su archivo .p12 de SUNAT.
          </div>
        )}
        {certMsg && (
          <div className={`mb-3 rounded border p-3 text-sm ${certMsg.includes("Error") || certMsg.toLowerCase().includes("incorrecta") || certMsg.toLowerCase().includes("no se") ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
            {certMsg}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="ify-label md:col-span-2">
            Archivo certificado (.p12, .pfx o .pem)
            <input
              type="file"
              accept=".p12,.pfx,.pem,.crt"
              className="ify-input mt-1 py-2"
              disabled={certUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCertificate(f);
                e.target.value = "";
              }}
            />
          </label>
          <label className="ify-label md:col-span-2">
            Contraseña del certificado (.p12)
            <input
              type="password"
              className="ify-input mt-1"
              value={certPassword}
              onChange={(e) => setCertPassword(e.target.value)}
              placeholder="Clave que SUNAT le dio al descargar el certificado"
              autoComplete="new-password"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          También regístrelo en SUNAT → Comprobantes de pago → Certificado Digital → Agregar nuevo certificado (mismo archivo .p12).
        </p>
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
            Referencia certificado
            <input className="ify-input mt-1 bg-[var(--background)]" readOnly value={String(form.certificate || (hasCertificate ? "Cargado en servidor" : ""))} placeholder="Se llena al subir el .p12" />
          </label>
          <label className="ify-label">
            Usuario SOL
            <input className="ify-input mt-1" value={String(form.soap_username)} onChange={(e) => set("soap_username", e.target.value)} placeholder="RUC + usuario SOL" autoComplete="off" />
          </label>
          <label className="ify-label">
            Clave SOL
            <input type="password" className="ify-input mt-1" value={String(form.soap_password)} onChange={(e) => set("soap_password", e.target.value)} placeholder={configStatus.has_soap_password ? "•••••••• (guardada — vacío = no cambiar)" : "Clave del usuario SOL"} autoComplete="new-password" />
          </label>
          <label className="ify-label">
            Usuario SOAP SUNAT
            <input className="ify-input mt-1" value={String(form.soap_sunat_username)} onChange={(e) => set("soap_sunat_username", e.target.value)} placeholder="Igual al SOL si aplica" />
          </label>
          <label className="ify-label">
            Clave SOAP SUNAT
            <input type="password" className="ify-input mt-1" value={String(form.soap_sunat_password)} onChange={(e) => set("soap_sunat_password", e.target.value)} placeholder={configStatus.has_soap_sunat_password ? "•••••••• (guardada — vacío = no cambiar)" : "Igual que clave SOL"} />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Suba el certificado en la sección de arriba. En Vercel también puede usar la variable opcional <code>SUNAT_CERTIFICATE_BASE64</code>.
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
            <input type="password" className="ify-input mt-1" value={String(form.api_sunat_secret)} onChange={(e) => set("api_sunat_secret", e.target.value)} placeholder={configStatus.has_api_secret ? "•••••••• (guardada — vacío = no cambiar)" : "Pegue el Client Secret de SUNAT"} />
          </label>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">
          La API SUNAT es para SIRE/consultas. <strong>No es necesaria para emitir boletas</strong> (eso usa SOAP, que ya funciona).
          Pegue el Client Secret y pulse <strong>Guardar</strong>, o use <strong>Probar API</strong> (guarda el secret automáticamente si lo escribió).
        </p>
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
