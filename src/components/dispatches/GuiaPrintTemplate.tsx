"use client";

import { COMPANY_INFO, COMPROBANTE_ASSETS } from "@/lib/company-info";
import { guideTypeLabel } from "@/lib/dispatch-fields";
import type { GuiaPrintData } from "@/lib/comprobante/guia-print";

type GuiaPrintTemplateProps = {
  data: GuiaPrintData;
  pageSize?: "A4" | "A5";
};

export function GuiaPrintTemplate({ data, pageSize = "A4" }: GuiaPrintTemplateProps) {
  const extra = data.extra ?? {};
  const typeLabel = guideTypeLabel(data.guide_type);

  return (
    <div id="doc-print-area" className={`guia-print-sheet ${pageSize === "A5" ? "guia-print-a5" : ""}`}>
      <div className="guia-print-inner">
        <header className="guia-print-header">
          <div className="guia-print-header-title">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={COMPROBANTE_ASSETS.titulo} alt={COMPANY_INFO.tradeName} className="guia-print-titulo" />
          </div>
          <div className="guia-print-header-body">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={COMPROBANTE_ASSETS.logo} alt="Logo" className="guia-print-logo" />
            </div>
            <div style={{ textAlign: "center", fontSize: "9px" }}>
              <p><span className="guia-print-label">De:</span> {COMPANY_INFO.legalName}</p>
              <p>Cel: {COMPANY_INFO.phone}{COMPANY_INFO.phone2 ? ` – ${COMPANY_INFO.phone2}` : ""}</p>
              <p>Correo: {COMPANY_INFO.email}</p>
              <p>Av.: {COMPANY_INFO.address}</p>
            </div>
            <div className="guia-print-docbox">
              <p>R.U.C. {COMPANY_INFO.ruc}</p>
              <p className="guia-print-doc-type">{typeLabel}</p>
              <p style={{ fontWeight: 700 }}>Nro. {data.number}</p>
            </div>
          </div>
        </header>

        <table className="guia-print-meta-table">
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

        <div className="guia-print-section">
          <p><span className="guia-print-label">Remitente:</span> {extra.sender_name || COMPANY_INFO.legalName}</p>
          <p><span className="guia-print-label">Destinatario:</span> {extra.recipient_name || data.customer_name}</p>
          <p><span className="guia-print-label">Punto de partida:</span> {data.origin_address || "—"}</p>
          <p><span className="guia-print-label">Punto de llegada:</span> {data.dest_address || "—"}</p>
          {data.guide_type === "31" && (
            <>
              <p><span className="guia-print-label">Pagador flete:</span> {extra.freight_payer_name || "—"}</p>
              <p><span className="guia-print-label">Subcontratada:</span> {extra.subcontractor_name || "—"}</p>
            </>
          )}
          <p><span className="guia-print-label">Vehículo:</span> {extra.vehicle_label || data.vehicle_plate || "—"}</p>
          <p><span className="guia-print-label">Conductor:</span> {data.driver_name || extra.driver_label || "—"} {data.driver_document ? `(${data.driver_document})` : ""}</p>
          {(extra.secondary_vehicle_label || extra.secondary_driver_label) && (
            <p><span className="guia-print-label">Secundario:</span> {extra.secondary_vehicle_label || "—"} / {extra.secondary_driver_label || "—"}</p>
          )}
          {data.purchase_order && <p><span className="guia-print-label">O/C:</span> {data.purchase_order}</p>}
          {data.observations && <p><span className="guia-print-label">Obs.:</span> {data.observations}</p>}
          {extra.related_guides?.length ? (
            <p><span className="guia-print-label">G.R. relacionadas:</span> {extra.related_guides.join(", ")}</p>
          ) : null}
        </div>

        <table className="guia-print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Unidad</th>
              <th>Descripción</th>
              <th>Cantidad / Peso</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{item.unit_type_id || data.unit_measure}</td>
                <td>{item.description}</td>
                <td style={{ textAlign: "right" }}>{item.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
