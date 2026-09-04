import { notFound } from "next/navigation";
import { getSaleNoteByShareToken } from "@/lib/comprobante/public-note";
import { SimpleDocPublicView } from "@/components/shared/SimpleDocPublicView";

export default async function PublicSaleNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const doc = await getSaleNoteByShareToken(token);
  if (!doc) notFound();
  return <SimpleDocPublicView doc={doc} />;
}
