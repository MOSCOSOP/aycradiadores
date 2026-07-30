#!/usr/bin/env bash
set -euo pipefail

echo "==> Instalando dependencias..."
npm ci

echo "==> Generando cliente Prisma..."
npx prisma generate

echo "==> Aplicando schema a Supabase PostgreSQL..."
npx prisma db push

echo "==> Seed inicial (admin + empresa)..."
npm run db:seed

echo "==> Build producción..."
npm run build

echo "==> Listo. Inicia con: npm start"
echo "    o con Docker: docker compose up -d --build"
