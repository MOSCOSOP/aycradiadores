import { NextRequest, NextResponse } from "next/server";
import { getDocumentByShareToken } from "@/lib/comprobante/public-document";
import { buildPublicComprobanteUrl } from "@/lib/comprobante/share-link";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const receipt = await getDocumentByShareToken(token);
  if (!receipt) {
    return NextResponse.json({ error: "Comprobante no encontrado" }, { status: 404 });
  }
  return NextResponse.json({
    data: receipt,
    public_url: buildPublicComprobanteUrl(token),
  });
}
