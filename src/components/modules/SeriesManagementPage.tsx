"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { api } from "@/lib/api/client";

type SeriesRow = {
  id: number;
  number: string;
  document_type_id: string;
  document_type_description: string;
  establishment_id: number;
  establishment_description: string;
  current_number: number;
  next_number: number;
  documents_issued: number;
};

/**
 * Gestión REAL de series de comprobantes — controla directamente la numeración que usan
 * /documents/create y el POS (tabla Series). No confundir con un catálogo genérico: acá
 * cambiar el contador afecta de verdad qué número sale en el próximo comprobante ante SUNAT.
 */
export function SeriesManagementPage() {
  const [rows, setRows] = useState<SeriesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentTypes, setDocumentTypes] = useState<{ id: string; description: string }[]>([]);
  const [establishments, setEstablishments] = useState<{ id: number; description: string }[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [fixOpen, setFixOpen] = useState<SeriesRow | null>(null);
  const [newNumber, setNewNumber] = useState("");
  const [newDocTypeId, setNewDocTypeId] = useState("");
  const [newEstablishmentId, setNewEstablishmentId] = useState(0);
  const [newStartingNumber, setNewStartingNumber] = useState(0);
  const [fixValue, setFixValue] = useState(0);

  const load = () => {
    setLoading(true);
    api.series.records().then((r) => setRows((r.data ?? []) as SeriesRow[])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.documents.tables().then((data) => {
      setDocumentTypes((data.document_types as { id: string; description: string }[]) ?? []);
      const ests = (data.all_establishments as { id: number; description: string }[]) ?? [];
      setEstablishments(ests);
      if (ests[0]) setNewEstablishmentId(ests[0].id);
    });
  }, []);

  const openCreate = () => {
    setNewNumber("");
    setNewDocTypeId(documentTypes[0]?.id ?? "");
    setNewStartingNumber(0);
    setCreateOpen(true);
  };

  const createSeries = async () => {
    if (!newNumber.trim() || !newDocTypeId || !newEstablishmentId) {
      alert("Completa serie, tipo de documento y establecimiento");
      return;
    }
    try {
      await api.series.create({
        number: newNumber.trim().toUpperCase(),
        document_type_id: newDocTypeId,
        establishment_id: newEstablishmentId,
        starting_number: newStartingNumber,
      });
      setCreateOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo crear la serie");
    }
  };

  const openFix = (r: SeriesRow) => {
    setFixValue(r.current_number);
    setFixOpen(r);
  };

  const applyFix = async () => {
    if (!fixOpen) return;
    try {
      await api.series.update(fixOpen.id, { current_number: fixValue });
      setFixOpen(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo corregir el contador");
    }
  };

  const remove = async (r: SeriesRow) => {
    if (!confirm(`¿Eliminar la serie ${r.number}?`)) return;
    try {
      await api.series.delete(r.id);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Series de comprobantes"
        subtitle="Controla la numeración real de facturas, boletas y guías — el próximo comprobante usará el siguiente número de aquí"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nueva serie
          </button>
        }
      />

      <div className="mb-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <i className="bi bi-exclamation-triangle" /> El "Contador actual" solo se puede{" "}
        <strong>subir</strong>, nunca bajar — bajarlo repetiría un número ya usado y SUNAT lo
        rechazaría. Úsalo solo para corregir un desajuste real (por ejemplo tras importar historial).
      </div>

      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="No hay series configuradas — crea la primera con «Nueva serie»"
        columns={[
          { key: "number", label: "Serie" },
          { key: "document_type_description", label: "Tipo de documento" },
          { key: "establishment_description", label: "Establecimiento" },
          { key: "current_number", label: "Contador actual" },
          {
            key: "next_number",
            label: "Próximo número",
            render: (r) => <span className="font-semibold text-[var(--primary)]">{r.number}-{r.next_number}</span>,
          },
          { key: "documents_issued", label: "Comprobantes emitidos" },
          {
            key: "actions",
            label: "Acciones",
            render: (r) => (
              <div className="flex items-center gap-1">
                <button type="button" className="ify-btn-outline px-2 py-1 text-[10px]" onClick={() => openFix(r)}>
                  Corregir contador
                </button>
                {r.current_number === 0 && r.documents_issued === 0 && (
                  <button type="button" className="ify-btn-outline px-2 py-1 text-[10px] text-red-600" onClick={() => remove(r)}>
                    Eliminar
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={createOpen}
        title="Nueva serie"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setCreateOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={createSeries}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Serie (ej. F002, B002)">
            <input className="ify-input uppercase" value={newNumber} onChange={(e) => setNewNumber(e.target.value.toUpperCase())} placeholder="F002" />
          </Field>
          <Field label="Tipo de documento">
            <select className="ify-select" value={newDocTypeId} onChange={(e) => setNewDocTypeId(e.target.value)}>
              {documentTypes.map((t) => <option key={t.id} value={t.id}>{t.description}</option>)}
            </select>
          </Field>
          <Field label="Establecimiento">
            <select className="ify-select" value={newEstablishmentId} onChange={(e) => setNewEstablishmentId(Number(e.target.value))}>
              {establishments.map((e) => <option key={e.id} value={e.id}>{e.description}</option>)}
            </select>
          </Field>
          <Field label="Empezar a contar desde (dejar en 0 para una serie totalmente nueva)">
            <input type="number" min={0} className="ify-input" value={newStartingNumber} onChange={(e) => setNewStartingNumber(Number(e.target.value) || 0)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!fixOpen}
        title={`Corregir contador — ${fixOpen?.number ?? ""}`}
        onClose={() => setFixOpen(null)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setFixOpen(null)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={applyFix}>Guardar</button>
          </>
        }
      >
        {fixOpen && (
          <div className="grid gap-3">
            <p className="text-sm text-[var(--muted)]">
              Contador actual: <strong>{fixOpen.current_number}</strong> · Próximo comprobante saldría como{" "}
              <strong>{fixOpen.number}-{fixOpen.current_number + 1}</strong>
            </p>
            <Field label="Nuevo contador (debe ser igual o mayor al actual)">
              <input type="number" min={fixOpen.current_number} className="ify-input" value={fixValue} onChange={(e) => setFixValue(Number(e.target.value) || 0)} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
