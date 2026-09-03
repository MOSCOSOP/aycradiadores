"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

/** Registro real de retenciones/percepciones. Solo aplica si SUNAT te designó formalmente
 * como agente de retención o de percepción — no todos los negocios lo son. Sirve como
 * bitácora si llegara a necesitarse. Reemplaza los catálogos genéricos de /retentions
 * y /perceptions. */
export function TaxWithholdingsPage({ type }: { type: "retention" | "perception" }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyDocument, setPartyDocument] = useState("");
  const [documentRef, setDocumentRef] = useState("");
  const [baseAmount, setBaseAmount] = useState(0);
  const [percent, setPercent] = useState(type === "retention" ? 3 : 0.5);
  const [note, setNote] = useState("");

  const label = type === "retention" ? "Retención" : "Percepción";

  const load = () => {
    setLoading(true);
    api.taxWithholdings.records(type).then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const openCreate = () => {
    setPartyName("");
    setPartyDocument("");
    setDocumentRef("");
    setBaseAmount(0);
    setNote("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!partyName.trim() || !baseAmount || !percent) {
      alert(`${type === "retention" ? "Proveedor" : "Cliente"}, base y porcentaje son obligatorios`);
      return;
    }
    try {
      await api.taxWithholdings.create(type, {
        party_name: partyName.trim(),
        party_document: partyDocument,
        document_ref: documentRef,
        base_amount: baseAmount,
        percent,
        note,
      });
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo guardar");
    }
  };

  const remove = async (id: number) => {
    if (!confirm(`¿Eliminar esta ${label.toLowerCase()}?`)) return;
    await api.taxWithholdings.delete(type, id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title={type === "retention" ? "Retenciones" : "Percepciones"}
        subtitle="Solo aplica si SUNAT te designó agente — usa esto como registro si te toca aplicarlo"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nueva {label.toLowerCase()}
          </button>
        }
      />
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage={`Sin ${label.toLowerCase()}s registradas`}
        columns={[
          { key: "date", label: "Fecha" },
          { key: "party_name", label: type === "retention" ? "Proveedor" : "Cliente" },
          { key: "party_document", label: "RUC/DNI" },
          { key: "document_ref", label: "Comprobante afectado" },
          { key: "base_amount", label: "Base", render: (r) => `S/ ${Number(r.base_amount ?? 0).toFixed(2)}` },
          { key: "percent", label: "%", render: (r) => `${r.percent}%` },
          { key: "amount", label: `Monto ${label.toLowerCase()}`, render: (r) => `S/ ${Number(r.amount ?? 0).toFixed(2)}` },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => <RowActions onDelete={() => remove(Number(r.id))} />,
          },
        ]}
      />
      <Modal
        open={modalOpen}
        title={`Nueva ${label.toLowerCase()}`}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={type === "retention" ? "Proveedor" : "Cliente"} className="sm:col-span-2">
            <input className="ify-input" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
          </Field>
          <Field label="RUC/DNI">
            <input className="ify-input" value={partyDocument} onChange={(e) => setPartyDocument(e.target.value)} />
          </Field>
          <Field label="N° de comprobante afectado">
            <input className="ify-input" value={documentRef} onChange={(e) => setDocumentRef(e.target.value)} />
          </Field>
          <Field label="Base (S/)">
            <input type="number" step="0.01" className="ify-input" value={baseAmount} onChange={(e) => setBaseAmount(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Porcentaje (%)">
            <input type="number" step="0.1" className="ify-input" value={percent} onChange={(e) => setPercent(Number(e.target.value) || 0)} />
          </Field>
          <Field label="Nota" className="sm:col-span-2">
            <input className="ify-input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {baseAmount > 0 && percent > 0 && (
          <p className="mt-2 text-sm text-[var(--muted)]">
            Monto de {label.toLowerCase()}: <strong className="text-[var(--primary)]">S/ {(Math.round(baseAmount * (percent / 100) * 100) / 100).toFixed(2)}</strong>
          </p>
        )}
      </Modal>
    </div>
  );
}
