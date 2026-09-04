"use client";

import { TradeDetail } from "@/components/forms/TradeDetail";
import { api } from "@/lib/api/client";

export default function SaleNoteDetailPage() {
  return (
    <TradeDetail
      title="Nota de venta"
      listPath="/sale-notes"
      fetchFn={(id) => api.saleNotes.get(id)}
      shareKind="sale-notes"
    />
  );
}
