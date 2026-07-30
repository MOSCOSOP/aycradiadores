# Inicia Factura Ya — Clon completo

Réplica del ERP **Inicia Factura Ya** con UI clonada + **API proxy** al sistema original.

## Arquitectura

```
Frontend (Next.js)  →  /api/proxy/*  →  aycradiadores.iniciafacturaya.com
                     →  /api/auth/login (sesión Laravel)
```

| Capa | Descripción |
|------|-------------|
| **UI** | Sidebar, login, crear comprobante, listados — clon visual Acorn |
| **API Client** | `src/lib/api/client.ts` — consume proxy local |
| **Proxy** | `src/app/api/proxy/[...path]` — reenvía a Laravel remoto |
| **Auth** | Login real contra `/login` remoto, cookies en sesión httpOnly |

## Configuración

Copia `.env.example` a `.env.local`:

```env
REMOTE_API_URL=https://aycradiadores.iniciafacturaya.com
REMOTE_API_EMAIL=admin@aycradiadores.com
REMOTE_API_PASSWORD=tu_clave
API_MODE=remote
```

## Clonador Python (solo diseño, sin datos)

Extrae **textos, menú, CSS y shells HTML** para white-label de un nuevo cliente. **Excluye WhatsApp** y no guarda comprobantes/clientes reales.

```bash
pip install -r scripts/requirements-scraper.txt
python scripts/clone_ui.py
```

Lee credenciales de `.env.local`. Salida en `extracted-ui/`:

| Archivo | Contenido |
|---------|-----------|
| `menu.json` | Menú navegación (sin WhatsApp) |
| `pages.json` | Labels, botones, columnas por página |
| `ui-texts.json` | Todos los textos UI únicos |
| `design-tokens.json` | Tema Acorn (colores, fuentes) |
| `html-shells/` | HTML sanitizado sin datos |
| `assets/css/` | CSS descargado |
| `navigation.generated.ts` | Menú listo para importar |

## Desarrollo

```bash
npm install
npm run dev
```

1. Abre http://localhost:3000/login
2. Ingresa credenciales del cliente
3. Navega por módulos — los datos son **reales** vía API

## Rutas implementadas

| Ruta | Función |
|------|---------|
| `/login` | Auth real contra IFY |
| `/dashboard` | Resumen con datos API |
| `/documents/create` | Crear comprobante + búsqueda clientes/productos |
| `/documents` | Listado comprobantes |
| `/persons/customers` | Clientes |
| `/items` | Productos |
| `/pos` | POS (datos de /pos/tables) |

## Endpoints API descubiertos

Ver `src/lib/api/endpoints.ts` y `scripts/API-ENDPOINTS.md`.

Patrón Laravel típico:
- `GET /documents/records?page=1&limit=20`
- `GET /documents/tables` — catálogos del formulario
- `GET /persons/customers/records?column=name&value=...`
- `GET /items/records?column=description&value=...`
- `GET /pos/tables`
- `GET /establishments/records`

## Lo que puedes conectar tú

En `.env.local` o extendiendo `endpoints.ts`:

- **Certificado SUNAT / PSE** — credenciales OSE (NubeFact, etc.)
- **WhatsApp API** — tokens Gekawa del panel original
- **Logo/favicon** — en `public/images/`
- **Otros módulos** — agregar página + entrada en `NAV_ITEMS` + endpoint en `API`

## Próximos pasos

1. POST `/documents` — emitir comprobante real
2. Clonar UI del POS completa
3. Módulos Compras, Inventario, Reportes
4. Modo `API_MODE=local` — backend propio sin depender del remoto

## Nota

Los HTML/JS extraídos del servidor remoto pueden contener datos sensibles — están en `.gitignore`. No commitear credenciales.
