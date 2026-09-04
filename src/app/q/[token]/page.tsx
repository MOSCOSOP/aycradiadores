import { notFound } from "next/navigation";
import { getQuotationByShareToken } from "@/lib/comprobante/public-note";
import { PublicSimpleDocView } from "@/components/documents/PublicSimpleDocView";

export default async function PublicQuotationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getQuotationByShareToken(token);
  if (!receipt) notFound();
  return <PublicSimpleDocView receipt={receipt} />;
}
