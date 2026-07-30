import { NextResponse } from "next/server";
import { hasHtmlShell, readHtmlShell, readPages, resolveExtractedPath } from "@/lib/extracted-ui";
import { findNavLabel } from "@/lib/page-registry";

type Props = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  const segments = (await params).path || [];
  const routePath = "/" + segments.join("/");
  const pages = readPages();
  const resolved = resolveExtractedPath(routePath);
  const page = pages.find((p) => p.path === routePath || p.path === resolved);

  if (page) {
    return NextResponse.json({
      path: routePath,
      title: page.title,
      table_headers: page.table_headers,
      buttons: page.buttons,
      labels: page.labels,
      headings: page.headings,
    });
  }

  return NextResponse.json({
    path: routePath,
    title: findNavLabel(routePath),
    table_headers: [],
    buttons: [],
  });
}
