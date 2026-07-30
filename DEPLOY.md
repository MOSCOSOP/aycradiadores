# Despliegue

**Recomendado:** [VERCEL.md](./VERCEL.md) — GitHub → Vercel + Supabase.

Para VPS/Docker ver sección legacy abajo (opcional).

## 1. Supabase (base de datos)

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto `owrdawssgouastfltyya`
2. **Settings → Database** → copia la contraseña de PostgreSQL
3. En **Connection string** elige **URI** y reemplaza `[YOUR-PASSWORD]`

Variables en `.env` del servidor:

```env
SUPABASE_URL=https://owrdawssgouastfltyya.supabase.co
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
SUPABASE_JWKS_URL=https://owrdawssgouastfltyya.supabase.co/auth/v1/.well-known/jwks.json

DATABASE_URL=postgresql://postgres.owrdawssgouastfltyya:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.owrdawssgouastfltyya:TU_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

> Si tu región no es `us-east-1`, usa la URI exacta que muestra Supabase.

## 2. VPS (Ubuntu/Debian)

```bash
# Node 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git

git clone <tu-repo> /opt/inicia-factura-clone
cd /opt/inicia-factura-clone
cp .env.example .env
# Edita .env con tus claves Supabase y contraseña DB

npm ci
bash scripts/deploy-vps.sh
npm start
```

La app queda en `http://TU_IP:3000`

## 3. Docker (recomendado producción)

```bash
cp .env.example .env
# Completa .env
docker compose up -d --build
```

## 4. Nginx + HTTPS (opcional)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Luego: `sudo certbot --nginx -d tu-dominio.com`

## 5. PM2 (alternativa a Docker)

```bash
npm run deploy:vps
npm install -g pm2
pm2 start npm --name "ify" -- start
pm2 save
pm2 startup
```

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run db:push` | Sincronizar schema Prisma → Supabase |
| `npm run db:seed` | Crear admin y empresa demo |
| `npm run build` | Build producción |
| `npm start` | Servidor Next.js (puerto 3000) |
