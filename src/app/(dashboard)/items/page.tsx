import { Suspense } from "react";
import { ItemsList } from "@/components/items/ItemsList";

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="p-5 text-[var(--muted)]">Cargando productos...</div>}>
      <ItemsList />
    </Suspense>
  );
}
