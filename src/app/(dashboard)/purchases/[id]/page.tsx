"use client";

import { TradeDetail } from "@/components/forms/TradeDetail";
import { api } from "@/lib/api/client";

export default function PurchaseDetailPage() {
  return (
    <TradeDetail
      title="Compra"
      listPath="/purchases"
      partyKey="supplier_name"
      fetchFn={(id) => api.purchases.get(id)}
    />
  );
}
