import { prisma } from "@/lib/db/prisma";
import { getCompanySunatConfig } from "./company-config";
import { sendVoidedDocumentsToSunat, sendResumenBajaToSunat, getSunatTicketStatus } from "./soap";

async function nextCommId(prefix: "RA" | "RC"): Promise<string> {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const key = `${prefix.toLowerCase()}_comm_counter_${ymd}`;
  const row = await prisma.appSetting.findUnique({ where: { key } });
  const n = Number(row?.value || 0) + 1;
  await prisma.appSetting.upsert({ where: { key }, create: { key, value: String(n) }, update: { value: String(n) } });
  return `${prefix}-${ymd}-${n}`;
}

/**
 * Anulación real ante SUNAT de un comprobante ya aceptado (stateTypeId "05"). El mecanismo
 * depende del tipo de comprobante:
 * - Factura/N.Crédito/N.Débito (01/07/08): Comunicación de Baja real (schema VoidedDocuments,
 *   prefijo "RA").
 * - Boleta (03): SUNAT NO acepta boletas en la Comunicación de Baja (código 2308 "DocumentTypeCode
 *   - El valor del tipo de documento es invalido") — se anulan reportándolas de nuevo en un
 *   Resumen con la línea en estado "3" Anulado (schema SummaryDocuments, prefijo "RC").
 * Ambos casos dejan el comprobante en estado "12" (Baja en proceso) hasta que se confirme con
 * {@link checkDocumentVoidStatus}, porque SUNAT procesa esto de forma asíncrona (ticket).
 */
export async function requestDocumentVoid(documentId: number, reason: string) {
  const config = await getCompanySunatConfig();
  if (!config) return { success: false, message: "Empresa no configurada" };

  const doc = await prisma.document.findUnique({ where: { id: documentId }, include: { customer: true } });
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

  const issueDate = new Date().toISOString().slice(0, 10);
  const referenceDate = doc.dateOfIssue.toISOString().slice(0, 10);

  const result =
    doc.documentTypeId === "03"
      ? await sendResumenBajaToSunat(config, {
          id: await nextCommId("RC"),
          referenceDate,
          issueDate,
          lines: [
            {
              series: doc.series,
              number: doc.number,
              customerDocType: doc.customer.identityDocumentTypeId || "1",
              customerNumber: doc.customer.number,
              currency: doc.currencyTypeId,
              totalTaxed: doc.totalTaxed,
              totalIgv: doc.totalIgv,
              totalExonerated: doc.totalExonerated,
              total: doc.total,
            },
          ],
        })
      : await sendVoidedDocumentsToSunat(config, {
          id: await nextCommId("RA"),
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

/** Consulta si SUNAT ya resolvió el ticket de una Comunicación de Baja o Resumen de Baja en curso. */
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
