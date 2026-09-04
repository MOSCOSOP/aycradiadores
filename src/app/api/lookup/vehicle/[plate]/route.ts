import { NextResponse } from "next/server";

type Props = { params: Promise<{ plate: string }> };

type MiTorritoResponse = {
  exists: boolean;
  plate?: string;
  make?: string;
  model?: string;
  color?: string;
  image?: {
    urls?: { onWhite?: string; transparent?: string };
    label?: string;
  };
};

/** Consulta placa en mitorito.pe — no requiere clave (la compró el cliente pero el endpoint
 * es público). Si la placa no existe en su base, "exists" viene en false: no es un error, el
 * usuario simplemente completa los datos del vehículo a mano. */
export async function GET(_req: Request, { params }: Props) {
  const plate = (await params).plate?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!plate) {
    return NextResponse.json({ error: "Placa inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.mitorito.pe/api/vehicles/exists?plate=${encodeURIComponent(plate)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo consultar la placa" }, { status: 502 });
    }
    const data = (await res.json()) as MiTorritoResponse;
    if (!data.exists) {
      return NextResponse.json({ exists: false, plate });
    }
    return NextResponse.json({
      exists: true,
      plate: data.plate ?? plate,
      brand: data.make ?? "",
      model: data.model ?? "",
      color: data.color ?? "",
      image_url: data.image?.urls?.onWhite ?? data.image?.urls?.transparent ?? "",
      image_label: data.image?.label ?? "",
    });
  } catch {
    return NextResponse.json({ error: "Error consultando la placa" }, { status: 502 });
  }
}
