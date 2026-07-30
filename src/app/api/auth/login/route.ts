import { NextRequest, NextResponse } from "next/server";
import { localLogin } from "@/lib/api/local/router";
import { isLocalMode } from "@/lib/db/prisma";
import { remoteLogin } from "@/lib/api/remote";
import { clearSession, setSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email || process.env.ADMIN_EMAIL || process.env.REMOTE_API_EMAIL;
    const password =
      body.password || process.env.ADMIN_PASSWORD || process.env.REMOTE_API_PASSWORD;

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    if (isLocalMode()) {
      const user = await localLogin(email, password);
      await setSession({
        cookieHeader: "",
        csrfToken: "local",
        remoteUrl: "",
        mode: "local",
        userId: user.id,
        user: { name: user.name, email: user.email, type: user.type },
      });
      return NextResponse.json({ ok: true, user: { name: user.name, email: user.email } });
    }

    const session = await remoteLogin(email, password);
    await setSession({ ...session, mode: "remote" });
    return NextResponse.json({ ok: true, user: session.user });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error de autenticación";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
