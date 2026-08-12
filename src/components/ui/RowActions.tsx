"use client";

export function RowActions({
  onEdit,
  onDelete,
  showLabels = false,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  showLabels?: boolean;
}) {
  return (
    <div className="ify-row-actions">
      {onEdit && (
        <button
          type="button"
          className="ify-row-action ify-row-action-edit"
          title="Editar"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <i className="bi bi-pencil" />
          {showLabels ? <span>Editar</span> : null}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="ify-row-action ify-row-action-delete"
          title="Eliminar"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <i className="bi bi-trash" />
          {showLabels ? <span>Eliminar</span> : null}
        </button>
      )}
    </div>
  );
}
