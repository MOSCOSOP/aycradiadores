import { notFound } from "next/navigation";
import { getQuotationByShareToken } from "@/lib/comprobante/public-note";
import { SimpleDocPublicView } from "@/components/shared/SimpleDocPublicView";

export default async function PublicQuotationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const doc = await getQuotationByShareToken(token);
  if (!doc) notFound();
  return <SimpleDocPublicView doc={doc} />;
}
