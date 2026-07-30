# Endpoints API — Inicia Factura Ya (Laravel)

Extraídos de `aycradiadores.iniciafacturaya.com` (Jul 2026).

## Patrón general

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/{module}/records` | Listado paginado JSON |
| GET | `/{module}/tables` | Catálogos para formularios |
| GET | `/{module}/columns` | Columnas exportables |
| POST | `/{module}` | Crear registro |
| PUT | `/{module}/{id}` | Actualizar |
| DELETE | `/{module}/{id}` | Eliminar |

## Query params comunes

```
?page=1&limit=20&order=desc&column=date_of_issue&value=
?column=name&value=cliente&page=1&limit=10
```

## Módulos verificados (200 OK)

### Ventas / Documentos
- `GET /documents/records`
- `GET /documents/tables`
- `GET /sale-notes/records`
- `GET /quotations/records`
- `GET /order-notes/records`
- `GET /voided/records`
- `GET /summaries/records`

### Personas
- `GET /persons/customers/records`
- `GET /persons/suppliers/records`

### Productos
- `GET /items/records`
- `GET /items/columns`

### POS
- `GET /pos/tables`

### Compras
- `GET /purchases/records`

### Inventario
- `GET /inventory/records`
- `GET /inventory-references/records`
- `GET /transfers/records`

### Configuración
- `GET /establishments/records`
- `GET /users/records`

## Uso en el clon

```typescript
import { api } from "@/lib/api/client";

// Listado comprobantes
await api.documents.records({ page: 1, limit: 20, order: "desc" });

// Catálogos formulario
await api.documents.tables();

// Buscar cliente
await api.customers.search("garcia", 10);

// Buscar producto
await api.items.search("radiador", 10);
```

Proxy interno: `GET /api/proxy/documents/records?page=1`
