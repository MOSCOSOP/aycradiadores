"use client";

import { useEffect, useRef, useState } from "react";

/** Escala la hoja A4/A5 completa para que en celular se vea igual que en impresión. */
export function DocPrintViewport({
  children,
  pageSize = "A4",
}: {
  children: React.ReactNode;
  pageSize?: "A4" | "A5";
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({ scale: 1, height: 0 });

  useEffect(() => {
    const update = () => {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const available = outer.clientWidth;
      const natural = Math.max(inner.scrollWidth, inner.offsetWidth);
      const scale = available > 0 && natural > available ? available / natural : 1;
      setLayout({ scale, height: inner.offsetHeight * scale });
    };

    update();
    const t1 = window.setTimeout(update, 80);
    const t2 = window.setTimeout(update, 400);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && outerRef.current) ro.observe(outerRef.current);
    if (ro && innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", update);

    const imgs = innerRef.current?.querySelectorAll("img") ?? [];
    imgs.forEach((img) => img.addEventListener("load", update));

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener("resize", update);
      imgs.forEach((img) => img.removeEventListener("load", update));
    };
  }, [children, pageSize]);

  return (
    <div ref={outerRef} className="doc-print-viewport mx-auto w-full">
      <div className="doc-print-viewport-spacer" style={{ height: layout.height || undefined }}>
        <div
          ref={innerRef}
          className="doc-print-viewport-inner"
          style={{
            transform: `scale(${layout.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
