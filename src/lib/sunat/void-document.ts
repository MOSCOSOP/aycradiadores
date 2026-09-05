import { prisma } from "@/lib/db/prisma";
import { getCompanySunatConfig } from "./company-config";
import { sendVoidedDocumentsToSunat, getSunatTicketStatus } from "./soap";

async function nextVoidCommId(): Promise<string> {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const key = `void_comm_counter_${ymd}`;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const n = Number(row?.value || 0) + 1;
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: String(n) }, update: { value: String(n) } });
  // El identificador de una Comunicación de Baja va prefijado "RA" (no "RC", que es para Resúmenes
  // Diarios) — con "RC" SUNAT arma el nombre de archivo esperando el schema SummaryDocuments y
  // rechaza el XML VoidedDocuments real con "unrecognized element ... VoidedDocuments".
  return `RA-${ymd}-${n}`;
}

/**
 * Anulación real ante SUNAT (Comunicación de Baja). Solo tiene sentido para un comprobante que
 * SUNAT ya aceptó (stateTypeId "05") — si todavía no se envió, basta con eliminarlo.
 * Deja el comprobante en estado "12" (Baja en proceso) hasta que se confirme con
 * {@link checkDocumentVoidStatus}, porque SUNAT procesa esto de forma asíncrona (ticket).
 */
export async function requestDocumentVoid(documentId: number, reason: string) {
  const config = await getCompanySunatConfig();
  if (!config) return { success: false, message: "Empresa no configurada" };

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { success: false, message: "Comprobante no encontrado" };
  if (doc.stateTypeId === "11") return { success: false, message: "Este comprobante ya está anulado" };
  if (doc.stateTypeId === "12") {
    return { success: false, message: "Ya hay una Comunicación de Baja en proceso para este comprobante — consulta su estado." };
  }
  if (doc.stateTypeId !== "05") {
    return {
      success: false,
      message:
        "Solo se puede anular ante SUNAT un comprobante ya aceptado (estado 05). Si todavía no se envió, simplemente elimínalo desde el listado.",
    };
  }

  const id = await nextVoidCommId();
  const issueDate = new Date().toISOString().slice(0, 10);
  const referenceDate = doc.dateOfIssue.toISOString().slice(0, 10);

  const result = await sendVoidedDocumentsToSunat(config, {
    id,
    referenceDate,
    issueDate,
    lines: [{ documentTypeId: doc.documentTypeId, series: doc.series, number: doc.number, voidReason: reason }],
  });

  if (result.success && result.ticket) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        stateTypeId: "12",
        voidTicket: result.ticket,
        voidReason: reason,
        voidXmlContent: result.xml ?? undefined,
      },
    });
  }

  return result;
}

/** Consulta si SUNAT ya resolvió el ticket de una Comunicación de Baja en curso. */
export async function checkDocumentVoidStatus(documentId: number) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { done: false, message: "Comprobante no encontrado" };
  if (!doc.voidTicket) return { done: false, message: "Este comprobante no tiene una Comunicación de Baja en curso" };

  const config = await getCompanySunatConfig();
  if (!config) return { done: false, message: "Empresa no configurada" };

  const status = await getSunatTicketStatus(config, doc.voidTicket);

  if (status.done) {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        stateTypeId: status.accepted ? "11" : "05",
        voidCdrContent: status.cdr ?? undefined,
        voidReason: status.accepted ? doc.voidReason : `[BAJA RECHAZADA] ${status.message}`,
      },
    });
  }

  return status;
}
