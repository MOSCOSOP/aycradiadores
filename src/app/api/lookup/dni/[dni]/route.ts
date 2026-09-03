import { NextResponse } from "next/server";

type Props = { params: Promise<{ dni: string }> };

/** Convierte "1987-07-20" (formato del proveedor) a "20/07/1987" (formato que usa el resto
 * de la app, ej. el campo "Fecha nacimiento" del formulario de cliente). */
function toDisplayDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export async function GET(_req: Request, { params }: Props) {
  const dni = (await params).dni?.replace(/\D/g, "");
  if (!dni || dni.length !== 8) {
    return NextResponse.json({ error: "DNI inválido (8 dígitos)" }, { status: 400 });
  }

  const token = process.env.DNI_LOOKUP_TOKEN;
  const base = (process.env.DNI_LOOKUP_BASE || "http://169.58.248.127:3000").replace(/\/+$/, "");
  if (!token) {
    return NextResponse.json({ error: "Falta configurar DNI_LOOKUP_TOKEN" }, { status: 500 });
  }

  try {
    const res = await fetch(`${base}/api/v1/dni/${dni}?api_key=${encodeURIComponent(token)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se encontró el DNI" }, { status: res.status });
    }
    const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown> };
    const data = json.data;
    if (!json.success || !data) {
      return NextResponse.json({ error: "DNI no encontrado" }, { status: 404 });
    }

    const fechaNacimiento = String(data.fecha_nacimiento || "");

    return NextResponse.json({
      identity_document_type_id: "1",
      number: String(data.dni || dni),
      verification_code: String(data.codigo_verificacion || ""),
      name: String(data.nombre_completo || ""),
      nombres: String(data.nombres || ""),
      sex: String(data.genero || ""),
      birth_date: fechaNacimiento ? toDisplayDate(fechaNacimiento) : "",
      address: String(data.direccion_completa || data.direccion || ""),
    });
  } catch {
    return NextResponse.json({ error: "Error consultando DNI" }, { status: 502 });
  }
}
