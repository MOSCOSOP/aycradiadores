#!/bin/sh
set -e
cd /app
export DATABASE_URL="${DATABASE_URL:-file:./data/app.db}"
mkdir -p /app/data
npx prisma db push --skip-generate 2>/dev/null || node node_modules/prisma/build/index.js db push --skip-generate
npx tsx prisma/seed.ts 2>/dev/null || node node_modules/tsx/dist/cli.mjs prisma/seed.ts
exec "$@"
