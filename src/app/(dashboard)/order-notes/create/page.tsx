"use client";

import { CreateTradeForm } from "@/components/forms/CreateTradeForm";
import { api } from "@/lib/api/client";

export default function CreateOrderNotePage() {
  return (
    <CreateTradeForm
      title="Nuevo pedido"
      partyType="customer"
      partyLabel="Cliente"
      redirectPath="/order-notes"
      onSubmit={(p) => api.orderNotes.create(p)}
    />
  );
}
