import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const ruc = new URL(req.url).searchParams.get("ruc")?.replace(/\D/g, "");
  if (!ruc || ruc.length !== 11) {
    return NextResponse.json({ error: "RUC inválido (11 dígitos)" }, { status: 400 });
  }

  const token = process.env.RUC_LOOKUP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Falta configurar RUC_LOOKUP_TOKEN" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api-codart.cgrt.org/api/v1/consultas/sunat/ruc/${ruc}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se encontró el RUC" }, { status: res.status });
    }
    const json = (await res.json()) as { success?: boolean; result?: Record<string, unknown> };
    const data = json.result;
    if (!json.success || !data) {
      return NextResponse.json({ error: "RUC no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      identity_document_type_id: "6",
      number: String(data.numero_documento || ruc),
      name: String(data.razon_social || ""),
      address: String(data.direccion || ""),
      district: String(data.distrito || ""),
      province: String(data.provincia || ""),
      department: String(data.departamento || ""),
      state: String(data.estado || ""),
      condition: String(data.condicion || ""),
    });
  } catch {
    return NextResponse.json({ error: "Error consultando RUC" }, { status: 502 });
  }
}
