"use client";

import Image from "next/image";
import { COMPANY } from "@/lib/constants";
import type { SimpleDocData } from "@/lib/comprobante/public-note";

const TITLES: Record<SimpleDocData["kind"], string> = {
  "sale-note": "NOTA DE VENTA",
  quotation: "COTIZACIÓN",
};

export function SimpleDocPublicView({ doc }: { doc: SimpleDocData }) {
  return (
    <div className="simple-doc-page">
      <div className="simple-doc-card" id="simple-doc-print-area">
        <header className="simple-doc-header">
          <div className="simple-doc-brand">
            <Image src="/images/logo-client.png" alt={COMPANY.tradeName} width={48} height={48} />
            <div>
              <strong>{COMPANY.tradeName}</strong>
              <span>{COMPANY.address}</span>
            </div>
          </div>
          <div className="simple-doc-title">
            <span>{TITLES[doc.kind]}</span>
            <strong>{doc.number}</strong>
          </div>
        </header>

        <div className="simple-doc-meta">
          <div>
            <span className="simple-doc-label">Cliente</span>
            <p>{doc.customerName}</p>
          </div>
          <div>
            <span className="simple-doc-label">RUC/DNI</span>
            <p>{doc.customerNumber}</p>
          </div>
          <div>
            <span className="simple-doc-label">Fecha</span>
            <p>{doc.date}</p>
          </div>
          <div>
            <span className="simple-doc-label">Estado</span>
            <p>{doc.state}</p>
          </div>
        </div>

        <table className="simple-doc-table">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>P. Unit</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.items.map((i, idx) => (
              <tr key={idx}>
                <td>{i.description}</td>
                <td>{i.quantity}</td>
                <td>S/ {i.unitPrice.toFixed(2)}</td>
                <td>S/ {i.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="simple-doc-total">
          <span>TOTAL</span>
          <strong>S/ {doc.total.toFixed(2)}</strong>
        </div>

        <footer className="simple-doc-footer">
          Documento interno de {COMPANY.tradeName} — no es un comprobante de pago electrónico.
        </footer>
      </div>

      <div className="simple-doc-print-btn">
        <button type="button" className="ify-btn-primary" onClick={() => window.print()}>
          <i className="bi bi-printer" /> Imprimir
        </button>
      </div>
    </div>
  );
}
