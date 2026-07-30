import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listHtmlShells,
  pathFromSlug,
  readHtmlShell,
  readPages,
} from "@/lib/extracted-ui";

type Props = { params: Promise<{ slug: string }> };

export default async function PreviewViewPage({ params }: Props) {
  const { slug } = await params;
  const routePath = pathFromSlug(slug);
  const html = readHtmlShell(routePath);

  if (!html) notFound();

  const pages = readPages();
  const meta = pages.find((p) => p.path === routePath);
  const shells = listHtmlShells();
  const idx = shells.findIndex((s) => s.slug === slug);
  const prev = idx > 0 ? shells[idx - 1] : null;
  const next = idx < shells.length - 1 ? shells[idx + 1] : null;

  return (
    <div className="flex h-screen flex-col bg-[#eee]">
      <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2">
        <div className="min-w-0">
          <Link href="/preview" className="ify-link text-xs">
            ← Catálogo
          </Link>
          <p className="truncate text-sm font-bold">{routePath}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {prev && (
            <Link href={`/preview/view/${prev.slug}`} className="ify-btn-ghost py-1 text-xs">
              ← Anterior
            </Link>
          )}
          {next && (
            <Link href={`/preview/view/${next.slug}`} className="ify-btn-ghost py-1 text-xs">
              Siguiente →
            </Link>
          )}
        </div>
      </div>

      {meta && meta.labels.length > 0 && (
        <details className="border-b bg-amber-50 px-4 py-2 text-xs">
          <summary className="cursor-pointer font-semibold">
            Textos extraídos ({meta.labels.length} labels, {meta.buttons.length} botones)
          </summary>
          <div className="mt-2 flex flex-wrap gap-1">
            {meta.labels.slice(0, 30).map((l) => (
              <span key={l} className="rounded bg-white px-2 py-0.5 border">
                {l}
              </span>
            ))}
          </div>
        </details>
      )}

      <iframe
        title={routePath}
        srcDoc={html}
        className="flex-1 w-full border-0 bg-white"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
