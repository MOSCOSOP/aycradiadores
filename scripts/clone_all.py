#!/usr/bin/env python3
"""
Clone ALL — Inicia Factura Ya
==============================
Clona automaticamente TODAS las pantallas (HTML + CSS + assets) del sistema
original e integra el resultado en el clon Next.js.

  pip install -r scripts/requirements-scraper.txt
  python scripts/clone_all.py

Salida:
  extracted-ui/html-shells/     HTML por ruta (sanitizado)
  extracted-ui/content-shells/  Solo contenido principal (para iframe)
  public/cloned-assets/         CSS, fuentes, imagenes locales
  src/lib/cloned-routes.generated.json
  src/lib/path-aliases.generated.json
  extracted-ui/manifest.json

Despues: npm run dev  ->  cada ruta del menu muestra el diseno clonado.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse

# Importar cloner base
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from clone_ui import IFYUICloner, get_config, slugify_path, should_skip_url  # noqa: E402
from endpoints_catalog import (  # noqa: E402
    PATH_ALIASES,
    all_source_paths,
    build_reverse_aliases,
    merge_paths,
)

PUBLIC_ASSETS = ROOT / "public" / "cloned-assets"
CONTENT_DIR = ROOT / "extracted-ui" / "content-shells"
GENERATED_DIR = ROOT / "src" / "lib"

HIDE_CHROME_CSS = """
<style id="clone-embed-fix">
  #menu, ul.menu, .menu-container, nav#menu, .nav-container,
  .sidebar, .navbar-vertical, header.navbar, .mobile-buttons-container,
  .layout-sidebar, #sidebar, .sidebar-container { display: none !important; }
  html, body { margin: 0 !important; padding: 0 !important; overflow-x: auto !important; }
  #root, #app, main, #main, .main-content, .container-fluid, .layout-main {
    margin-left: 0 !important; padding-left: 0 !important;
    width: 100% !important; max-width: 100% !important;
  }
