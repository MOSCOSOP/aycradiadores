"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { COMPANY } from "@/lib/constants";

type TradeDetailProps = {
  title: string;
  listPath: string;
  fetchFn: (id: string) => Promise<{ data: Record<string, unknown> }>;
  partyKey?: string;
  /** Habilita compartir/anular — requiere que el backend tenga las rutas share-link y void
   * para este tipo ("sale-notes" | "quotations"). */
  shareKind?: "sale-notes" | "quotations";
};

export function TradeDetail({ title, listPath, fetchFn, partyKey = "customer_name", shareKind }: TradeDetailProps) {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => {
    if (!id) return;
    fetchFn(id).then((r) => {
      setData(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const shareApi = shareKind === "sale-notes" ? api.saleNotes : shareKind === "quotations" ? api.quotations : null;

  const ensureLink = async (): Promise<string> => {
    if (!shareApi) throw new Error("No disponible");
    const res = await shareApi.shareLink(id);
    return res.public_url;
  };

  const handlePrint = async () => {
    setMsg("");
    setBusy(true);
    try {
      const url = await ensureLink();
      window.open(url, "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo generar el enlace");
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    setMsg("");
    setBusy(true);
    try {
      const url = await ensureLink();
      let target = phone.replace(/\D/g, "") || String(COMPANY.phone || "").replace(/\D/g, "");
      if (target.length === 9) target = `51${target}`;
      const text = `${title} ${data?.number} — Cliente: ${data?.[partyKey]} — Total: S/ ${Number(data?.total ?? 0).toFixed(2)}\nVer: ${url}`;
      window.open(`https://wa.me/${target}?text=${encodeURIComponent(text)}`, "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo generar el enlace");
    } finally {
      setBusy(false);
    }
  };

  const handleEmail = async () => {
    setMsg("");
    if (!email.trim()) {
      setMsg("Escribe el correo del destinatario.");
      return;
    }
    setBusy(true);
    try {
      const url = await ensureLink();
      const subject = encodeURIComponent(`${title} ${data?.number}`);
      const body = encodeURIComponent(
        `Estimado(a) ${data?.[partyKey]},\n\nAdjuntamos el enlace de su ${title.toLowerCase()} ${data?.number}:\n${url}\n\nTotal: S/ ${Number(data?.total ?? 0).toFixed(2)}\n\nSaludos,\n${COMPANY.tradeName}`
      );
      window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, "_blank");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo generar el enlace");
    } finally {
      setBusy(false);
    }
  };

  const handleVoid = async () => {
    if (!shareApi) return;
    if (!confirm(`¿Anular ${title.toLowerCase()} ${data?.number}? Esta acción no se puede deshacer.`)) return;
    setBusy(true);
    setMsg("");
    try {
      await shareApi.void(Number(id));
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo anular");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!data) return <div className="p-5">Registro no encontrado</div>;

  const isVoided = String(data.state ?? "").toLowerCase() === "anulado";

  return (
    <div className="ify-page">
      <PageHeader
        title={`${title} ${data.number}`}
        actions={<Link href={listPath} className="ify-btn-outline">← Volver</Link>}
      />
      <div className="ify-card mb-4 p-4">
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Número</dt><dd>{String(data.number)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Fecha</dt><dd>{String(data.date)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Estado</dt><dd>{String(data.state)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[var(--muted)]">Total</dt><dd className="font-bold text-[var(--primary)]">S/ {Number(data.total).toFixed(2)}</dd></div>
          <div className="flex justify-between gap-4 md:col-span-2"><dt className="text-[var(--muted)]">Contacto</dt><dd>{String(data[partyKey])}</dd></div>
        </dl>
      </div>

      {shareApi && (
        <div className="ify-card mb-4 p-4">
          <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Compartir / imprimir</p>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" className="ify-btn-primary px-4 py-2 text-sm" onClick={handlePrint} disabled={busy}>
              <i className="bi bi-printer" /> Imprimir / Ver
            </button>
            {!isVoided && (
              <button type="button" className="ify-btn-ghost text-xs text-red-600" onClick={handleVoid} disabled={busy}>
                <i className="bi bi-slash-circle" /> Anular
              </button>
            )}
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button type="button" className="ify-btn-outline text-xs text-green-700" onClick={handleWhatsApp} disabled={busy}>
              <i className="bi bi-whatsapp" /> Enviar WhatsApp
            </button>
            <input
              className="ify-input min-w-[160px] flex-1 text-sm"
              type="tel"
              placeholder="999 123 456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="ify-btn-outline text-xs" onClick={handleEmail} disabled={busy}>
              <i className="bi bi-envelope" /> Enviar correo
            </button>
            <input
              className="ify-input min-w-[220px] flex-1 text-sm"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {msg && <p className="mt-2 text-xs text-red-600">{msg}</p>}
        </div>
      )}

      <div className="ify-card overflow-x-auto">
        <table className="ify-table">
          <thead><tr><th>Descripción</th><th>Cant.</th><th>P. Unit</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx}>
                <td>{String(i.description)}</td>
                <td>{Number(i.quantity)}</td>
                <td>S/ {Number(i.unit_price).toFixed(2)}</td>
                <td>S/ {Number(i.total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
