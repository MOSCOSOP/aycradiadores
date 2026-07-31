/**
 * Sincroniza el admin en Supabase con ADMIN_EMAIL / ADMIN_PASSWORD del .env
 *
 *   npm run db:reset-admin
 */
import { syncAdminUserFromEnv } from "../src/lib/auth/admin-user";

async function main() {
  const user = await syncAdminUserFromEnv();
  console.log(`Admin actualizado: ${user.email} (id ${user.id})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
