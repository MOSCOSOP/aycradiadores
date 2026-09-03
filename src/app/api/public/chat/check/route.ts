import { NextRequest, NextResponse } from "next/server";
import { checkChatDni } from "@/lib/chat/public-chat";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await checkChatDni(String(body.dni || ""));
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
