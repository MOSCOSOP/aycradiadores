import { COMPROBANTE_PRINT_CSS, pageRuleForSize } from "@/lib/comprobante/print-styles";

function absoluteAssetUrl(src: string): string {
  if (!src || src.startsWith("http") || src.startsWith("data:")) return src;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}${src.startsWith("/") ? src : `/${src}`}`;
}

function prepareHtmlForPrint(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;

  clone.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", absoluteAssetUrl(src));
  });

  return clone.outerHTML;
}

function waitForImages(doc: Document): Promise<void> {
  const images = Array.from(doc.images);
  if (!images.length) return Promise.resolve();

  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  ).then(() => undefined);
}

export function printDocument(elementId = "doc-print-area", pageSize: "A4" | "A5" = "A4") {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }

  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Permite ventanas emergentes para imprimir el comprobante.");
    return;
  }

  const html = prepareHtmlForPrint(el);
  const printCss = `
    ${COMPROBANTE_PRINT_CSS}
    ${pageRuleForSize(pageSize)}
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  `;

  w.document.open();
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante</title><style>${printCss}</style></head><body>${html}</body></html>`
  );
  w.document.close();

  const triggerPrint = async () => {
    await waitForImages(w.document);
    w.focus();
    w.print();
  };

  w.onload = () => {
    void triggerPrint();
  };
  setTimeout(() => {
    void triggerPrint();
  }, 800);
}
