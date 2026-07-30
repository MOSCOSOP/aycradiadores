"use client";

import { usePathname } from "next/navigation";
import { ClonedModulePage } from "@/components/modules/ClonedModulePage";
import { CreateSaleNoteForm } from "@/components/sale-notes/CreateSaleNoteForm";

export default function CreateSaleNotePage() {
  const pathname = usePathname();
  return (
    <ClonedModulePage
      pathname={pathname}
      fallback={<CreateSaleNoteForm />}
    />
  );
}
