"use client";

import { CreateTradeForm } from "@/components/forms/CreateTradeForm";
import { api } from "@/lib/api/client";

export default function CreateQuotationPage() {
  return (
    <CreateTradeForm
      title="Nueva cotización"
      partyType="customer"
      partyLabel="Cliente"
      redirectPath="/quotations"
      onSubmit={(p) => api.quotations.create(p)}
    />
  );
}
