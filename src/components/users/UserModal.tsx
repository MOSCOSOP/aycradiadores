"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { ALL_PERMISSION_KEYS, PERMISSION_GROUPS, parsePermissions } from "@/lib/permissions";

export type UserFormData = {
  name: string;
  email: string;
  password: string;
  type: string;
  establishment_id: string;
  permissions: string[];
  active: boolean;
};

const emptyForm: UserFormData = {
  name: "",
  email: "",
  password: "",
  type: "seller",
  establishment_id: "",
  permissions: [],
  active: true,
};

type UserModalProps = {
  open: boolean;
  editId: number | null;
  initial?: Partial<UserFormData>;
  onClose: () => void;
  onSaved: () => void;
};

export function UserModal({ open, editId, initial, onClose, onSaved }: UserModalProps) {
  const [form, setForm] = useState<UserFormData>({ ...emptyForm, ...initial });
  const [establishments, setEstablishments] = useState<Record<string, unknown>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, ...initial, permissions: initial?.permissions ?? [] });
    api.establishments.records().then((r) => {
      const list = r.data ?? [];
      setEstablishments(list);
      if (!initial?.establishment_id && list[0]) {
        setForm((f) => ({ ...f, establishment_id: String(list[0].id) }));
      }
    });
  }, [open, initial]);

  const togglePermission = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const selectAll = () => setForm((f) => ({ ...f, permissions: [...ALL_PERMISSION_KEYS] }));
  const clearAll = () => setForm((f) => ({ ...f, permissions: [] }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      alert("Nombre y email son obligatorios");
      return;
    }
    if (!editId && !form.password.trim()) {
      alert("La contraseña es obligatoria para usuarios nuevos");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password || undefined,
        type: form.type,
        establishment_id: Number(form.establishment_id),
        permissions: form.permissions,
        active: form.active,
      };
      if (editId) await api.users.update(editId, payload);
      else await api.users.create(payload);
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={editId ? "Editar usuario" : "Nuevo usuario"}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="button" className="ify-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label="Nombre *">
          <input className="ify-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email *">
          <input type="email" className="ify-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={editId ? "Nueva contraseña (opcional)" : "Contraseña *"}>
          <input type="password" className="ify-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Field label="Tipo">
          <select className="ify-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="admin">Administrador</option>
            <option value="seller">Vendedor</option>
            <option value="support">Soporte</option>
          </select>
        </Field>
        <Field label="Establecimiento" className="sm:col-span-2">
          <select className="ify-select" value={form.establishment_id} onChange={(e) => setForm({ ...form, establishment_id: e.target.value })}>
            {establishments.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>{String(e.description)}</option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Usuario activo
        </label>
      </div>

      <div className="border-t pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold">Permisos</p>
          <div className="flex gap-2">
            <button type="button" className="ify-link text-xs" onClick={selectAll}>Todos</button>
            <button type="button" className="ify-link text-xs" onClick={clearAll}>Ninguno</button>
          </div>
        </div>
        <div className="max-h-64 space-y-3 overflow-auto">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs font-semibold text-[var(--muted)]">{group.label}</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {group.permissions.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p.key) || form.type === "admin"}
                      disabled={form.type === "admin"}
                      onChange={() => togglePermission(p.key)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {form.type === "admin" && (
          <p className="mt-2 text-[11px] text-[var(--muted)]">Los administradores tienen todos los permisos.</p>
        )}
      </div>
    </Modal>
  );
}

export function userRowToForm(r: Record<string, unknown>): Partial<UserFormData> {
  return {
    name: String(r.name || ""),
    email: String(r.email || ""),
    password: "",
    type: String(r.type || "seller"),
    establishment_id: String(r.establishment_id || ""),
    permissions: parsePermissions(r.permissions),
    active: r.active !== false,
  };
}
