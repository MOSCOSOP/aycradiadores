"use client";

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
};

type DataTableProps<T extends Record<string, unknown>> = {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Mantiene la última columna (acciones) visible al hacer scroll horizontal */
  stickyLastColumn?: boolean;
  /** Tabla ancha con scroll horizontal explícito */
  wide?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  loading,
  emptyMessage = "Sin registros",
  onRowClick,
  stickyLastColumn = false,
  wide = false,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="ify-card p-8 text-center text-[var(--muted)]">
        <i className="bi bi-arrow-repeat animate-spin mr-2" />
        Cargando...
      </div>
    );
  }

  return (
    <div
      className={[
        "ify-table-wrap ify-card",
        wide ? "ify-table-wrap-wide" : "",
        stickyLastColumn ? "ify-table-sticky-actions" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table className={`ify-table${wide ? " ify-table-wide" : ""}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className={col.className}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-[var(--muted-light)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={String(row.id ?? idx)}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className={col.className}>
                    {col.render
                      ? col.render(row, idx)
                      : String(row[col.key as keyof T] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
