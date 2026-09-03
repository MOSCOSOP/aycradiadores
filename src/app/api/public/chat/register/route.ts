import { NextRequest, NextResponse } from "next/server";
import { registerOrResumeChatCustomer } from "@/lib/chat/public-chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identity = await registerOrResumeChatCustomer(String(body.name || ""), String(body.dni || ""));
    return NextResponse.json({ data: identity });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No se pudo registrar" }, { status: 400 });
  }
}
