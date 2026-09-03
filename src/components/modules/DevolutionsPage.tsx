"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { ItemPicker } from "@/components/ui/ItemPicker";
import { api } from "@/lib/api/client";

/** Devoluciones reales de clientes — repone el stock del producto de verdad y queda
 * registrada la razón. Reemplaza el catálogo genérico de /devolutions. */
export function DevolutionsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [itemId, setItemId] = useState<number | null>(null);
  const [itemLabel, setItemLabel] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [documentNumber, setDocumentNumber] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.devolutions.records().then((r) => setRows(r.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setItemId(null);
    setItemLabel("");
    setQuantity(1);
    setDocumentNumber("");
    setReason("");
    setModalOpen(true);
  };

  const save = async () => {
    if (!itemId || quantity <= 0) {
      alert("Elige el producto y una cantidad válida");
      return;
    }
    setSaving(true);
    try {
      await api.devolutions.create({ item_id: itemId, quantity, reason, document_number: documentNumber.trim() || undefined });
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo registrar la devolución");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Devoluciones"
        subtitle="Devoluciones de clientes — repone el stock real del producto"
        actions={
          <button type="button" className="ify-btn-primary" onClick={openCreate}>
            <i className="bi bi-plus-lg" /> Nueva devolución
          </button>
        }
      />
      <div className="mb-3 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <i className="bi bi-info-circle" /> Al registrar una devolución, la cantidad vuelve a sumarse al
        stock del producto automáticamente.
      </div>
      <DataTable
        loading={loading}
        rows={rows}
        emptyMessage="Sin devoluciones registradas"
        columns={[
          { key: "date", label: "Fecha" },
          { key: "item_description", label: "Producto" },
          { key: "quantity", label: "Cantidad" },
          { key: "document_number", label: "Comprobante", render: (r) => String(r.document_number || "—") },
          { key: "reason", label: "Motivo" },
        ]}
      />
      <Modal
        open={modalOpen}
        title="Nueva devolución"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={save} disabled={saving}>
              {saving ? "Guardando..." : "Registrar"}
            </button>
          </>
        }
      >
        <div className="grid gap-3">
          <Field label="Producto">
            <ItemPicker
              selectedLabel={itemLabel || "Buscar producto..."}
              onSelect={(it) => {
                setItemId(it.id);
                setItemLabel(it.description);
              }}
            />
          </Field>
          <Field label="Cantidad devuelta">
            <input type="number" min={1} className="ify-input" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
          </Field>
          <Field label="N° de comprobante (referencia, opcional)">
            <input className="ify-input" placeholder="B001-123" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          </Field>
          <Field label="Motivo">
            <input className="ify-input" placeholder="Producto defectuoso, cambio por otro modelo, etc." value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
