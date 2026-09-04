"use client";

import { TradeDetail } from "@/components/forms/TradeDetail";
import { api } from "@/lib/api/client";

export default function QuotationDetailPage() {
  return (
    <TradeDetail
      title="Cotización"
      listPath="/quotations"
      fetchFn={(id) => api.quotations.get(id)}
      shareKind="quotations"
    />
  );
}
