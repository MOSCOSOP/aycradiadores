import { NextRequest, NextResponse } from "next/server";
import { listChatMessages, postCustomerMessage } from "@/lib/chat/public-chat";
import { buildPublicComprobanteUrl } from "@/lib/comprobante/share-link";

type ChatMessageWithDoc = {
  id: number;
  sender: string;
  body: string;
  createdAt: Date;
  document?: { id: number; fullNumber: string; shareToken: string | null; total: number } | null;
};

function mapMessage(m: ChatMessageWithDoc) {
  return {
    id: m.id,
    sender: m.sender,
    body: m.body,
    created_at: m.createdAt,
    document: m.document
      ? {
          id: m.document.id,
          full_number: m.document.fullNumber,
          total: m.document.total,
          url: m.document.shareToken ? buildPublicComprobanteUrl(m.document.shareToken) : null,
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customer_id"));
  const dni = searchParams.get("dni") || "";
  if (!customerId || !dni) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  try {
    const { customer, messages } = await listChatMessages(customerId, dni);
    return NextResponse.json({
      data: messages.map(mapMessage),
      customer: { id: customer.id, name: customer.name, dni: customer.dni },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = await postCustomerMessage(
      Number(body.customer_id),
      String(body.dni || ""),
      String(body.body || "")
    );
    return NextResponse.json({ data: mapMessage({ ...message, document: null }) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 400 });
  }
}
