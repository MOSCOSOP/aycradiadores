import { notFound } from "next/navigation";
import { getDocumentByShareToken } from "@/lib/comprobante/public-document";
import { PublicComprobanteView } from "@/components/documents/PublicComprobanteView";

export default async function PublicComprobantePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await getDocumentByShareToken(token);
  if (!receipt) notFound();
  return <PublicComprobanteView receipt={receipt} />;
}
