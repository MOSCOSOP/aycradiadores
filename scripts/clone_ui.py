#!/usr/bin/env python3
"""
Extractor de UI / diseño — Inicia Factura Ya
============================================
Auto-login, recorre el menú y extrae SOLO diseño y textos:
  - Menú de navegación (sin WhatsApp)
  - Títulos, labels, botones, placeholders, columnas de tablas
  - CSS, fuentes, tokens de tema (data-color, etc.)
  - Shell HTML sanitizado (sin datos de clientes/comprobantes)

NO extrae:
  - Respuestas /records (datos de negocio)
  - Tokens, contraseñas, JSON de configuración sensible en scripts

Uso:
  pip install -r scripts/requirements-scraper.txt
  python scripts/clone_ui.py

Variables (.env.local o entorno):
  REMOTE_API_URL / IFY_BASE_URL
  REMOTE_API_EMAIL / IFY_EMAIL
  REMOTE_API_PASSWORD / IFY_PASSWORD
"""

from __future__ import annotations

import json
import os
import re
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Comment

# ── Config ────────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "extracted-ui"
ENV_FILE = ROOT / ".env.local"

WHATSAPP_KEYWORDS = (
    "whatsapp",
    "chatboot",
    "chatboot",
    "account_whatsapp",
    "/questions",
    "/answers",
)

SKIP_PATH_SUFFIXES = (
    "/records",
    "/logout",
)

SENSITIVE_SCRIPT_PATTERNS = (
    r":auth-user=",
    r":configuration=",
    r"soap_password",
    r"api_sunat_secret",
    r"api_service_token",
    r'"password"\s*:',
)


def load_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def get_config() -> tuple[str, str, str]:
    file_env = load_env_file(ENV_FILE)
    base = (
        os.getenv("IFY_BASE_URL")
        or os.getenv("REMOTE_API_URL")
        or file_env.get("REMOTE_API_URL")
        or "https://aycradiadores.iniciafacturaya.com"
    ).rstrip("/")
    email = (
        os.getenv("IFY_EMAIL")
        or os.getenv("REMOTE_API_EMAIL")
        or file_env.get("REMOTE_API_EMAIL")
        or file_env.get("ADMIN_EMAIL")
        or ""
    )
    password = (
        os.getenv("IFY_PASSWORD")
        or os.getenv("REMOTE_API_PASSWORD")
        or file_env.get("REMOTE_API_PASSWORD")
        or file_env.get("ADMIN_PASSWORD")
        or ""
    )
    if not email or not password:
        raise SystemExit(
            "Faltan credenciales. Define IFY_EMAIL e IFY_PASSWORD en .env.local"
        )
    return base, email, password


def is_whatsapp(text: str) -> bool:
    t = text.lower()
    return any(k in t for k in WHATSAPP_KEYWORDS)


def should_skip_url(path: str) -> bool:
    if not path or path.startswith("#"):
        return True
    if is_whatsapp(path):
        return True
    return any(path.rstrip("/").endswith(s) for s in SKIP_PATH_SUFFIXES)


def slugify_path(path: str) -> str:
    p = path.strip("/").replace("/", "__") or "home"
    return re.sub(r"[^a-zA-Z0-9_-]", "_", p)


@dataclass
class MenuItem:
    label: str
    href: str | None = None
    icon: str | None = None
    children: list["MenuItem"] = field(default_factory=list)


@dataclass
class PageExtract:
    path: str
    url: str
    title: str
    labels: list[str]
    buttons: list[str]
    placeholders: list[str]
    table_headers: list[str]
    headings: list[str]
    css_files: list[str]
    vue_components: list[str]
    theme: dict[str, str]
    status_code: int
    error: str | None = None


