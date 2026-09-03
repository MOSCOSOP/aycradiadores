"use client";

import { useEffect, useState } from "react";
import { PageHeader, Modal, Field } from "@/components/ui/Modal";
import { DataTable } from "@/components/ui/DataTable";
import { RowActions } from "@/components/ui/RowActions";
import { api } from "@/lib/api/client";

type PayrollLine = { employee_name: string; base_salary: number; bonuses: number; deductions: number; net_pay: number };

/** Planilla simplificada: trabajadores + planillas mensuales con neto a pagar. No reemplaza un
 * sistema de planilla legal completo (AFP/ONP/EsSalud/PLAME) — es un registro real de control
 * interno de sueldos, ya que el cumplimiento legal completo excede el alcance de este sistema.
 * Reemplaza el catálogo genérico de /payroll. */
export function PayrollPage() {
  const [tab, setTab] = useState<"employees" | "runs">("employees");
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [runs, setRuns] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState(0);
  const [runModalOpen, setRunModalOpen] = useState(false);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.payroll.employees(), api.payroll.records()])
      .then(([e, r]) => {
        setEmployees(e.data ?? []);
        setRuns(r.data ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateEmployee = () => {
    setEditId(null);
    setName("");
    setDocumentId("");
    setPosition("");
    setSalary(0);
    setEmpModalOpen(true);
  };

  const openEditEmployee = (r: Record<string, unknown>) => {
    setEditId(Number(r.id));
    setName(String(r.name ?? ""));
    setDocumentId(String(r.document_id ?? ""));
    setPosition(String(r.position ?? ""));
    setSalary(Number(r.monthly_salary ?? 0));
    setEmpModalOpen(true);
  };

  const saveEmployee = async () => {
    if (!name.trim()) {
      alert("El nombre del trabajador es obligatorio");
      return;
    }
    const payload = { name: name.trim(), document_id: documentId, position, monthly_salary: salary };
    if (editId) await api.payroll.updateEmployee(editId, payload);
    else await api.payroll.createEmployee(payload);
    setEmpModalOpen(false);
    load();
  };

  const removeEmployee = async (id: number) => {
    if (!confirm("¿Eliminar este trabajador?")) return;
    const res = await api.payroll.deleteEmployee(id);
    if (res.soft_deleted) alert(res.message);
    load();
  };

  const generateRun = async () => {
    try {
      await api.payroll.createRun({ period });
      setRunModalOpen(false);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo generar la planilla");
    }
  };

  const removeRun = async (id: number) => {
    if (!confirm("¿Eliminar esta planilla?")) return;
    await api.payroll.deleteRun(id);
    load();
  };

  return (
    <div className="ify-page">
      <PageHeader
        title="Planilla"
        subtitle="Registro de trabajadores y planillas mensuales (control interno de sueldos)"
        actions={
          tab === "employees" ? (
            <button type="button" className="ify-btn-primary" onClick={openCreateEmployee}>
              <i className="bi bi-plus-lg" /> Nuevo trabajador
            </button>
          ) : (
            <button type="button" className="ify-btn-primary" onClick={() => setRunModalOpen(true)}>
              <i className="bi bi-plus-lg" /> Generar planilla del mes
            </button>
          )
        }
      />

      <div className="mb-3 flex gap-1 border-b border-[var(--border-light)]">
        {(["employees", "runs"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`px-3 py-2 text-xs font-semibold ${tab === t ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted)]"}`}
            onClick={() => setTab(t)}
          >
            {t === "employees" ? "Trabajadores" : "Planillas mensuales"}
          </button>
        ))}
      </div>

      {tab === "employees" ? (
        <DataTable
          loading={loading}
          rows={employees}
          emptyMessage="Sin trabajadores registrados"
          columns={[
            { key: "name", label: "Nombre" },
            { key: "document_id", label: "DNI" },
            { key: "position", label: "Cargo" },
            { key: "monthly_salary", label: "Sueldo mensual", render: (r) => `S/ ${Number(r.monthly_salary ?? 0).toFixed(2)}` },
            {
              key: "active",
              label: "Estado",
              render: (r) => (r.active === false ? <span className="text-[var(--muted)]">Inactivo</span> : <span className="text-green-700">Activo</span>),
            },
            {
              key: "actions",
              label: "Acciones",
              render: (r) => <RowActions onEdit={() => openEditEmployee(r)} onDelete={() => removeEmployee(Number(r.id))} />,
            },
          ]}
        />
      ) : (
        <DataTable
          loading={loading}
          rows={runs}
          emptyMessage="Sin planillas generadas — usa «Generar planilla del mes»"
          columns={[
            { key: "period", label: "Periodo" },
            { key: "employees_count", label: "Trabajadores" },
            { key: "total_net", label: "Total neto", render: (r) => `S/ ${Number(r.total_net ?? 0).toFixed(2)}` },
            {
              key: "actions",
              label: "Acciones",
              render: (r) => (
                <div className="flex items-center gap-1">
                  <button type="button" className="ify-btn-ghost px-2" onClick={() => setExpandedRun(expandedRun === Number(r.id) ? null : Number(r.id))}>
                    <i className={`bi bi-chevron-${expandedRun === Number(r.id) ? "up" : "down"}`} />
                  </button>
                  <RowActions onDelete={() => removeRun(Number(r.id))} />
                </div>
              ),
            },
          ]}
        />
      )}

      {tab === "runs" && expandedRun && (
        <div className="ify-card mt-3 p-3">
          <table className="ify-table text-xs">
            <thead><tr><th>Trabajador</th><th>Sueldo base</th><th>Bonos</th><th>Descuentos</th><th>Neto</th></tr></thead>
            <tbody>
              {((runs.find((r) => Number(r.id) === expandedRun)?.lines as PayrollLine[]) ?? []).map((l, i) => (
                <tr key={i}>
                  <td>{l.employee_name}</td>
                  <td>S/ {l.base_salary.toFixed(2)}</td>
                  <td>S/ {l.bonuses.toFixed(2)}</td>
                  <td>S/ {l.deductions.toFixed(2)}</td>
                  <td className="font-semibold">S/ {l.net_pay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={empModalOpen}
        title={editId ? "Editar trabajador" : "Nuevo trabajador"}
        onClose={() => setEmpModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setEmpModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={saveEmployee}>Guardar</button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre" className="sm:col-span-2">
            <input className="ify-input" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="DNI">
            <input className="ify-input" value={documentId} onChange={(e) => setDocumentId(e.target.value)} />
          </Field>
          <Field label="Cargo">
            <input className="ify-input" value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
          <Field label="Sueldo mensual (S/)">
            <input type="number" step="0.01" className="ify-input" value={salary} onChange={(e) => setSalary(Number(e.target.value) || 0)} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={runModalOpen}
        title="Generar planilla del mes"
        onClose={() => setRunModalOpen(false)}
        footer={
          <>
            <button type="button" className="ify-btn-ghost" onClick={() => setRunModalOpen(false)}>Cancelar</button>
            <button type="button" className="ify-btn-primary" onClick={generateRun}>Generar</button>
          </>
        }
      >
        <Field label="Periodo (AAAA-MM)">
          <input className="ify-input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" />
        </Field>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Se genera una línea por cada trabajador activo, usando su sueldo mensual como base (puedes editar
          bonos/descuentos por trabajador más adelante si lo necesitas).
        </p>
      </Modal>
    </div>
  );
}
