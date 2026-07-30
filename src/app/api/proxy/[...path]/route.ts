import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { remoteFetch } from "@/lib/api/remote";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { path } = await context.params;
  const remotePath = "/" + path.join("/");
  const search = Object.fromEntries(req.nextUrl.searchParams.entries());

  try {
    let body: unknown;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const text = await req.text();
      body = text ? JSON.parse(text) : undefined;
    }

    const data = await remoteFetch(remotePath, {
      session,
      method: req.method,
      searchParams: search,
      body,
    });
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error en proxy";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
