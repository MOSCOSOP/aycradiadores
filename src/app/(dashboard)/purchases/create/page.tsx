"use client";

import { CreateTradeForm } from "@/components/forms/CreateTradeForm";
import { api } from "@/lib/api/client";

export default function CreatePurchasePage() {
  return (
    <CreateTradeForm
      title="Nueva compra"
      partyType="supplier"
      partyLabel="Proveedor"
      redirectPath="/purchases"
      linkStock
      onSubmit={(p) => api.purchases.create(p)}
    />
  );
}