class IFYUICloner:
    def __init__(self, base_url: str, email: str, password: str) -> None:
        self.base_url = base_url
        self.email = email
        self.password = password
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "IFY-UI-Cloner/1.0 (design extraction)",
                "Accept-Language": "es-PE,es;q=0.9",
            }
        )
        self.csrf_token = ""
        self.menu: list[MenuItem] = []
        self.pages: list[PageExtract] = []
        self.design_tokens: dict[str, Any] = {}
        self.css_downloaded: list[str] = []

    # ── Auth ──────────────────────────────────────────────────────────────────

    def login(self) -> None:
        print(f"[*] Login en {self.base_url}")
        r = self.session.get(f"{self.base_url}/login", timeout=30)
        r.raise_for_status()
        csrf = self._extract_csrf(r.text)
        if not csrf:
            raise RuntimeError("No se encontró CSRF en /login")

        r2 = self.session.post(
            f"{self.base_url}/login",
            data={"email": self.email, "password": self.password, "_token": csrf},
            timeout=30,
            allow_redirects=True,
        )
        if r2.status_code >= 400:
            raise RuntimeError(f"Login falló HTTP {r2.status_code}")

        dash = self.session.get(f"{self.base_url}/dashboard", timeout=30)
        dash.raise_for_status()
        self.csrf_token = (
            self._extract_meta_csrf(dash.text) or csrf
        )
        print("[OK] Sesion iniciada")

    @staticmethod
    def _extract_csrf(html: str) -> str | None:
        m = re.search(r'name="_token"\s+value="([^"]+)"', html)
        return m.group(1) if m else None

    @staticmethod
    def _extract_meta_csrf(html: str) -> str | None:
        m = re.search(r'csrf-token"\s+content="([^"]+)"', html)
        return m.group(1) if m else None

    # ── Menú ──────────────────────────────────────────────────────────────────

    def fetch_menu(self) -> list[MenuItem]:
        html = self.session.get(f"{self.base_url}/dashboard", timeout=30).text
        soup = BeautifulSoup(html, "html.parser")
        menu_ul = soup.select_one("ul#menu.menu")
        if not menu_ul:
            raise RuntimeError("No se encontró ul#menu.menu")

        self.menu = self._parse_menu_list(menu_ul, top_level=True)
        self.menu = [m for m in self.menu if not is_whatsapp(m.label) and not is_whatsapp(m.href or "")]
        self._extract_theme_from_html(html)
        print(f"[OK] Menu: {len(self.menu)} modulos (WhatsApp excluido)")
        return self.menu

    def _parse_menu_list(self, ul, top_level: bool = False) -> list[MenuItem]:
        items: list[MenuItem] = []
        for li in ul.find_all("li", recursive=False):
            link = li.find("a", recursive=False)
            if not link:
                continue
            label_el = link.select_one("span.label")
            label = (label_el or link).get_text(strip=True)
            href = link.get("href", "")
            if href.startswith("http"):
                parsed = urlparse(href)
                if parsed.netloc and parsed.netloc not in self.base_url:
                    continue
                href = parsed.path or href
            if is_whatsapp(label) or is_whatsapp(href):
                continue

            icon = None
            i_tag = link.find("i")
            if i_tag and i_tag.get("class"):
                classes = [c for c in i_tag["class"] if c.startswith("bi-")]
                icon = classes[0] if classes else None

            child_ul = li.find("ul", recursive=False)
            children = self._parse_menu_list(child_ul) if child_ul else []

            if href.startswith("#") and not children:
                continue

            items.append(
                MenuItem(
                    label=label,
                    href=href if href and not href.startswith("#") else None,
                    icon=icon,
                    children=children,
                )
            )
        return items

    def collect_paths(self, items: list[MenuItem] | None = None) -> list[str]:
        items = items or self.menu
        paths: list[str] = []
        seen: set[str] = set()

        def walk(nodes: list[MenuItem]) -> None:
            for n in nodes:
                if n.href and not should_skip_url(n.href) and n.href not in seen:
                    seen.add(n.href)
                    paths.append(n.href)
                walk(n.children)

        walk(items)
        # Páginas clave adicionales
        for extra in ("/documents/create", "/purchases/create", "/dispatches/create", "/sale-notes/create", "/quotations/create", "/order-notes/create"):
            if extra not in seen and not should_skip_url(extra):
                paths.append(extra)
                seen.add(extra)
        return sorted(paths)

    # ── Extracción por página ───────────────────────────────────────────────────

    def crawl_pages(self, paths: list[str], delay: float = 0.4) -> None:
        total = len(paths)
        for i, path in enumerate(paths, 1):
            url = urljoin(self.base_url, path)
            print(f"  [{i}/{total}] {path}")
            try:
                r = self.session.get(url, timeout=45)
                if r.status_code >= 400:
                    self.pages.append(
                        PageExtract(
                            path=path,
                            url=url,
                            title="",
                            labels=[],
                            buttons=[],
                            placeholders=[],
                            table_headers=[],
                            headings=[],
                            css_files=[],
                            vue_components=[],
                            theme={},
                            status_code=r.status_code,
                            error=f"HTTP {r.status_code}",
                        )
                    )
                    continue

                ct = r.headers.get("content-type", "")
                if "application/json" in ct:
                    continue

                extract = self.extract_page(path, url, r.text, r.status_code)
                self.pages.append(extract)
                self._save_html_shell(path, r.text)
            except Exception as e:
                self.pages.append(
                    PageExtract(
                        path=path,
                        url=url,
                        title="",
                        labels=[],
                        buttons=[],
                        placeholders=[],
                        table_headers=[],
                        headings=[],
                        css_files=[],
                        vue_components=[],
                        theme={},
                        status_code=0,
                        error=str(e),
                    )
                )
            time.sleep(delay)

    def extract_page(
        self, path: str, url: str, html: str, status: int
    ) -> PageExtract:
        soup = BeautifulSoup(html, "html.parser")

        title = soup.title.get_text(strip=True) if soup.title else ""
        theme = self._theme_from_soup(soup)

        labels = self._unique_texts(soup, "label, .ify-label, .form-label, .el-form-item__label")
        buttons = self._unique_texts(
            soup,
            "button, .btn, .ify-btn-primary, .ify-btn-outline, a.btn",
            min_len=2,
        )
        placeholders = [
            inp.get("placeholder", "").strip()
            for inp in soup.find_all(["input", "textarea"])
            if inp.get("placeholder")
        ]
        placeholders = sorted(set(p for p in placeholders if p))

        table_headers = []
        for th in soup.find_all("th"):
            t = th.get_text(strip=True)
            if t and len(t) < 80:
                table_headers.append(t)
        table_headers = sorted(set(table_headers))

        headings = []
        for tag in ("h1", "h2", "h3", "h4", "h5"):
            for h in soup.find_all(tag):
                t = h.get_text(strip=True)
                if t and len(t) < 120:
                    headings.append(t)
        headings = sorted(set(headings))

        css_files = []
        for link in soup.find_all("link", rel="stylesheet"):
            href = link.get("href")
            if href:
                css_files.append(urljoin(url, href))
        css_files = sorted(set(css_files))

        vue_components = sorted(
            set(re.findall(r"<(tenant-[a-z0-9-]+)", html, re.I))
        )

        return PageExtract(
            path=path,
            url=url,
            title=title,
            labels=sorted(set(labels)),
            buttons=sorted(set(buttons))[:60],
            placeholders=placeholders,
            table_headers=table_headers,
            headings=headings,
            css_files=css_files,
            vue_components=vue_components,
            theme=theme,
            status_code=status,
        )

    def _extract_theme_from_html(self, html: str) -> None:
        soup = BeautifulSoup(html, "html.parser")
        html_tag = soup.find("html")
        if not html_tag:
            return
        self.design_tokens = {
            "data_color": html_tag.get("data-color"),
            "data_navcolor": html_tag.get("data-navcolor"),
            "data_layout": html_tag.get("data-layout"),
            "data_radius": html_tag.get("data-radius"),
            "data_placement": html_tag.get("data-placement"),
            "fonts": [
                link.get("href")
                for link in soup.find_all("link", href=True)
                if "fonts.googleapis" in link["href"]
            ],
            "primary_css": [
                urljoin(self.base_url, link.get("href", ""))
                for link in soup.find_all("link", rel="stylesheet")
                if link.get("href") and ("acorn/css" in link["href"] or "porto-light" in link["href"])
            ],
        }

    @staticmethod
    def _theme_from_soup(soup: BeautifulSoup) -> dict[str, str]:
        html_tag = soup.find("html")
        if not html_tag:
            return {}
        keys = ("data-color", "data-navcolor", "data-layout", "data-radius")
        return {k: html_tag.get(k) or "" for k in keys if html_tag.get(k)}

    @staticmethod
    def _unique_texts(soup: BeautifulSoup, selector: str, min_len: int = 1) -> list[str]:
        out: list[str] = []
        for el in soup.select(selector):
            t = el.get_text(strip=True)
            if t and len(t) >= min_len and len(t) < 100:
                out.append(t)
        return out

    def _save_html_shell(self, path: str, html: str) -> None:
        soup = BeautifulSoup(html, "html.parser")

        # Quitar scripts (pueden tener tokens/config)
        for script in soup.find_all("script"):
            src = script.get("src", "")
            body = script.string or ""
            if any(re.search(p, body) for p in SENSITIVE_SCRIPT_PATTERNS):
                script.decompose()
                continue
            if not src:
                script.decompose()

        # Quitar filas de datos en tablas
        for tbody in soup.find_all("tbody"):
            for tr in tbody.find_all("tr"):
                tr.decompose()
            placeholder = soup.new_tag("tr")
            td = soup.new_tag("td")
            td.string = "{{ datos }}"
            placeholder.append(td)
            tbody.append(placeholder)

        # Quitar inputs con valores de negocio
        for inp in soup.find_all("input"):
            if inp.get("value") and inp.get("type") not in ("hidden",):
                inp["value"] = ""
            if inp.get("type") == "hidden" and inp.get("name") == "_token":
                inp.decompose()

        # Comentarios
        for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
            c.extract()

        shells_dir = OUTPUT_DIR / "html-shells"
        shells_dir.mkdir(parents=True, exist_ok=True)
        (shells_dir / f"{slugify_path(path)}.html").write_text(
            str(soup), encoding="utf-8"
        )

    # ── Assets CSS ────────────────────────────────────────────────────────────

    def download_css(self, max_files: int = 8) -> None:
        css_dir = OUTPUT_DIR / "assets" / "css"
        css_dir.mkdir(parents=True, exist_ok=True)
        all_css: list[str] = []
        for p in self.pages:
            all_css.extend(p.css_files)
        all_css = sorted(set(all_css))[:max_files]

        for url in all_css:
            try:
                name = Path(urlparse(url).path).name or "style.css"
                dest = css_dir / name
                if dest.exists():
                    continue
                r = self.session.get(url, timeout=30)
                if r.ok:
                    dest.write_bytes(r.content)
                    self.css_downloaded.append(name)
                    print(f"  CSS: {name}")
            except Exception:
                pass

    # ── Export ────────────────────────────────────────────────────────────────

    def menu_to_dict(self, items: list[MenuItem]) -> list[dict]:
        result = []
        for item in items:
            d: dict[str, Any] = {"label": item.label}
            if item.href:
                d["href"] = item.href
            if item.icon:
                d["icon"] = item.icon
            if item.children:
                d["children"] = self.menu_to_dict(item.children)
            result.append(d)
        return result

    def save_all(self) -> None:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        menu_json = self.menu_to_dict(self.menu)
        (OUTPUT_DIR / "menu.json").write_text(
            json.dumps(menu_json, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        (OUTPUT_DIR / "design-tokens.json").write_text(
            json.dumps(self.design_tokens, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        pages_data = [asdict(p) for p in self.pages]
        (OUTPUT_DIR / "pages.json").write_text(
            json.dumps(pages_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        # Textos únicos globales (para i18n / nuevo cliente)
        all_labels: set[str] = set()
        all_buttons: set[str] = set()
        for p in self.pages:
            all_labels.update(p.labels)
            all_buttons.update(p.buttons)

        texts = {
            "labels": sorted(all_labels),
            "buttons": sorted(all_buttons),
            "note": "Textos de UI extraídos. Reemplazar datos de empresa al white-label.",
        }
        (OUTPUT_DIR / "ui-texts.json").write_text(
            json.dumps(texts, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        manifest = {
            "source": self.base_url,
            "extracted_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "whatsapp_excluded": True,
            "pages_ok": sum(1 for p in self.pages if p.status_code == 200),
            "pages_failed": sum(1 for p in self.pages if p.error),
            "menu_modules": len(self.menu),
            "css_downloaded": self.css_downloaded,
            "output_dir": str(OUTPUT_DIR),
        }
        (OUTPUT_DIR / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        self._generate_nav_ts(menu_json)

        print(f"\n[OK] Exportado en: {OUTPUT_DIR}")
        print(f"  Páginas OK: {manifest['pages_ok']}")
        print(f"  Fallidas:   {manifest['pages_failed']}")

    def _generate_nav_ts(self, menu: list[dict]) -> None:
        """Genera navigation.generated.ts para importar en el clon (sin WhatsApp)."""
        ts_path = OUTPUT_DIR / "navigation.generated.ts"
        content = (
            "// Auto-generado por scripts/clone_ui.py — NO editar a mano\n"
            "// Copiar a src/lib/navigation.generated.ts si deseas usar el menú extraído\n\n"
            f"export const GENERATED_NAV = {json.dumps(menu, ensure_ascii=False, indent=2)} as const;\n"
        )
        ts_path.write_text(content, encoding="utf-8")

    def run(self) -> None:
        print("=" * 60)
        print("IFY UI Cloner — solo diseño, sin datos de negocio")
        print("=" * 60)
        self.login()
        self.fetch_menu()
        paths = self.collect_paths()
        print(f"[*] Extrayendo {len(paths)} paginas...")
        self.crawl_pages(paths)
        print("[*] Descargando CSS principal...")
        self.download_css()
        self.save_all()


def main() -> None:
    base, email, password = get_config()
    cloner = IFYUICloner(base, email, password)
    cloner.run()


if __name__ == "__main__":
    main()
