"use client";

export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex gap-1">
      {onEdit && (
        <button type="button" className="ify-btn-ghost px-2 py-1 text-xs" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <i className="bi bi-pencil" />
        </button>
      )}
      {onDelete && (
        <button type="button" className="ify-btn-ghost px-2 py-1 text-xs text-red-600" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <i className="bi bi-trash" />
        </button>
      )}
    </div>
  );
}
