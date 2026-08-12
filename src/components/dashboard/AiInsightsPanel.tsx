"use client";

import Link from "next/link";
import type { AiAnalysis, AiInsight } from "@/lib/dashboard-ai-insights";

const LEVEL_META: Record<
  AiInsight["level"],
  { dot: string; badge: string; label: string }
> = {
  critical: { dot: "#ef4444", badge: "Crítico", label: "dash-ai-badge-critical" },
  warning: { dot: "#f97316", badge: "Atención", label: "dash-ai-badge-warning" },
  info: { dot: "#3b82f6", badge: "Info", label: "dash-ai-badge-info" },
  success: { dot: "#22c55e", badge: "Positivo", label: "dash-ai-badge-success" },
  opportunity: { dot: "#a855f7", badge: "Oportunidad", label: "dash-ai-badge-opportunity" },
};

const STATUS_COLOR: Record<AiAnalysis["health_status"], string> = {
  excelente: "#22c55e",
  bueno: "#3b82f6",
  regular: "#f97316",
  critico: "#ef4444",
};

function HealthRing({ score, status }: { score: number; status: AiAnalysis["health_status"] }) {
  const color = STATUS_COLOR[status];
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="dash-ai-health-ring">
      <svg viewBox="0 0 100 100" className="dash-ai-health-svg">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-light)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="dash-ai-health-progress"
        />
      </svg>
      <div className="dash-ai-health-center">
        <strong>{score}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

function PulseChip({ label, value, trend }: { label: string; value: string; trend: "up" | "down" | "flat" }) {
  const icon = trend === "up" ? "bi-arrow-up-short" : trend === "down" ? "bi-arrow-down-short" : "bi-dash";
  const cls = trend === "up" ? "up" : trend === "down" ? "down" : "flat";
  return (
    <div className={`dash-ai-pulse-chip dash-ai-pulse-${cls}`}>
      <span className="dash-ai-pulse-label">{label}</span>
      <span className="dash-ai-pulse-value">
        {value}
        <i className={`bi ${icon}`} />
      </span>
    </div>
  );
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const meta = LEVEL_META[insight.level];
  return (
    <article className="dash-ai-insight-card">
      <div className="dash-ai-insight-head">
        <span className="dash-ai-insight-dot" style={{ background: meta.dot }} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="dash-ai-insight-title">{insight.title}</h4>
            <span className={`dash-ai-badge ${meta.label}`}>{meta.badge}</span>
          </div>
          {insight.metric ? <span className="dash-ai-insight-metric">{insight.metric}</span> : null}
        </div>
      </div>
      <p className="dash-ai-insight-text">{insight.text}</p>
      {insight.action ? (
        <Link href={insight.action.href} className="dash-ai-action-link">
          {insight.action.label}
          <i className="bi bi-arrow-right-short" />
        </Link>
      ) : null}
    </article>
  );
}

type AiInsightsPanelProps = {
  analysis?: AiAnalysis | null;
  loading?: boolean;
};

export function AiInsightsPanel({ analysis, loading }: AiInsightsPanelProps) {
  if (loading && !analysis) {
    return (
      <aside className="dash-ai-panel ify-card">
        <div className="dash-ai-loading">
          <div className="dash-ai-spinner" />
          <p>Analizando datos con IA...</p>
        </div>
      </aside>
    );
  }

  if (!analysis) return null;

  const updated = new Date(analysis.generated_at).toLocaleString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <aside className="dash-ai-panel ify-card">
      <div className="dash-ai-glow" aria-hidden />

      <header className="dash-ai-header">
        <div className="dash-ai-header-top">
          <div className="dash-ai-brand">
            <span className="dash-ai-icon-wrap">
              <i className="bi bi-stars" />
            </span>
            <div>
              <h2 className="dash-ai-title">Análisis Inteligente</h2>
              <p className="dash-ai-subtitle">Motor IA · Actualizado {updated}</p>
            </div>
          </div>
          <span className="dash-ai-live">
            <span className="dash-ai-live-dot" />
            En vivo
          </span>
        </div>
      </header>

      <div className="dash-ai-health-row">
        <HealthRing score={analysis.health_score} status={analysis.health_status} />
        <div className="dash-ai-health-copy">
          <span className={`dash-ai-status dash-ai-status-${analysis.health_status}`}>
            {analysis.health_summary}
          </span>
          <p className="dash-ai-brief">{analysis.executive_brief}</p>
        </div>
      </div>

      <div className="dash-ai-pulse-grid">
        {analysis.pulse.map((p) => (
          <PulseChip key={p.label} {...p} />
        ))}
      </div>

      <div className="dash-ai-sections">
        {analysis.sections.map((section) => (
          <details key={section.id} className="dash-ai-section" open={section.id === "general" || section.id === "recomendaciones"}>
            <summary className="dash-ai-section-summary">
              <i className={`bi ${section.icon}`} />
              <span>{section.title}</span>
              <span className="dash-ai-section-count">{section.insights.length}</span>
              <i className="bi bi-chevron-down dash-ai-chevron" />
            </summary>
            <div className="dash-ai-section-body">
              {section.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </details>
        ))}
      </div>

      <footer className="dash-ai-footer">
        <i className="bi bi-shield-check" />
        Análisis generado automáticamente desde ventas, inventario, compras y cobranza.
      </footer>
    </aside>
  );
}
