#!/usr/bin/env python3
"""
Servidor local para ver extracted-ui/ en el navegador.
Uso: python scripts/serve_extracted.py
Abre: http://localhost:8888
"""

from __future__ import annotations

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
EXTRACTED = ROOT / "extracted-ui"
PORT = int(os.getenv("PREVIEW_PORT", "8888"))


def build_index_html() -> str:
    pages_file = EXTRACTED / "pages.json"
    shells_dir = EXTRACTED / "html-shells"
    pages = []
    if pages_file.exists():
        pages = json.loads(pages_file.read_text(encoding="utf-8"))

    rows = []
    if shells_dir.exists():
        for f in sorted(shells_dir.glob("*.html")):
            slug = f.stem
            route = "/" + slug.replace("__", "/") if slug != "home" else "/"
            meta = next((p for p in pages if p.get("path") == route), {})
            title = (meta.get("title") or route).strip()[:60]
            rows.append(
                f'<tr><td><code>{route}</code></td>'
                f'<td>{title}</td>'
                f'<td><a href="/html-shells/{slug}.html" target="_blank">Abrir</a></td></tr>'
            )

    return f"""<!DOCTYPE html>
<html lang="es"><head>
<meta charset="UTF-8"/>
<title>IFY UI Extraída — Preview</title>
<style>
  body {{ font-family: 'Segoe UI', sans-serif; margin: 0; background: #f4f4f4; }}
  header {{ background: #2493d8; color: #fff; padding: 1.25rem 2rem; }}
  main {{ max-width: 1100px; margin: 1.5rem auto; padding: 0 1rem; }}
  table {{ width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }}
  th, td {{ padding: .6rem 1rem; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }}
  th {{ background: #f8f9fa; font-weight: 600; color: #727272; }}
  a {{ color: #2493d8; font-weight: 600; }}
  code {{ font-size: 12px; }}
</style></head><body>
<header><h1>Visor UI extraída</h1><p>{len(rows)} pantallas — carpeta extracted-ui/</p></header>
<main><table><thead><tr><th>Ruta</th><th>Título</th><th></th></tr></thead>
<tbody>{"".join(rows)}</tbody></table></main></body></html>"""


class PreviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(EXTRACTED), **kwargs)

    def do_GET(self):
        path = unquote(self.path.split("?")[0])
        if path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(build_index_html().encode("utf-8"))
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {fmt % args}")


def main():
    if not EXTRACTED.exists():
        raise SystemExit(
            "No existe extracted-ui/. Ejecuta primero: python scripts/clone_ui.py"
        )
    (EXTRACTED / "index.html").write_text(build_index_html(), encoding="utf-8")
    server = HTTPServer(("127.0.0.1", PORT), PreviewHandler)
    print(f"[*] Preview en http://localhost:{PORT}")
    print("[*] Ctrl+C para detener")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Detenido")


if __name__ == "__main__":
    main()
