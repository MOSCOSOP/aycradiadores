import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const ruc = new URL(req.url).searchParams.get("ruc")?.replace(/\D/g, "");
  if (!ruc || ruc.length !== 11) {
    return NextResponse.json({ error: "RUC inválido (11 dígitos)" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://ruccheck.pe/api/ruc?ruc=${ruc}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se encontró el RUC" }, { status: res.status });
    }
    const data = (await res.json()) as Record<string, unknown>;

    return NextResponse.json({
      identity_document_type_id: "6",
      number: String(data.ruc || ruc),
      name: String(data.razon_social || ""),
      address: String(data.direccion || ""),
      district: String(data.distrito || ""),
      province: String(data.provincia || ""),
      department: String(data.departamento || ""),
      state: String(data.estado || data.estado_raw || ""),
      condition: String(data.condicion || data.condicion_raw || ""),
    });
  } catch {
    return NextResponse.json({ error: "Error consultando RUC" }, { status: 502 });
  }
}
