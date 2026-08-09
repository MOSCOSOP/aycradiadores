"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/ui/Modal";

type TradeDetailProps = {
  title: string;
  listPath: string;
  fetchFn: (id: string) => Promise<{ data: Record<string, unknown> }>;
  partyKey?: string;
};

export function TradeDetail({ title, listPath, fetchFn, partyKey = "customer_name" }: TradeDetailProps) {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchFn(id).then((r) => {
      setData(r.data);
      setItems((r.data.items as Record<string, unknown>[]) || []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-5">Cargando...</div>;
  if (!data) return <div className="p-5">Registro no encontrado</div>;

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
