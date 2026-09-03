import type { Metadata } from "next";
import { CustomerChatView } from "@/components/chat/CustomerChatView";

export const metadata: Metadata = {
  title: "Chat con nosotros",
};

export default function CustomerChatPage() {
  return <CustomerChatView />;
}
