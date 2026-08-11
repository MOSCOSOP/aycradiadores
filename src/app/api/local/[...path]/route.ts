import { NextRequest, NextResponse } from "next/server";
import { handleLocalApi } from "@/lib/api/local/router";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const search = req.nextUrl.searchParams;

  try {
    let body: unknown;
    if (req.method !== "GET" && req.method !== "HEAD") {
      const text = await req.text();
      body = text ? JSON.parse(text) : undefined;
    }

    const data = await handleLocalApi(req.method, path, search, body);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error API local";
    if (message === "DUPLICATE_CUSTOMER" && e instanceof Error && "duplicate" in e) {
      return NextResponse.json(
        {
          error: "Ya existe un cliente con este documento en la lista.",
          code: "DUPLICATE_CUSTOMER",
          duplicate: (e as Error & { duplicate?: unknown }).duplicate,
        },
        { status: 409 }
      );
    }
    const status = message.includes("no implementada") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
