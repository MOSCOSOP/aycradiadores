import { notFound } from "next/navigation";
import { getSaleNoteByShareToken } from "@/lib/comprobante/public-note";
import { PublicSimpleDocView } from "@/components/documents/PublicSimpleDocView";

export default async function PublicSaleNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getSaleNoteByShareToken(token);
  if (!receipt) notFound();
  return <PublicSimpleDocView receipt={receipt} />;
}
