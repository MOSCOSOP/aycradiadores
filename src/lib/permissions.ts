export type PermissionGroup = {
  label: string;
  permissions: { key: string; label: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "Ver dashboard" }],
  },
  {
    label: "Ventas",
    permissions: [
      { key: "documents.view", label: "Ver comprobantes" },
      { key: "documents.create", label: "Crear comprobantes" },
      { key: "documents.delete", label: "Eliminar comprobantes" },
      { key: "sale_notes.view", label: "Ver notas de venta" },
      { key: "sale_notes.create", label: "Crear notas de venta" },
      { key: "quotations.view", label: "Ver cotizaciones" },
      { key: "pos.access", label: "Acceso POS" },
    ],
  },
  {
    label: "Compras",
    permissions: [
      { key: "purchases.view", label: "Ver compras" },
      { key: "purchases.create", label: "Registrar compras" },
    ],
  },
  {
    label: "Inventario",
    permissions: [
      { key: "items.view", label: "Ver productos" },
      { key: "items.edit", label: "Editar productos" },
      { key: "inventory.view", label: "Ver movimientos" },
      { key: "inventory.adjust", label: "Ajustar stock" },
      { key: "inventory.import", label: "Importar inventario" },
    ],
  },
  {
    label: "Clientes y proveedores",
    permissions: [
      { key: "customers.view", label: "Ver clientes" },
      { key: "customers.edit", label: "Editar clientes" },
      { key: "suppliers.view", label: "Ver proveedores" },
      { key: "suppliers.edit", label: "Editar proveedores" },
    ],
  },
  {
    label: "Reportes y finanzas",
    permissions: [
      { key: "reports.view", label: "Ver reportes" },
      { key: "reports.export", label: "Exportar reportes" },
      { key: "finances.view", label: "Ver finanzas" },
      { key: "cash.view", label: "Ver cajas" },
      { key: "cash.close", label: "Cerrar cajas" },
    ],
  },
  {
    label: "Administración",
    permissions: [
      { key: "users.view", label: "Ver usuarios" },
      { key: "users.edit", label: "Gestionar usuarios" },
      { key: "settings.view", label: "Ver configuración" },
      { key: "settings.edit", label: "Editar configuración" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export function parsePermissions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function isAdminType(type: string) {
  return type === "admin" || type === "ADMINISTRADOR";
}
