"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
};

export function Modal({ open, title, onClose, children, footer, size = "md" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <button type="button" className="ify-modal-overlay absolute inset-0 bg-black/40" onClick={onClose} aria-label="Cerrar" />
      <div className={`relative z-10 w-full rounded-xl ify-modal-panel shadow-xl ${size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
          <h2 className="text-base font-bold text-[var(--foreground)]">{title}</h2>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <i className="bi bi-x-lg" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[var(--border-light)] px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="ify-page-header mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="ify-page-title">{title}</h1>
        {subtitle && <p className="ify-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="ify-label">{label}</label>
      {children}
    </div>
  );
}
