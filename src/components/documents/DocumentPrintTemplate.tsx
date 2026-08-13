"use client";

import { sunatQrImageUrl } from "@/lib/comprobante/sunat-qr";
import { amountWordsEs } from "@/lib/comprobante/amount-words";
import type { ReceiptData } from "@/lib/comprobante/types";
import { COMPROBANTE_ASSETS, COMPANY_INFO } from "@/lib/company-info";
import { formatReceiptNumber } from "@/lib/receipt-format";

export type { ReceiptData } from "@/lib/comprobante/types";
export { printDocument } from "@/lib/comprobante/print-document";

function fmtDate(iso: string) {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function idDocLabel(number: string) {
  const n = String(number ?? "").replace(/\D/g, "");
  return n.length === 11 ? "R.U.C." : "D.N.I.";
}

function paymentDisplay(receipt: ReceiptData) {
  if (receipt.payment_condition?.toLowerCase() === "credito") return "CRÉDITO";
  return "CONTADO";
}

export function DocumentPrintTemplate({
  receipt,
  printId = "doc-print-area",
  scale = "normal",
}: {
  receipt: ReceiptData;
  printId?: string;
  scale?: "normal" | "a5";
}) {
  const emisor = receipt.emisor;
  const number = formatReceiptNumber(receipt.number);
  const qrPayload = receipt.qr_payload ?? `${emisor?.ruc ?? ""}|${number}|${receipt.total.toFixed(2)}`;
  const qrUrl = sunatQrImageUrl(qrPayload, scale === "a5" ? 110 : 140);
  const discount = receipt.total_discount ?? 0;

  return (
    <div
      id={printId}
      className={`doc-print-sheet mx-auto bg-white text-black shadow-sm ${scale === "a5" ? "doc-print-a5" : "doc-print-a4"}`}
    >
      <div className="doc-print-inner">
        <header className="doc-print-header">
          <div className="doc-print-header-main">
            <div className="doc-print-logo-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emisor?.logo ?? COMPROBANTE_ASSETS.logo}
                alt="Logo A&C"
                className="doc-print-logo"
              />
            </div>
            <div className="doc-print-header-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emisor?.titulo ?? COMPROBANTE_ASSETS.titulo}
                alt="RADIADORES & AIRE ACONDICIONADO"
                className="doc-print-titulo"
              />
              <div className="doc-print-header-brand-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={emisor?.sello ?? COMPROBANTE_ASSETS.sello}
                  alt="A&C"
                  className="doc-print-sello"
                />
                <div className="doc-print-contact">
                  <p className="doc-print-meta">
                    <span className="doc-print-label">De:</span> {emisor?.razonSocial}
                  </p>
                  <p className="doc-print-meta">
                    Cel: {emisor?.telefono}
                    {emisor?.telefono2 ? ` – ${emisor.telefono2}` : ""}
                  </p>
                  <p className="doc-print-meta doc-print-email">
                    Correo elec: {emisor?.email ?? COMPANY_INFO.email}
                  </p>
                  <p className="doc-print-meta">
                    Av.: {emisor?.direccion?.replace(/^Av\.\s*/i, "")}
                  </p>
                </div>
              </div>
            </div>
            <div className="doc-print-docbox">
              <p>R.U.C. {emisor?.ruc}</p>
              <p className="doc-print-doc-type">{receipt.document_type_label}</p>
              <p className="doc-print-doc-number">Nro. {number}</p>
            </div>
          </div>
        </header>

        <section className="doc-print-client-box">
          <div>
            <p>
              <span className="doc-print-label">Señor(es):</span> {receipt.customer_name}
            </p>
            <p>
              <span className="doc-print-label">{idDocLabel(receipt.customer_number)}:</span>{" "}
              {receipt.customer_number}
            </p>
            <p>
              <span className="doc-print-label">Dirección:</span> {receipt.customer_address || "—"}
            </p>
            <p>
              <span className="doc-print-label">Provincia:</span> {receipt.customer_province || "—"}
              <span className="doc-print-inline-sep">Distrito:</span> {receipt.customer_district || "—"}
            </p>
          </div>
          <div className="doc-print-client-right">
            <p>
              <span className="doc-print-label">Vendedor:</span> {receipt.seller_name || "ADMINISTRADOR"}
            </p>
          </div>
        </section>

        <table className="doc-print-meta-table">
          <thead>
            <tr>
              <th>Fecha Emisión</th>
              <th>Forma de pago</th>
              <th>N° de placa</th>
              <th>Orden de compra</th>
              <th>Vencimiento</th>
              <th>N° Guía Remisión</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{fmtDate(receipt.date_of_issue)}</td>
              <td>{paymentDisplay(receipt)}</td>
              <td>{receipt.plate || ""}</td>
              <td>{receipt.purchase_order || ""}</td>
              <td>{fmtDate(receipt.date_of_due ?? receipt.date_of_issue)}</td>
              <td>{receipt.dispatch_number || ""}</td>
            </tr>
          </tbody>
        </table>

        <table className="doc-print-table">
          <thead>
            <tr>
              <th className="col-code">CODIGO</th>
              <th className="col-qty">CANT.</th>
              <th className="col-unit">U.M.</th>
              <th className="col-desc">DESCRIPCIÓN</th>
              <th className="col-price">P.Unit</th>
              <th className="col-total">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((it, i) => (
              <tr key={i}>
                <td className="col-code">{it.code ?? ""}</td>
                <td className="col-qty">{it.quantity}</td>
                <td className="col-unit">{it.unit}</td>
                <td className="col-desc">{it.description}</td>
                <td className="col-price">{it.unit_price.toFixed(2)}</td>
                <td className="col-total">{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-print-summary-row">
          <div className="doc-print-obs">
            <span className="doc-print-label">Observaciones:</span>
            <p>{receipt.observations || ""}</p>
          </div>
          <table className="doc-print-totals-table">
            <tbody>
              <tr>
                <th>DESCUENTO (-)</th>
                <td>S/ {discount.toFixed(2)}</td>
              </tr>
              <tr>
                <th>OP. GRAVADAS</th>
                <td>S/ {receipt.total_taxed.toFixed(2)}</td>
              </tr>
              <tr>
                <th>OP. EXONERADAS</th>
                <td>S/ {(receipt.total_exonerated ?? 0).toFixed(2)}</td>
              </tr>
              <tr>
                <th>IGV</th>
                <td>S/ {receipt.total_igv.toFixed(2)}</td>
              </tr>
              <tr className="doc-print-total-final-row">
                <th>TOTAL</th>
                <td>S/ {receipt.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-print-words-box">
          Son: <strong>{amountWordsEs(receipt.total)}</strong>
        </div>

        <table className="doc-print-bank-table">
          <thead>
            <tr>
              <th>BANCO</th>
              <th>MONEDA</th>
              <th>N° CUENTA CORRIENTE</th>
              <th>CUENTA INTERBANCARIA (CCI)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{emisor?.banco}</td>
              <td>{emisor?.moneda ?? "Soles"}</td>
              <td>{emisor?.cuentaBancaria}</td>
              <td>{emisor?.cci}</td>
            </tr>
          </tbody>
        </table>

        <div className="doc-print-legal-row">
          <div className="doc-print-detraction">
            <p className="doc-print-label">{emisor?.detractionLabel ?? "CUENTA DE DETRACCIONES"}</p>
            <p>{emisor?.detractionBank ?? "BANCO DE LA NACIÓN:"}</p>
          </div>
          <div className="doc-print-qr-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR SUNAT" className="doc-print-qr" />
          </div>
        </div>

        <footer className="doc-print-representation">
          <p>
            REPRESENTACIÓN IMPRESA DE {receipt.document_type_label}. RESOLUCION DE SUPERINTENDENCIA N° 155-2017/SUNAT.
          </p>
          {receipt.hash ? <p className="doc-print-hash">{receipt.hash}</p> : null}
        </footer>

        <div className="doc-print-brands">
          {(emisor?.brandLogos ?? COMPROBANTE_ASSETS.brands).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" className="doc-print-brand-logo" />
          ))}
        </div>

        <p className="doc-print-service-footer">{emisor?.footerServiceText}</p>
      </div>
    </div>
  );
}
