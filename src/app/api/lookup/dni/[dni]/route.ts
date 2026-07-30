import { NextResponse } from "next/server";

type Props = { params: Promise<{ dni: string }> };

export async function GET(_req: Request, { params }: Props) {
  const dni = (await params).dni?.replace(/\D/g, "");
  if (!dni || dni.length !== 8) {
    return NextResponse.json({ error: "DNI inválido (8 dígitos)" }, { status: 400 });
  }

  const token = process.env.DNI_LOOKUP_TOKEN || "elpepe12342";
  const base = (process.env.DNI_LOOKUP_BASE || "http://18.188.31.43:3000").replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/api/sdni/${dni}?token=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se encontró el DNI" }, { status: res.status });
    }
    const data = (await res.json()) as Record<string, unknown>;
    if (!data.encontrado) {
      return NextResponse.json({ error: "DNI no encontrado" }, { status: 404 });
    }

    const nombres = String(data.nombres || "").trim();
    const apPat = String(data.apellido_paterno || "").trim();
    const apMat = String(data.apellido_materno || "").trim();
    const nombreCompleto =
      String(data.nombre_completo || "").trim() ||
      [apPat, apMat, nombres].filter(Boolean).join(" ").trim();

    return NextResponse.json({
      identity_document_type_id: "1",
      number: String(data.numero || data.dni || dni),
      verification_code: String(data.codigo_verificacion || ""),
      name: nombreCompleto,
      nombres,
      sex: String(data.sexo || ""),
      birth_date: String(data.fecha_nacimiento || ""),
      address: String(data.direccion || data.direccion_completa || ""),
    });
  } catch {
    return NextResponse.json({ error: "Error consultando DNI" }, { status: 502 });
  }
}
