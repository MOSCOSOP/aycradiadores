# Despliegue en Vercel (GitHub → Vercel)

## 1. Subir a GitHub

```bash
cd inicia-factura-clone
git init
git add .
git commit -m "Initial commit — Inicia Factura Ya clone"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/inicia-factura-clone.git
git push -u origin main
```

## 2. Conectar Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repo de GitHub
3. Framework: **Next.js** (detectado automáticamente)
4. Build Command: `prisma generate && next build` (ya en `vercel.json`)
5. Install Command: `npm install`

## 3. Variables de entorno en Vercel

En **Project → Settings → Environment Variables**, agrega:

| Variable | Descripción |
|----------|-------------|
| `API_MODE` | `local` |
| `NEXT_PUBLIC_API_MODE` | `local` |
| `DATABASE_URL` | URI pooler Supabase (puerto 6543) |
| `DIRECT_URL` | URI directa Supabase (puerto 5432) |
| `SUPABASE_URL` | `https://owrdawssgouastfltyya.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publishable |
| `SUPABASE_SECRET_KEY` | Clave secret (solo server) |
| `SUPABASE_JWKS_URL` | JWKS URL |
| `ADMIN_EMAIL` | Email admin login |
| `ADMIN_PASSWORD` | Contraseña admin |
| `ADMIN_NAME` | Nombre admin |
| `COMPANY_NAME` | Razón social |
| `COMPANY_TRADE_NAME` | Nombre comercial |
| `COMPANY_RUC` | RUC |
| `NEXT_PUBLIC_COMPANY_NAME` | Igual que COMPANY_NAME |
| `NEXT_PUBLIC_COMPANY_TRADE_NAME` | Igual que COMPANY_TRADE_NAME |
| `NEXT_PUBLIC_COMPANY_RUC` | Igual que COMPANY_RUC |
| `SUNAT_SOAP_USERNAME` | Usuario SOL (ej. `10447860428F3M9QC0C`) |
| `SUNAT_SOAP_PASSWORD` | Clave SOL |
| `SUNAT_API_ID` | Client ID API SUNAT / SIRE |
| `SUNAT_API_SECRET` | Client Secret API SUNAT / SIRE |
| `SUNAT_CERTIFICATE_BASE64` | Certificado `.pem` en base64 (firma XML) |

**Importante:** no subas contraseñas al repo. Configúralas solo en Vercel → Environment Variables.

## 4. Base de datos (una sola vez)

Desde tu PC, con las mismas variables de Supabase:

```bash
npx prisma db push
npm run db:seed
```

Opcional: importar datos del ERP original con `npm run clone:data`.

## 5. Deploy

Cada `git push` a `main` despliega automáticamente en Vercel.

URL final: `https://tu-proyecto.vercel.app`

## Notas

- **Supabase** es la base de datos en la nube (no hace falta VPS).
- El login usa sesión cookie (`ify_session`), compatible con Vercel serverless.
- Para dominio propio: Vercel → **Domains** → agrega tu dominio.
