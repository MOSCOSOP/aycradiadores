"use client";

import { useEffect, useState } from "react";
import { Modal, Field } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";

type StockItem = {
  id: number;
  description: string;
  stock: number;
};

type StockAdjustModalProps = {
  open: boolean;
  item: StockItem | null;
  establishment?: string;
  initialRealStock?: number;
  onClose: () => void;
  onSaved: () => void;
};

export function StockAdjustModal({
  open,
  item,
  establishment = "Oficina Principal",
  initialRealStock,
  onClose,
  onSaved,
}: StockAdjustModalProps) {
  const [realStock, setRealStock] = useState("0");
  const [modifyKardex, setModifyKardex] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setRealStock(String(initialRealStock ?? item.stock ?? 0));
    setModifyKardex(true);
    setError("");
  }, [open, item, initialRealStock]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    setError("");
    try {
      await api.inventory.adjust({
        item_id: item.id,
        real_stock: Number(realStock),
        modify_kardex: modifyKardex,
        reference: "AJUSTE-INV",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al ajustar stock");
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Modal
      open={open}
      title="Ajuste de stock"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="ify-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="ify-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Aceptar"}
          </button>
        </>
      }
    >
      {error ? <div className="ify-alert-error mb-3 text-sm">{error}</div> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Producto" className="sm:col-span-2">
          <input className="ify-input bg-[var(--background)]" readOnly value={item.description} />
        </Field>
        <Field label="Establecimiento" className="sm:col-span-2">
          <input className="ify-input bg-[var(--background)]" readOnly value={establishment} />
        </Field>
        <Field label="Stock en el sistema">
          <input
            className="ify-input bg-[var(--background)] text-center"
            readOnly
            value={Number(item.stock ?? 0)}
          />
        </Field>
        <Field label="Stock real">
          <input
            type="number"
            step="any"
            className="ify-input text-center"
            value={realStock}
            onChange={(e) => setRealStock(e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={modifyKardex}
            onChange={(e) => setModifyKardex(e.target.checked)}
          />
          Modificar kardex
        </label>
      </div>
    </Modal>
  );
}
