"use client";

import { useEffect, useRef, useState } from "react";

/** Escala el comprobante A4/A5 para que se vea completo en celular sin desordenar el layout. */
export function DocPrintViewport({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const update = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const pad = 12;
      const available = outer.clientWidth - pad;
      const natural = inner.offsetWidth;
      const scale = natural > available && available > 0 ? available / natural : 1;
      const height = inner.offsetHeight * scale;
      setLayout({ scale, height });
    };

    const t = window.setTimeout(update, 120);
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", update);
    return () => {
      window.clearTimeout(t);
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children]);

  return (
    <div ref={outerRef} className="doc-print-viewport mx-auto w-full max-w-[220mm]">
      <div className="doc-print-viewport-spacer" style={{ height: layout.height || undefined }}>
        <div
          ref={innerRef}
          className="doc-print-viewport-inner"
          style={{
            transform: layout.scale < 1 ? `scale(${layout.scale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
