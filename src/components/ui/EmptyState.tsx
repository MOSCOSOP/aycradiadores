"use client";

/** Estado vacío profesional para listados — reemplaza el "Sin registros" plano. */
export function EmptyState({
  icon = "bi-inbox",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="ify-empty-state">
      <i className={`bi ${icon} ify-empty-state-icon`} />
      <p className="ify-empty-state-title">{title}</p>
      {description && <p className="ify-empty-state-description">{description}</p>}
      {action && <div className="ify-empty-state-action">{action}</div>}
    </div>
  );
}
