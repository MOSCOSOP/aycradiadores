"use client";

import { buildGuiaQrPayload, type GuiaPrintData } from "@/lib/comprobante/guia-print";
import { sunatQrImageUrl } from "@/lib/comprobante/sunat-qr";
import { formatReceiptNumber } from "@/lib/receipt-format";
import { guideTypeLabel } from "@/lib/dispatch-fields";
import { COMPROBANTE_ASSETS, COMPANY_INFO } from "@/lib/company-info";

type GuiaPrintTemplateProps = {
  data: GuiaPrintData;
  pageSize?: "A4" | "A5";
  printId?: string;
};

export function GuiaPrintTemplate({ data, pageSize = "A4", printId = "doc-print-area" }: GuiaPrintTemplateProps) {
  const extra = data.extra ?? {};
  const typeLabel = guideTypeLabel(data.guide_type);
  const number = formatReceiptNumber(data.number);
  const recipientDoc = extra.recipient_document ?? "";
  const qrPayload = buildGuiaQrPayload({
    guideType: data.guide_type,
    number: data.number,
    dateOfIssue: data.date_of_issue,
    customerNumber: recipientDoc,
  });
  const qrUrl = sunatQrImageUrl(qrPayload, pageSize === "A5" ? 110 : 140);

  return (
    <div
      id={printId}
      className={`doc-print-sheet mx-auto bg-white text-black shadow-sm ${pageSize === "A5" ? "doc-print-a5" : "doc-print-a4"}`}
    >
      <div className="doc-print-inner">
        <header className="doc-print-header">
          <div className="doc-print-header-main">
            <div className="doc-print-logo-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COMPROBANTE_ASSETS.logo} alt="Logo A&C" className="doc-print-logo" />
            </div>
            <div className="doc-print-header-title-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={COMPROBANTE_ASSETS.titulo}
                alt={COMPANY_INFO.tradeName}
                className="doc-print-titulo-inline"
              />
            </div>
            <div className="doc-print-brand-center">
              <p className="doc-print-meta doc-print-de-line">
                <span className="doc-print-label">De:</span> {extra.sender_name || COMPANY_INFO.legalName}
              </p>
              <p className="doc-print-meta">
                Cel: {COMPANY_INFO.phone}
                {COMPANY_INFO.phone2 ? ` – ${COMPANY_INFO.phone2}` : ""}
              </p>
              <p className="doc-print-meta doc-print-email">Correo elec: {COMPANY_INFO.email}</p>
              <p className="doc-print-meta">Av.: {COMPANY_INFO.address.replace(/^Av\.\s*/i, "")}</p>
            </div>
            <div className="doc-print-docbox">
              <p>R.U.C. {COMPANY_INFO.ruc}</p>
              <p className="doc-print-doc-type">{typeLabel}</p>
              <p className="doc-print-doc-number">Nro. {number}</p>
            </div>
          </div>
        </header>

        <table className="doc-print-meta-table">
          <thead>
            <tr>
              <th>F. Emisión</th>
              <th>F. Traslado</th>
              <th>Motivo</th>
              <th>Modalidad</th>
              <th>Peso total</th>
              <th>Unidad</th>
              <th>N° bultos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.date_of_issue}</td>
              <td>{data.date_of_transfer || data.date_of_issue}</td>
              <td>{data.transfer_reason || "—"}</td>
              <td>{data.mode_transport === "01" ? "Público" : "Privado"}</td>
              <td>{data.total_weight ?? 0}</td>
              <td>{data.unit_measure || "KGM"}</td>
              <td>{data.package_count ?? 0}</td>
            </tr>
          </tbody>
        </table>

        <section className="doc-print-guia-section">
          <p>
            <span className="doc-print-label">Remitente:</span> {extra.sender_name || COMPANY_INFO.legalName}
          </p>
          <p>
            <span className="doc-print-label">Destinatario:</span> {extra.recipient_name || data.customer_name}
          </p>
          <p>
            <span className="doc-print-label">Punto de partida:</span> {data.origin_address || "—"}
          </p>
          <p>
            <span className="doc-print-label">Punto de llegada:</span> {data.dest_address || "—"}
          </p>
          {data.guide_type === "31" && (
            <>
              <p>
                <span className="doc-print-label">Pagador flete:</span> {extra.freight_payer_name || "—"}
              </p>
              <p>
                <span className="doc-print-label">Subcontratada:</span> {extra.subcontractor_name || "—"}
              </p>
            </>
          )}
          <p>
            <span className="doc-print-label">Vehículo:</span> {extra.vehicle_label || data.vehicle_plate || "—"}
          </p>
          <p>
            <span className="doc-print-label">Conductor:</span> {data.driver_name || extra.driver_label || "—"}
            {data.driver_document ? ` (${data.driver_document})` : ""}
          </p>
          {(extra.secondary_vehicle_label || extra.secondary_driver_label) && (
            <p>
              <span className="doc-print-label">Secundario:</span> {extra.secondary_vehicle_label || "—"} /{" "}
              {extra.secondary_driver_label || "—"}
            </p>
          )}
          {data.purchase_order && (
            <p>
              <span className="doc-print-label">O/C:</span> {data.purchase_order}
            </p>
          )}
          {data.observations && (
            <p>
              <span className="doc-print-label">Obs.:</span> {data.observations}
            </p>
          )}
          {extra.related_guides?.length ? (
            <p>
              <span className="doc-print-label">G.R. relacionadas:</span> {extra.related_guides.join(", ")}
            </p>
          ) : null}
        </section>

        <table className="doc-print-table">
          <thead>
            <tr>
              <th className="col-qty">#</th>
              <th className="col-unit">Unidad</th>
              <th className="col-desc">Descripción</th>
              <th className="col-total">Cantidad / Peso</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td className="col-qty">{idx + 1}</td>
                <td className="col-unit">{item.unit_type_id || data.unit_measure}</td>
                <td className="col-desc">{item.description}</td>
                <td className="col-total">{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-print-legal-row">
          <div className="doc-print-detraction">
            <p className="doc-print-label">{COMPANY_INFO.detractionLabel}</p>
            <p>{COMPANY_INFO.detractionBank}</p>
          </div>
          <div className="doc-print-qr-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR SUNAT" className="doc-print-qr" />
          </div>
        </div>

        <footer className="doc-print-representation">
          <p>
            REPRESENTACIÓN IMPRESA DE {typeLabel}. RESOLUCION DE SUPERINTENDENCIA N° 155-2017/SUNAT.
          </p>
        </footer>

        <div className="doc-print-brands">
          {COMPROBANTE_ASSETS.brands.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="doc-print-brand-logo" />
          ))}
        </div>

        <p className="doc-print-service-footer">{COMPANY_INFO.footerServiceText}</p>
      </div>
    </div>
  );
}
