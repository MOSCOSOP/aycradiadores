import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    mode: session.mode || "remote",
    user: session.user,
    remoteUrl: session.remoteUrl || null,
  });
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
