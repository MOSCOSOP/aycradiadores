import { prisma } from "@/lib/db/prisma";
import { getCompanySunatConfig } from "./company-config";
import { sendDocumentViaSoap } from "./soap";
import type { SunatSendResult } from "./types";

type DocumentWithRelations = Awaited<ReturnType<typeof loadDocument>>;

async function loadDocument(id: number) {
  return prisma.document.findUnique({
    where: { id },
    include: {
      customer: true,
      establishment: { include: { company: true } },
      items: true,
    },
  });
}

export async function sendDocumentToSunat(documentId: number): Promise<SunatSendResult> {
  const config = await getCompanySunatConfig();
  if (!config) {
    return { success: false, message: "Empresa no configurada", mode: "simulated" };
  }

  const doc = await loadDocument(documentId);
  if (!doc) {
    return { success: false, message: "Comprobante no encontrado", mode: "simulated" };
  }

  if (config.send_document_to_pse && config.pse_url) {
    return sendViaPse(config.pse_url, config.pse_token, doc);
  }

  try {
    const result = await sendDocumentViaSoap(config, {
      documentTypeId: doc.documentTypeId,
      series: doc.series,
      number: doc.number,
      fullNumber: doc.fullNumber,
      dateOfIssue: doc.dateOfIssue,
      currencyTypeId: doc.currencyTypeId,
      totalTaxed: doc.totalTaxed,
      totalIgv: doc.totalIgv,
      totalExonerated: doc.totalExonerated,
      total: doc.total,
      customer: {
        name: doc.customer.name,
        number: doc.customer.number,
        identityDocumentTypeId: doc.customer.identityDocumentTypeId,
      },
      items: doc.items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitValue: i.unitValue,
        unitPrice: i.unitPrice,
        saleAffectationTypeId: i.saleAffectationTypeId,
      })),
    });

    if (result.success) {
      // Código de respuesta SUNAT = 0: aceptado de verdad (ver soap.ts, ya no se asume por HTTP 200).
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          hasXml: true,
          hasCdr: true,
          stateTypeId: "05",
          xmlContent: result.xml ?? undefined,
          cdrContent: result.cdr ?? undefined,
        },
      });
    } else if (result.xml || result.cdr) {
      // Guarda XML/CDR igual aunque SUNAT lo rechace u observe, para poder inspeccionarlo —
      // pero NO se marca como aceptado (stateTypeId se queda como estaba).
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          hasXml: result.xml ? true : undefined,
          hasCdr: result.cdr ? true : undefined,
          xmlContent: result.xml ?? undefined,
          cdrContent: result.cdr ?? undefined,
        },
      });
    }

    return result;
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : "Error al enviar a SUNAT",
      mode: "soap",
    };
  }
}

async function sendViaPse(
  pseUrl: string,
  token: string | null,
  doc: NonNullable<DocumentWithRelations>
): Promise<SunatSendResult> {
  const base = pseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/api/documents/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      number: doc.fullNumber,
      document_type_id: doc.documentTypeId,
      total: doc.total,
    }),
  }).catch(() => null);

  if (!res?.ok) {
    return {
      success: false,
      message: "PSE no respondió — verifique pse_url y pse_token",
      mode: "pse",
    };
  }

  await prisma.document.update({
    where: { id: doc.id },
    data: { hasXml: true, hasCdr: true, stateTypeId: "05" },
  });

  return {
    success: true,
    message: `Comprobante ${doc.fullNumber} enviado vía PSE`,
    mode: "pse",
  };
}

export async function autoSendAfterCreate(documentId: number) {
  const config = await getCompanySunatConfig();
  if (!config?.soap_username && !config?.send_document_to_pse) return null;
  return sendDocumentToSunat(documentId);
}
