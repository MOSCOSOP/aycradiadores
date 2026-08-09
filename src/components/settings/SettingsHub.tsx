"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/Modal";
import { SETTINGS_SECTIONS } from "@/lib/settings-catalog";

export function SettingsHub() {
  return (
    <div className="ify-page">
      <PageHeader title="Configuración" subtitle="Parámetros generales del sistema" />
      <div className="space-y-6">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-sm font-bold text-[var(--primary)]">{section.title}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ify-card flex items-center gap-3 p-3 text-sm hover:border-[var(--primary)]"
                >
                  <i className={`bi ${item.icon ?? "bi-gear"} text-lg text-[var(--primary)]`} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
