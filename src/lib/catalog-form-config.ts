export type CatalogFieldType = "text" | "number" | "select" | "textarea" | "date";

export type CatalogField = {
  key: string;
  label: string;
  type?: CatalogFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

const STATE_OPTIONS = ["Activo", "Inactivo", "Registrado", "Anulado", "Pendiente", "Aceptado"];

const BASE_FIELDS: CatalogField[] = [
  { key: "name", label: "Nombre / título", required: true },
  { key: "description", label: "Descripción", type: "textarea" },
  {
    key: "state",
    label: "Estado",
    type: "select",
    options: STATE_OPTIONS,
  },
];

const MODULE_EXTRA_FIELDS: Record<string, CatalogField[]> = {
  "/inventory-references": [
    { key: "code", label: "Código" },
    { key: "reference", label: "Referencia" },
    { key: "warehouse_description", label: "Almacén" },
    { key: "item_description", label: "Producto" },
    { key: "observation", label: "Observaciones", type: "textarea" },
  ],
  "/transfers": [
    { key: "number", label: "Número" },
    { key: "warehouse_origin", label: "Almacén origen" },
    { key: "warehouse_destination", label: "Almacén destino" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "observation", label: "Observaciones", type: "textarea" },
  ],
  "/devolutions": [
    { key: "number", label: "Número" },
    { key: "reference", label: "Referencia" },
    { key: "customer_name", label: "Cliente" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "total", label: "Total", type: "number" },
  ],
  "/brands": [
    { key: "code", label: "Código" },
    { key: "observation", label: "Observaciones", type: "textarea" },
  ],
  "/cupones": [
    { key: "code", label: "Código cupón", required: true },
    { key: "discount", label: "Descuento (%)", type: "number" },
    { key: "amount", label: "Monto fijo", type: "number" },
    { key: "date", label: "Vigencia", type: "date" },
  ],
  "/transports": [
    { key: "identity_document_type_id", label: "Tipo documento", type: "select", options: ["RUC", "DNI", "C.E.", "Pasaporte"] },
    { key: "document_number", label: "RUC / documento", required: true },
    { key: "address", label: "Dirección fiscal", type: "textarea" },
    { key: "mtc", label: "MTC" },
    { key: "telephone", label: "Teléfono" },
    { key: "email", label: "Correo" },
  ],
  "/drivers": [
    { key: "document_number", label: "DNI / licencia" },
    { key: "telephone", label: "Teléfono" },
    { key: "license", label: "N° licencia" },
  ],
  "/vehicles": [
    { key: "plate", label: "Placa", required: true },
    { key: "brand", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "capacity", label: "Capacidad (kg)", type: "number" },
  ],
  "/discount-types": [
    { key: "code", label: "Código" },
    { key: "percentage", label: "Porcentaje", type: "number" },
  ],
  "/price-adjustments": [
    { key: "code", label: "Código" },
    { key: "percentage", label: "Porcentaje", type: "number" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/ingredients": [
    { key: "code", label: "Código" },
    { key: "unit_type_id", label: "Unidad" },
    { key: "quantity", label: "Cantidad", type: "number" },
  ],
  "/lines": [
    { key: "code", label: "Código" },
    { key: "reference", label: "Referencia" },
  ],
  "/voided": [
    { key: "number", label: "Número" },
    { key: "document_type", label: "Tipo comprobante" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "observation", label: "Motivo", type: "textarea" },
  ],
  "/summaries": [
    { key: "number", label: "Número" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "reference", label: "Referencia" },
  ],
  "/dispatches-carrier": [
    { key: "number", label: "Número" },
    { key: "carrier_name", label: "Transportista" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/item-sets": [
    { key: "code", label: "Código pack" },
    { key: "amount", label: "Precio pack", type: "number" },
    { key: "date", label: "Vigencia", type: "date" },
  ],
  "/person-types": [
    { key: "code", label: "Código" },
    { key: "reference", label: "Referencia SUNAT" },
  ],
  "/zones": [
    { key: "code", label: "Código zona" },
    { key: "reference", label: "Referencia" },
  ],
  "/series": [
    { key: "number", label: "Serie" },
    { key: "document_type_id", label: "Tipo documento" },
    { key: "establishment_id", label: "Local ID", type: "number" },
  ],
  "/item-lots": [
    { key: "code", label: "Código lote" },
    { key: "item_description", label: "Producto" },
    { key: "quantity", label: "Cantidad", type: "number" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/expenses": [
    { key: "number", label: "Número" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "amount", label: "Monto", type: "number" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/payroll": [
    { key: "employee_name", label: "Empleado" },
    { key: "document_number", label: "DNI" },
    { key: "amount", label: "Sueldo", type: "number" },
    { key: "date", label: "Periodo", type: "date" },
  ],
  "/retentions": [
    { key: "number", label: "Número" },
    { key: "customer_name", label: "Cliente" },
    { key: "percentage", label: "Porcentaje", type: "number" },
    { key: "total", label: "Total", type: "number" },
  ],
  "/perceptions": [
    { key: "number", label: "Número" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "percentage", label: "Porcentaje", type: "number" },
    { key: "total", label: "Total", type: "number" },
  ],
  "/contingencies": [
    { key: "number", label: "Número" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "observation", label: "Motivo", type: "textarea" },
  ],
  "/technical-services": [
    { key: "number", label: "N° servicio" },
    { key: "customer_name", label: "Cliente" },
    { key: "plate", label: "Placa" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/purchase-orders": [
    { key: "number", label: "N° orden" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "total", label: "Total", type: "number" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/purchase-quotations": [
    { key: "number", label: "N° cotización" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "total", label: "Total", type: "number" },
  ],
  "/purchase-settlements": [
    { key: "number", label: "Número" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "total", label: "Total", type: "number" },
  ],
  "/order-forms": [
    { key: "number", label: "Número" },
    { key: "customer_name", label: "Cliente" },
    { key: "date", label: "Fecha", type: "date" },
  ],
  "/delivery-orders": [
    { key: "number", label: "Número" },
    { key: "customer_name", label: "Cliente" },
    { key: "date", label: "Fecha entrega", type: "date" },
  ],
  "/origin-addresses": [
    { key: "address", label: "Dirección", type: "textarea" },
    { key: "ubigeo", label: "Ubigeo" },
    { key: "reference", label: "Referencia" },
  ],
  "/documents-recurrence": [
    { key: "customer_name", label: "Cliente" },
    { key: "document_type", label: "Tipo comprobante" },
    { key: "frequency", label: "Frecuencia" },
    { key: "date", label: "Próxima emisión", type: "date" },
  ],
  "/complaints-book": [
    { key: "number", label: "N° reclamo" },
    { key: "customer_name", label: "Cliente" },
    { key: "date", label: "Fecha", type: "date" },
    { key: "observation", label: "Detalle", type: "textarea" },
  ],
  "/finances/movements": [
    { key: "date", label: "Fecha", type: "date" },
    { key: "type", label: "Tipo" },
    { key: "description", label: "Descripción" },
    { key: "customer", label: "Cliente / tercero" },
    { key: "amount", label: "Monto", type: "number" },
    { key: "currency", label: "Moneda" },
  ],
  "/finances/income": [
    { key: "date", label: "Fecha", type: "date" },
    { key: "description", label: "Descripción" },
    { key: "amount", label: "Monto", type: "number" },
  ],
  "/finances/to-pay": [
    { key: "date", label: "Fecha", type: "date" },
    { key: "supplier", label: "Proveedor" },
    { key: "document", label: "Documento" },
    { key: "amount", label: "Monto", type: "number" },
    { key: "due_date", label: "Vencimiento", type: "date" },
  ],
  "/finances/to-collect": [
    { key: "date", label: "Fecha", type: "date" },
    { key: "customer", label: "Cliente" },
    { key: "document", label: "Documento" },
    { key: "amount", label: "Monto", type: "number" },
    { key: "due_date", label: "Vencimiento", type: "date" },
  ],
  "/fixed-asset/items": [
    { key: "code", label: "Código" },
    { key: "description", label: "Descripción" },
    { key: "amount", label: "Valor", type: "number" },
    { key: "date", label: "Fecha adquisición", type: "date" },
  ],
  "/fixed-asset/purchases": [
    { key: "number", label: "Número" },
    { key: "supplier_name", label: "Proveedor" },
    { key: "total", label: "Total", type: "number" },
  ],
};

const DEFAULT_EXTRA: CatalogField[] = [
  { key: "code", label: "Código" },
  { key: "reference", label: "Referencia" },
  { key: "number", label: "Número" },
  { key: "date", label: "Fecha", type: "date" },
  { key: "observation", label: "Observaciones", type: "textarea" },
];

export function getCatalogFields(pathname: string): CatalogField[] {
  const extras = MODULE_EXTRA_FIELDS[pathname] ?? DEFAULT_EXTRA;
  const keys = new Set<string>();
  const merged: CatalogField[] = [];
  for (const f of [...BASE_FIELDS, ...extras]) {
    if (keys.has(f.key)) continue;
    keys.add(f.key);
    merged.push(f);
  }
  return merged;
}

// Traducciones para campos que aparecen en respuestas genéricas (a veces del historial
// importado) pero que ningún CatalogField de este módulo declara explícitamente. Sin esto, el
// encabezado de la columna caía al nombre técnico del campo tal cual (en inglés) — ej.
// "customer_name" se mostraba literal como "Customer Name" en vez de "Cliente".
const COMMON_COLUMN_LABELS: Record<string, string> = {
  name: "Nombre",
  description: "Descripción",
  number: "Número",
  code: "Código",
  reference: "Referencia",
  state: "Estado",
  date: "Fecha",
  warehouse_description: "Almacén",
  plate: "Placa",
  total: "Total",
  customer_name: "Cliente",
  customer_number: "RUC/DNI",
  supplier_name: "Proveedor",
  carrier_name: "Transportista",
  document_type: "Tipo de documento",
  document_type_description: "Tipo de documento",
  state_type_description: "Estado",
  total_pending: "Pendiente",
  balance: "Saldo",
  email: "Correo",
  phone: "Teléfono",
  telephone: "Teléfono",
  address: "Dirección",
  category: "Categoría",
  unit: "Unidad",
  unit_type_id: "Unidad",
  quantity: "Cantidad",
  price: "Precio",
  amount: "Monto",
  percentage: "Porcentaje",
  active: "Activo",
  observations: "Observaciones",
  observation: "Observación",
  frequency: "Frecuencia",
  document_number: "N° documento",
  license: "N° licencia",
  brand: "Marca",
  model: "Modelo",
  capacity: "Capacidad (kg)",
  ubigeo: "Ubigeo",
  driver_name: "Conductor",
  vehicle_plate: "Placa",
  due_date: "Vencimiento",
  document: "Documento",
  type: "Tipo",
  currency: "Moneda",
  item_description: "Producto",
  employee_name: "Empleado",
};

export function getCatalogDisplayColumns(pathname: string, sample?: Record<string, unknown>) {
  const preferred = [
    "name",
    "description",
    "number",
    "code",
    "reference",
    "state",
    "date",
    "warehouse_description",
    "plate",
    "total",
  ];
  const fromSample =
    sample &&
    Object.keys(sample).filter(
      (k) =>
        !["id", "created_at", "updated_at", "local_id", "actions"].includes(k) &&
        sample[k] != null &&
        String(sample[k]).trim() !== ""
    );
  const keys = [...preferred];
  if (fromSample) {
    for (const k of fromSample) {
      if (!keys.includes(k)) keys.push(k);
    }
  }
  // Prioriza la etiqueta en español ya configurada para este módulo (CatalogField.label), luego
  // el diccionario común, y solo al final el nombre técnico del campo como último recurso.
  const configuredFields = getCatalogFields(pathname);
  const labelFor = (key: string): string => {
    const configured = configuredFields.find((f) => f.key === key);
    if (configured) return configured.label;
    if (COMMON_COLUMN_LABELS[key]) return COMMON_COLUMN_LABELS[key];
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };
  return keys.slice(0, 8).map((key) => ({ key, label: labelFor(key) }));
}

export function emptyCatalogForm(fields: CatalogField[]): Record<string, string> {
  const form: Record<string, string> = {};
  for (const f of fields) {
    form[f.key] = f.key === "state" ? "Activo" : "";
  }
  return form;
}

export function rowToCatalogForm(row: Record<string, unknown>, fields: CatalogField[]): Record<string, string> {
  const form = emptyCatalogForm(fields);
  for (const f of fields) {
    const v = row[f.key];
    if (v != null && v !== "") form[f.key] = String(v);
    else if (f.key === "name" && row.description) form.name = String(row.description);
    else if (f.key === "description" && row.name) form.description = String(row.name);
  }
  return form;
}