</style>
"""

MAIN_SELECTORS = [
    "#main",
    "main.main-content",
    "main",
    ".layout-main",
    "#app",
    ".container-fluid",
]

VUE_TAG_RE = re.compile(r"<tenant-[a-z0-9-]+", re.I)
STATIC_UI_MARKERS = ("<table", "<form", "<button", 'class="card', "el-table", "data-table")


def is_vue_spa_html(html: str) -> bool:
    """El ERP renderiza con Vue: el HTML solo trae <tenant-*> sin contenido visible."""
    if not VUE_TAG_RE.search(html):
        return False
    body_match = re.search(r"<body[^>]*>([\s\S]*)</body>", html, re.I)
    body = body_match.group(1) if body_match else html
    visible = re.sub(r"<script[\s\S]*?</script>", "", body, flags=re.I)
    visible = re.sub(r"<style[\s\S]*?</style>", "", visible, flags=re.I)
    visible = re.sub(r"<[^>]+>", " ", visible)
    visible = re.sub(r"\s+", " ", visible).strip()
    if len(visible) > 80:
        return False
    body_lower = body.lower()
    if any(m in body_lower for m in STATIC_UI_MARKERS):
        return False
    return True


class FullSiteCloner(IFYUICloner):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.asset_map: dict[str, str] = {}
        self.downloaded_assets: list[str] = []

    def collect_all_paths(self) -> list[str]:
        menu_paths = self.collect_paths()
        catalog_paths = all_source_paths()
        merged = merge_paths(menu_paths, catalog_paths)
        print(f"[OK] Rutas totales a clonar: {len(merged)}")
        return merged

    def crawl_pages(self, paths: list[str], delay: float = 0.35) -> None:
        super().crawl_pages(paths, delay=delay)
        # Clonar tambien rutas alias (mismo HTML, distinto slug)
        rev = build_reverse_aliases()
        shells_dir = self.output_dir / "html-shells"
        for clone_path, source_path in PATH_ALIASES.items():
            src_slug = slugify_path(source_path)
            dst_slug = slugify_path(clone_path)
            src_file = shells_dir / f"{src_slug}.html"
            dst_file = shells_dir / f"{dst_slug}.html"
            if src_file.exists() and not dst_file.exists():
                dst_file.write_text(src_file.read_text(encoding="utf-8"), encoding="utf-8")
                print(f"  [alias] {clone_path} <- {source_path}")

    @property
    def output_dir(self) -> Path:
        from clone_ui import OUTPUT_DIR

        return OUTPUT_DIR

    def download_all_assets(self) -> None:
        css_dir = PUBLIC_ASSETS / "css"
        js_dir = PUBLIC_ASSETS / "js"
        fonts_dir = PUBLIC_ASSETS / "fonts"
        img_dir = PUBLIC_ASSETS / "img"
        for d in (css_dir, js_dir, fonts_dir, img_dir):
            d.mkdir(parents=True, exist_ok=True)

        all_urls: set[str] = set()
        for p in self.pages:
            all_urls.update(p.css_files)

        # CSS conocidos Acorn + Porto
        for rel in (
            "/acorn/css/main.css",
            "/acorn/css/styles.css",
            "/acorn/css/theme-chalk.css",
            "/acorn/css/vendor/bootstrap.min.css",
            "/acorn/css/vendor/OverlayScrollbars.min.css",
            "/porto-light/css/custom.css",
            "/porto-light/vendor/font-awesome/5.11/css/all.min.css",
        ):
            all_urls.add(urljoin(self.base_url, rel))

        print(f"[*] Descargando {len(all_urls)} assets...")
        for url in sorted(all_urls):
            self._download_asset(url, css_dir, js_dir, fonts_dir, img_dir)

        print(f"[OK] Assets descargados: {len(self.downloaded_assets)}")

    def _download_asset(self, url: str, css_dir, js_dir, fonts_dir, img_dir) -> None:
        try:
            parsed = urlparse(url)
            name = Path(parsed.path).name
            if not name:
                return
            ext = Path(name).suffix.lower()
            if ext == ".css":
                dest = css_dir / name
                public_prefix = "/cloned-assets/css"
            elif ext == ".js":
                dest = js_dir / name
                public_prefix = "/cloned-assets/js"
            elif ext in (".woff", ".woff2", ".ttf", ".eot"):
                dest = fonts_dir / name
                public_prefix = "/cloned-assets/fonts"
            elif ext in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico"):
                dest = img_dir / name
                public_prefix = "/cloned-assets/img"
            else:
                dest = css_dir / name
                public_prefix = "/cloned-assets/css"

            if dest.exists():
                self.asset_map[url] = f"{public_prefix}/{name}"
                return

            r = self.session.get(url, timeout=45)
            if r.ok:
                dest.write_bytes(r.content)
                self.asset_map[url] = f"{public_prefix}/{name}"
                self.downloaded_assets.append(name)
                print(f"  asset: {name}")
        except Exception:
            pass

    def process_shells_for_embed(self) -> None:
        from bs4 import BeautifulSoup

        from clone_ui import OUTPUT_DIR

        shells_dir = OUTPUT_DIR / "html-shells"
        CONTENT_DIR.mkdir(parents=True, exist_ok=True)
        count = 0

        for html_file in shells_dir.glob("*.html"):
            raw = html_file.read_text(encoding="utf-8")
            soup = BeautifulSoup(raw, "html.parser")

            # Reescribir CSS a assets locales
            for link in soup.find_all("link", rel="stylesheet"):
                href = link.get("href", "")
                if not href:
                    continue
                full = urljoin(self.base_url, href)
                local = self.asset_map.get(full)
                if local:
                    link["href"] = local
                elif href.startswith("http"):
                    # Mantener CDN (google fonts, bootstrap icons)
                    pass
                elif href.startswith("/"):
                    fname = Path(href).name
                    link["href"] = f"/cloned-assets/css/{fname}"

            # Extraer contenido principal
            main_el = None
            for sel in MAIN_SELECTORS:
                main_el = soup.select_one(sel)
                if main_el:
                    break

            embed_html = str(main_el) if main_el else str(soup.find("body") or soup)

            # Documento minimo con CSS local
            head_links = ""
            for link in soup.find_all("link", rel="stylesheet"):
                href = link.get("href", "")
                if href:
                    head_links += f'<link rel="stylesheet" href="{href}">\n'

            doc = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{head_links}
{HIDE_CHROME_CSS}
</head>
<body>{embed_html}</body>
</html>"""

            out = CONTENT_DIR / html_file.name
            out.write_text(doc, encoding="utf-8")
            # Actualizar shell completo tambien
            html_file.write_text(str(soup), encoding="utf-8")
            count += 1

        print(f"[OK] Content shells procesados: {count}")

    def generate_integration(self) -> None:
        from clone_ui import OUTPUT_DIR

        GENERATED_DIR.mkdir(parents=True, exist_ok=True)
        shells_dir = OUTPUT_DIR / "html-shells"
        content_dir = CONTENT_DIR

        routes: list[dict] = []
        vue_count = 0
        for html_file in sorted(shells_dir.glob("*.html")):
            slug = html_file.stem
            path = "/" + slug.replace("__", "/") if slug != "home" else "/"
            content_file = content_dir / html_file.name
            has_content = content_file.exists()
            content_html = content_file.read_text(encoding="utf-8") if has_content else ""
            vue_spa = is_vue_spa_html(content_html) if content_html else False
            if vue_spa:
                vue_count += 1
            page = next((p for p in self.pages if slugify_path(p.path) == slug), None)
            routes.append(
                {
                    "path": path,
                    "slug": slug,
                    "has_content_shell": has_content,
                    "is_vue_spa": vue_spa,
                    "embeddable": has_content and not vue_spa,
                    "title": page.title if page else "",
                    "status": page.status_code if page else 0,
                }
            )

        routes_path = GENERATED_DIR / "cloned-routes.generated.json"
        routes_path.write_text(json.dumps(routes, ensure_ascii=False, indent=2), encoding="utf-8")

        aliases_path = GENERATED_DIR / "path-aliases.generated.json"
        aliases_path.write_text(json.dumps(PATH_ALIASES, ensure_ascii=False, indent=2), encoding="utf-8")

        embeddable_paths = [r["path"] for r in routes if r.get("embeddable")]
        index = {
            "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source": self.base_url,
            "total_routes": len(routes),
            "vue_spa_routes": vue_count,
            "embeddable_routes": len(embeddable_paths),
            "paths": embeddable_paths,
        }
        (OUTPUT_DIR / "clone-index.json").write_text(
            json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        print(f"[OK] Integracion generada en src/lib/")
        print(f"  Rutas Vue SPA (sin iframe): {vue_count}")
        print(f"  Rutas embeddables: {len(embeddable_paths)}")

    def run_full(self) -> None:
        print("=" * 60)
        print("IFY Clone ALL — HTML + CSS + integracion automatica")
        print("=" * 60)
        self.login()
        self.fetch_menu()
        paths = self.collect_all_paths()
        print(f"[*] Clonando {len(paths)} paginas del origen...")
        self.crawl_pages(paths)
        print("[*] Descargando CSS y assets...")
        self.download_all_assets()
        print("[*] Procesando shells para embed...")
        self.process_shells_for_embed()
        self.save_all()
        self.generate_integration()
        print("\n[LISTO] Ejecuta: npm run dev")
        print("  Para clonar DATOS (productos, clientes, POS): npm run clone:data")


def main() -> None:
    base, email, password = get_config()
    cloner = FullSiteCloner(base, email, password)
    cloner.run_full()


if __name__ == "__main__":
    main()
