"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";

type DashStats = {
  kpi?: {
    cpe_emitidos: number;
    documents_amount: number;
    sale_notes_amount: number;
    total_sales: number;
    net_profit: number;
  };
  sale_notes?: { collected: number; pending: number; total: number };
  documents?: { collected: number; pending: number; total: number };
  balance?: { totals: number; payments: number };
  utilities?: { income: number; expense: number; profit: number };
  purchases?: { perceptions: number; purchases: number; total: number; monthly: { month: string; amount: number }[] };
  sales_chart?: { labels: string[]; sale_notes: number[]; documents: number[]; totals: number[] };
  top_customers?: { rank: number; name: string; count: number; total: number }[];
  monthly_history?: { month: string; sunat_sales: number; internal_sales: number; purchases_expenses: number }[];
  establishments?: { id: number; description: string }[];
  insights?: { level: string; text: string }[];
};

function fmtMoney(n: number) {
  return n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatCard({ label, value, icon }: { label: React.ReactNode; value: string; icon: string }) {
  return (
    <div className="dash-stat-card">
      <div className="dash-stat-icon">
        <i className={`bi ${icon} text-[var(--primary)]`} />
      </div>
      <div className="dash-stat-label">{label}</div>
      <div className="dash-stat-value">{value}</div>
    </div>
  );
}

function DonutChart({
  segments,
  center,
}: {
  segments: { value: number; color: string; pct: number }[];
  center: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const gradient = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const start = (acc / total) * 100;
      acc += s.value;
      const end = (acc / total) * 100;
      return `${s.color} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="dash-donut-wrap">
      <div
        className="dash-donut"
        style={{ background: gradient ? `conic-gradient(${gradient})` : "#eef1f4" }}
      >
        <div className="dash-donut-center">{center}</div>
      </div>
    </div>
  );
}

function SummaryTable({ rows }: { rows: { label: string; value: number; tone?: "info" | "danger" | "normal" }[] }) {
  return (
    <table className="dash-summary-table">
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className={r.tone === "info" ? "text-info" : r.tone === "danger" ? "text-danger" : ""}>
            <td>{r.label}</td>
            <td className="text-end font-semibold">S/&nbsp;{fmtMoney(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BarChart({
  labels,
  series,
}: {
  labels: string[];
  series: { key: string; values: number[]; color: string }[];
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  return (
    <div className="dash-bar-chart">
      <div className="dash-bar-legend">
        {series.map((s) => (
          <span key={s.key} className="dash-bar-legend-item">
            <i style={{ background: s.color }} /> {s.key}
          </span>
        ))}
      </div>
      <div className="dash-bar-area">
        {labels.map((label, i) => (
          <div key={label + i} className="dash-bar-group">
            <div className="dash-bar-stack">
              {series.map((s) => (
                <div
                  key={s.key}
                  className="dash-bar"
                  style={{
                    height: `${Math.max(4, (s.values[i] / max) * 100)}%`,
                    background: s.color,
                  }}
                  title={`${s.key}: S/ ${fmtMoney(s.values[i] ?? 0)}`}
                />
              ))}
            </div>
            <span className="dash-bar-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({
  labels,
  series,
}: {
  labels: string[];
  series: { key: string; values: number[]; color: string }[];
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const w = 400;
  const h = 180;
  const pad = 24;
  const points = (values: number[]) =>
    values
      .map((v, i) => {
        const x = pad + (i / Math.max(labels.length - 1, 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <div className="dash-line-chart">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad}
            x2={w - pad}
            y1={h - pad - t * (h - pad * 2)}
            y2={h - pad - t * (h - pad * 2)}
            stroke="var(--border-light)"
            strokeWidth="1"
          />
        ))}
        {series.map((s) => (
          <polyline
            key={s.key}
            fill="none"
            stroke={s.color}
            strokeWidth="2"
            points={points(s.values)}
          />
        ))}
      </svg>
      <div className="dash-line-labels">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [establishmentId, setEstablishmentId] = useState("");
  const [dateFrom, setDateFrom] = useState("2024-01-01");
  const [dateTo, setDateTo] = useState("2024-12-08");
  const [year, setYear] = useState("2024");
  const [considerExpenses, setConsiderExpenses] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.dashboard
      .stats({
        date_from: dateFrom,
        date_to: dateTo,
        year,
        ...(establishmentId ? { establishment_id: establishmentId } : {}),
      })
      .then((r) => setStats(r as DashStats))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, year, establishmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) {
    return <div className="dash-page"><p className="text-[var(--muted)]">Cargando dashboard...</p></div>;
  }

  const kpi = stats?.kpi;
  const sn = stats?.sale_notes ?? { collected: 0, pending: 0, total: 0 };
  const doc = stats?.documents ?? { collected: 0, pending: 0, total: 0 };
  const bal = stats?.balance ?? { totals: 0, payments: 0 };
  const util = stats?.utilities ?? { income: 0, expense: 0, profit: 0 };
  const pur = stats?.purchases ?? { perceptions: 0, purchases: 0, total: 0, monthly: [] };
  const chart = stats?.sales_chart ?? { labels: [], sale_notes: [], documents: [], totals: [] };
  const history = stats?.monthly_history ?? [];
  const tops = stats?.top_customers ?? [];

  const snTotal = sn.collected + sn.pending || 1;
  const docTotal = doc.collected + doc.pending || 1;
  const balTotal = bal.totals + bal.payments || 1;
  const utilTotal = util.income + util.expense || 1;

  return (
    <div className="dash-page">
      <div className="dash-title-row">
        <h1 className="dash-title">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">KPIs y análisis inteligente en tiempo real</p>
      </div>

      <div className="dash-main-with-insights">
        <div className="dash-main-col">

      {/* KPI cards — estilo Acorn original */}
      <div className="dash-kpi-card ify-card mb-0">
        <div className="dash-kpi-grid">
          <StatCard
            label="CPE Emitidos"
            value={String(kpi?.cpe_emitidos ?? 0)}
            icon="bi-journal-text"
          />
          <StatCard
            label={<>Monto total <br />comprobantes</>}
            value={fmtMoney(kpi?.documents_amount ?? 0)}
            icon="bi-currency-dollar"
          />
          <StatCard
            label={<>Monto total notas <br />de ventas</>}
            value={fmtMoney(kpi?.sale_notes_amount ?? 0)}
            icon="bi-currency-dollar"
          />
          <StatCard
            label={<>Monto total <br />de ventas</>}
            value={fmtMoney(kpi?.total_sales ?? 0)}
            icon="bi-currency-dollar"
          />
          <StatCard
            label={<>Utilidad <br />neta</>}
            value={fmtMoney(kpi?.net_profit ?? 0)}
            icon="bi-bar-chart"
          />
        </div>
      </div>

      {/* Filtros históricos */}
      <section className="ify-card dash-section mt-3">
        <h2 className="dash-small-title border-b pb-2">Filtrar datos históricos</h2>
        <div className="dash-filter-grid">
          <label className="ify-label">
            Establecimiento
            <select className="ify-select mt-1" value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)}>
              <option value="">Oficina Principal</option>
              {(stats?.establishments ?? []).map((e) => (
                <option key={e.id} value={String(e.id)}>{e.description}</option>
              ))}
            </select>
          </label>
          <label className="ify-label">
            Periodo
            <select className="ify-select mt-1" defaultValue="between">
              <option value="between">Entre fechas</option>
              <option value="month">Mes actual</option>
              <option value="year">Año actual</option>
            </select>
          </label>
          <label className="ify-label">
            Fecha del
            <input type="date" className="ify-input mt-1" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </label>
          <label className="ify-label">
            Fecha al
            <input type="date" className="ify-input mt-1" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 text-end">
          <button type="button" className="ify-btn-primary text-xs" onClick={load}>Aplicar filtros</button>
        </div>
      </section>

      {/* Fila 1: Notas, Comprobantes, Ventas */}
      <div className="dash-widgets-row mt-3">
        <section className="ify-card dash-widget">
          <h2 className="dash-small-title">Notas de venta</h2>
          <DonutChart
            segments={[
              { value: sn.collected, color: "#36a2eb", pct: (sn.collected / snTotal) * 100 },
              { value: sn.pending, color: "#dc3545", pct: (sn.pending / snTotal) * 100 },
            ]}
            center={
              <>
                <div>{Math.round((sn.collected / snTotal) * 100)}%</div>
                <small>Total cobrado</small>
              </>
            }
          />
          <SummaryTable
            rows={[
              { label: "Total Cobrado", value: sn.collected, tone: "info" },
              { label: "Pendiente de cobro", value: sn.pending, tone: "danger" },
              { label: "Total", value: sn.total },
            ]}
          />
        </section>

        <section className="ify-card dash-widget">
          <h2 className="dash-small-title">Comprobantes</h2>
          <DonutChart
            segments={[
              { value: doc.collected, color: "#36a2eb", pct: (doc.collected / docTotal) * 100 },
              { value: doc.pending, color: "#dc3545", pct: (doc.pending / docTotal) * 100 },
            ]}
            center={
              <>
                <div>{Math.round((doc.collected / docTotal) * 100)}%</div>
                <small>Total cobrado</small>
              </>
            }
          />
          <SummaryTable
            rows={[
              { label: "Total Cobrado", value: doc.collected, tone: "info" },
              { label: "Pendiente de cobro", value: doc.pending, tone: "danger" },
              { label: "Total", value: doc.total },
            ]}
          />
        </section>

        <section className="ify-card dash-widget dash-widget-wide">
          <h2 className="dash-small-title">
            Ventas <i className="bi bi-info-circle text-[var(--muted)] text-xs" />
          </h2>
          <p className="text-xs text-[var(--muted)] mb-2">Totales</p>
          <BarChart
            labels={chart.labels}
            series={[
              { key: "Total notas de venta", values: chart.sale_notes, color: "#2694d4" },
              { key: "Total comprobantes", values: chart.documents, color: "#36a2eb" },
              { key: "Total", values: chart.totals, color: "#a2d8f8" },
            ]}
          />
          <SummaryTable
            rows={[
              { label: "Total notas de venta", value: sn.total, tone: "info" },
              { label: "Total comprobantes", value: doc.total, tone: "danger" },
              { label: "Total", value: (kpi?.total_sales ?? 0) },
            ]}
          />
        </section>
      </div>

      {/* Fila 2: Balance, Utilidades, Compras */}
      <div className="dash-widgets-row mt-3">
        <section className="ify-card dash-widget">
          <h2 className="dash-small-title">
            Balance <i className="bi bi-info-circle text-[var(--muted)] text-xs" />
          </h2>
          <DonutChart
            segments={[
              { value: bal.totals, color: "#36a2eb", pct: 50 },
              { value: bal.payments, color: "#dc3545", pct: 50 },
            ]}
            center={<><div>50%</div><small>Totales</small></>}
          />
          <SummaryTable
            rows={[
              { label: "Totales", value: bal.totals, tone: "info" },
              { label: "Total pagos", value: bal.payments, tone: "danger" },
            ]}
          />
        </section>

        <section className="ify-card dash-widget">
          <h2 className="dash-small-title">Utilidades/Ganancias</h2>
          <DonutChart
            segments={[
              { value: util.income, color: "#36a2eb", pct: (util.income / utilTotal) * 100 },
              { value: util.expense, color: "#dc3545", pct: (util.expense / utilTotal) * 100 },
            ]}
            center={
              <>
                <div>{Math.round((util.income / utilTotal) * 100)}%</div>
                <small>Ingreso</small>
              </>
            }
          />
          <div className="px-3 pb-2 text-xs">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={considerExpenses} onChange={(e) => setConsiderExpenses(e.target.checked)} />
              Considerar gastos
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input type="checkbox" />
              Filtrar por producto
            </label>
          </div>
          <SummaryTable
            rows={[
              { label: "Ingreso", value: util.income, tone: "info" },
              { label: "Egreso", value: considerExpenses ? util.expense : 0, tone: "danger" },
              { label: "Utilidad", value: considerExpenses ? util.profit : util.income },
            ]}
          />
        </section>

        <section className="ify-card dash-widget dash-widget-wide">
          <h2 className="dash-small-title">
            Compras <i className="bi bi-info-circle text-[var(--muted)] text-xs" />
          </h2>
          <BarChart
            labels={pur.monthly.map((m) => m.month)}
            series={[
              { key: "Total percepciones", values: pur.monthly.map(() => 0), color: "#ff6384" },
              { key: "Total compras", values: pur.monthly.map((m) => m.amount), color: "#36a2eb" },
            ]}
          />
          <SummaryTable
            rows={[
              { label: "Total percepciones", value: pur.perceptions, tone: "info" },
              { label: "Total compras", value: pur.purchases, tone: "danger" },
              { label: "Total", value: pur.total },
            ]}
          />
        </section>
      </div>

      {/* Top clientes */}
      <section className="ify-card dash-section mt-3">
        <h2 className="dash-small-title">Top clientes</h2>
        <div className="overflow-x-auto">
          <table className="ify-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th className="text-end">Transacciones</th>
                <th className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {tops.length === 0 ? (
                <tr><td colSpan={4} className="text-center text-[var(--muted)]">Sin datos en el periodo</td></tr>
              ) : (
                tops.map((c) => (
                  <tr key={c.rank}>
                    <td>{c.rank}</td>
                    <td>{c.name}</td>
                    <td className="text-end">{c.count}</td>
                    <td className="text-end">{fmtMoney(c.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="py-3 text-center">
          <Link href="/persons/customers" className="ify-btn-outline text-xs">Ver todo</Link>
        </div>
      </section>

      {/* Histórico anual */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-sm">Año</label>
        <select className="ify-select w-28 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
          {[2026, 2025, 2024, 2023, 2022, 2021].map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      <div className="dash-history-row mt-2">
        <section className="ify-card dash-section">
          <table className="ify-table text-sm">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="text-end">Ventas Sunat</th>
                <th className="text-end">Ventas internas</th>
                <th className="text-end">Compras + Gastos</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.month}>
                  <td>{row.month}</td>
                  <td className="text-end">{fmtMoney(row.sunat_sales)}</td>
                  <td className="text-end">{fmtMoney(row.internal_sales)}</td>
                  <td className="text-end">{fmtMoney(row.purchases_expenses)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="ify-card dash-section">
          <LineChart
            labels={history.map((h) => h.month)}
            series={[
              { key: "Venta sunat", values: history.map((h) => h.sunat_sales), color: "#36a2eb" },
              { key: "Venta interna", values: history.map((h) => h.internal_sales), color: "#28a745" },
              { key: "Compras + Gastos", values: history.map((h) => h.purchases_expenses), color: "#ff6384" },
            ]}
          />
        </section>
      </div>
        </div>

        <aside className="dash-insights-panel ify-card">
          <h2 className="dash-small-title">Análisis inteligente</h2>
          <ul className="dash-insights-list">
            {(stats?.insights ?? []).map((item, i) => (
              <li key={i} className={`dash-insight dash-insight-${item.level}`}>
                <span className="dash-insight-dot" aria-hidden />
                {item.text}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
