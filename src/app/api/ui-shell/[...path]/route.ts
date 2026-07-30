import { NextResponse } from "next/server";
import { hasHtmlShell, readHtmlShell } from "@/lib/extracted-ui";

type Props = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  const segments = (await params).path || [];
  const routePath = "/" + segments.join("/");
  const html = readHtmlShell(routePath);
  if (!html) {
    return new NextResponse("Pantalla no clonada. Ejecuta: npm run clone:all", { status: 404 });
  }
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function HEAD(_req: Request, { params }: Props) {
  const segments = (await params).path || [];
  const routePath = "/" + segments.join("/");
  return new NextResponse(null, { status: hasHtmlShell(routePath) ? 200 : 404 });
}
