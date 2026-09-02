import { Suspense } from "react";
import { CreateDocumentForm } from "@/components/documents/CreateDocumentForm";

export default function CreateDocumentPage() {
  return (
    <Suspense fallback={<div className="p-5">Cargando...</div>}>
      <CreateDocumentForm />
    </Suspense>
  );
}
