import Link from "next/link";
import {
  extractedExists,
  listHtmlShells,
  readManifest,
  readPages,
} from "@/lib/extracted-ui";

export default function PreviewIndexPage() {
  if (!extractedExists()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] p-6">
        <div className="ify-card max-w-lg p-8 text-center">
          <h1 className="mb-3 text-xl font-bold">No hay contenido extraído</h1>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Primero ejecuta el clonador Python para generar la carpeta{" "}
            <code className="rounded bg-[var(--border-light)] px-1">extracted-ui/</code>
          </p>
          <pre className="mb-4 rounded bg-[#1e1e1e] p-4 text-left text-xs text-green-400">
            pip install -r scripts/requirements-scraper.txt{"\n"}python scripts/clone_ui.py
          </pre>
          <Link href="/" className="ify-link">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const manifest = readManifest();
  const pages = readPages().filter((p) => p.status_code === 200);
  const shells = listHtmlShells();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">Visor UI extraída</h1>
            <p className="text-xs text-[var(--muted)]">
              {manifest?.pages_ok ?? shells.length} pantallas — fuente: {manifest?.source}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="ify-btn-outline text-sm">
              App clon
            </Link>
            <a
              href="http://localhost:8888"
              target="_blank"
              rel="noreferrer"
              className="ify-btn-ghost text-sm"
            >
              Servidor Python :8888
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="ify-card p-4 text-center">
            <div className="text-2xl font-bold text-[var(--primary)]">{shells.length}</div>
            <div className="text-xs text-[var(--muted)]">Pantallas HTML</div>
          </div>
          <div className="ify-card p-4 text-center">
            <div className="text-2xl font-bold">{manifest?.menu_modules ?? "—"}</div>
            <div className="text-xs text-[var(--muted)]">Módulos menú</div>
          </div>
          <div className="ify-card p-4 text-center">
            <div className="text-2xl font-bold">{pages.length}</div>
            <div className="text-xs text-[var(--muted)]">Metadatos JSON</div>
          </div>
          <div className="ify-card p-4 text-center">
            <div className="text-2xl font-bold">{manifest?.extracted_at?.split(" ")[0] ?? "—"}</div>
            <div className="text-xs text-[var(--muted)]">Fecha extracción</div>
          </div>
        </div>

        <div className="ify-card overflow-hidden">
          <table className="ify-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Título</th>
                <th>Labels</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shells.map(({ slug, path: routePath }) => {
                const meta = pages.find((p) => p.path === routePath);
                return (
                  <tr key={slug}>
                    <td>
                      <code className="text-xs">{routePath}</code>
                    </td>
                    <td className="max-w-[200px] truncate text-sm">
                      {meta?.title?.replace(/\s+/g, " ").trim() || "—"}
                    </td>
                    <td className="text-xs text-[var(--muted)]">
                      {meta?.labels?.length ?? 0} labels
                    </td>
                    <td className="text-end">
                      <Link
                        href={`/preview/view/${slug}`}
                        className="ify-btn-outline py-1 text-xs"
                        target="_blank"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
