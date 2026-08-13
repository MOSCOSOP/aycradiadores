"use client";

import Image from "next/image";
import { sunatQrImageUrl } from "@/lib/comprobante/sunat-qr";
import { COMPROBANTE_PRINT_CSS, pageRuleForSize } from "@/lib/comprobante/print-styles";
import type { ReceiptData } from "@/lib/comprobante/types";
import { formatReceiptNumber } from "@/lib/receipt-format";

export type { ReceiptData } from "@/lib/comprobante/types";

function fmtDate(iso: string) {
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function amountWords(total: number) {
  const ent = Math.floor(total);
  const dec = Math.round((total - ent) * 100);
  return `${ent} CON ${String(dec).padStart(2, "0")}/100 Soles`;
}

function payMethodLabel(method: string) {
  const map: Record<string, string> = {
    efectivo: "Efectivo",
    yape: "Yape",
    transferencia: "Transferencia",
    contado: "Contado",
    credito: "Crédito",
  };
  return map[method.toLowerCase()] ?? method;
}

function idDocLabel(number: string) {
  const n = String(number ?? "").replace(/\D/g, "");
  return n.length === 11 ? "R.U.C." : "D.N.I.";
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
  const paymentLabel =
    receipt.payment_condition?.toLowerCase() === "credito" ? "Crédito" : "Contado";

  return (
    <div
      id={printId}
      className={`doc-print-sheet mx-auto bg-white text-black shadow-sm ${scale === "a5" ? "doc-print-a5" : "doc-print-a4"}`}
    >
      <div className="doc-print-inner">
        <header className="doc-print-header">
          <div className="doc-print-logo-wrap">
            <Image
              src={emisor?.logo ?? "/assets/comprobantes/logo.jpg"}
              alt={emisor?.nombreComercial ?? "Logo"}
              width={72}
              height={72}
              className="doc-print-logo"
              unoptimized
            />
          </div>
          <div className="doc-print-brand-center">
            <h1 className="doc-print-company">{emisor?.nombreComercial ?? "A&C RADIADORES"}</h1>
            <p className="doc-print-meta">De: {emisor?.razonSocial}</p>
            <p className="doc-print-meta">RUC {emisor?.ruc}</p>
            <p className="doc-print-meta">{emisor?.direccion}</p>
            {emisor?.telefono ? (
              <p className="doc-print-meta">Central telefónica: {emisor.telefono}</p>
            ) : null}
            {emisor?.email ? <p className="doc-print-meta">Email: {emisor.email}</p> : null}
          </div>
          <div className="doc-print-docbox">
            <p>R.U.C. {emisor?.ruc}</p>
            <p className="doc-print-doc-type">{receipt.document_type_label}</p>
            <p className="doc-print-doc-number">Nro. {number}</p>
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
              <span className="doc-print-label">Dirección:</span>{" "}
              {receipt.customer_address || "—"}
            </p>
            <p>
              <span className="doc-print-label">Provincia:</span> {receipt.customer_province || "—"}
            </p>
            <p>
              <span className="doc-print-label">Distrito:</span> {receipt.customer_district || "—"}
            </p>
          </div>
          <div className="doc-print-client-right">
            <p>
              <span className="doc-print-label">Vendedor:</span> {receipt.seller_name || "ADMINISTRADOR"}
            </p>
          </div>
        </section>

        <section className="doc-print-meta-bar">
          <div className="doc-print-meta-cell">
            <span className="lbl">Fecha Emisión</span>
            <span className="val">{fmtDate(receipt.date_of_issue)}</span>
          </div>
          <div className="doc-print-meta-cell">
            <span className="lbl">Forma de pago</span>
            <span className="val">
              {paymentLabel} — {payMethodLabel(receipt.payment_method)}
            </span>
          </div>
          <div className="doc-print-meta-cell">
            <span className="lbl">N° de placa</span>
            <span className="val">{receipt.plate || "—"}</span>
          </div>
          <div className="doc-print-meta-cell">
            <span className="lbl">Orden de compra</span>
            <span className="val">{receipt.purchase_order || "—"}</span>
          </div>
          <div className="doc-print-meta-cell">
            <span className="lbl">Vencimiento</span>
            <span className="val">{fmtDate(receipt.date_of_due ?? receipt.date_of_issue)}</span>
          </div>
          <div className="doc-print-meta-cell">
            <span className="lbl">N° Guía Remisión</span>
            <span className="val">{receipt.dispatch_number || "—"}</span>
          </div>
        </section>

        <table className="doc-print-table">
          <thead>
            <tr>
              <th className="col-code">CÓDIGO</th>
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
                <td className="col-code">{it.code ?? "—"}</td>
                <td className="col-qty">{it.quantity}</td>
                <td className="col-unit">{it.unit}</td>
                <td className="col-desc">{it.description}</td>
                <td className="col-price">{it.unit_price.toFixed(2)}</td>
                <td className="col-total">{it.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-print-bottom">
          <div className="doc-print-qr-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="QR SUNAT" width={100} height={100} className="doc-print-qr" />
            {receipt.hash ? <p className="doc-print-hash">{receipt.hash}</p> : null}
          </div>
          <div className="doc-print-totals-wrap">
            <div className="doc-print-totals">
              {receipt.total_discount != null && receipt.total_discount > 0 ? (
                <div className="doc-print-total-row">
                  <span>DESCUENTO:</span>
                  <span>S/ {receipt.total_discount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="doc-print-total-row">
                <span>OP. GRAVADAS:</span>
                <span>S/ {receipt.total_taxed.toFixed(2)}</span>
              </div>
              {receipt.total_exonerated != null && receipt.total_exonerated > 0 ? (
                <div className="doc-print-total-row">
                  <span>OP. EXONERADAS:</span>
                  <span>S/ {receipt.total_exonerated.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="doc-print-total-row">
                <span>I.G.V. 18%:</span>
                <span>S/ {receipt.total_igv.toFixed(2)}</span>
              </div>
              <div className="doc-print-total-row doc-print-total-final">
                <span>TOTAL:</span>
                <span>S/ {receipt.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="doc-print-words">Son: {amountWords(receipt.total)}</p>

        {emisor?.banco ? (
          <div className="doc-print-bank">
            <p>{emisor.banco}</p>
            {emisor.cuentaBancaria ? <p>Cta. {emisor.cuentaBancaria}</p> : null}
            {emisor.cci ? <p>CCI {emisor.cci}</p> : null}
          </div>
        ) : null}

        <footer className="doc-print-representation">
          Representación impresa del Comprobante de Venta Electrónico. Consulte su validez en{" "}
          https://e-consulta.sunat.gob.pe/ — Autorizado mediante Resolución de Intendencia N° 034-005-0005315
        </footer>
      </div>
    </div>
  );
}

export function printDocument(elementId = "doc-print-area", pageSize: "A4" | "A5" = "A4") {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Permite ventanas emergentes para imprimir el comprobante.");
    return;
  }
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante</title><style>${COMPROBANTE_PRINT_CSS}${pageRuleForSize(pageSize)}</style></head><body>${el.outerHTML}</body></html>`
  );
  w.document.close();
  w.onload = () => {
    w.focus();
    w.print();
  };
  setTimeout(() => {
    w.focus();
    w.print();
  }, 400);
}
