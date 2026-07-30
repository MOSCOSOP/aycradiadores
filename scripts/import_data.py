#!/usr/bin/env python3
"""
Import DATA — Inicia Factura Ya
================================
Descarga TODOS los datos del ERP original (/records, tablas POS, imágenes)
y los guarda en imported-data/ para volcarlos a SQLite.

  pip install -r scripts/requirements-scraper.txt
  python scripts/import_data.py
  tsx prisma/import-from-clone.ts

Variables: IFY_BASE_URL, IFY_EMAIL, IFY_PASSWORD (o .env.local)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent))

from clone_ui import IFYUICloner, get_config  # noqa: E402
from data_modules_catalog import DATA_RECORDS_ENDPOINTS, DATA_TABLE_ENDPOINTS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
IMPORT_DIR = ROOT / "imported-data"
IMAGES_DIR = ROOT / "public" / "imported-assets" / "items"


def parse_money(value: object) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    s = re.sub(r"[^\d.-]", "", str(value))
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def parse_float(value: object) -> float:
    if value is None:
        return 0.0
    try:
        return float(str(value).replace(",", ""))
    except ValueError:
        return 0.0


class IFYDataImporter(IFYUICloner):
    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.stats: dict[str, int | str] = {}
        self.images_downloaded = 0
        self.images_skipped = 0

    def _api_headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": self.csrf_token,
        }

    def fetch_paginated(self, api_path: str, limit: int = 100, extra_params: dict | None = None) -> list[dict]:
        page = 1
        all_rows: list[dict] = []
        last_page = 1
        base_params = {"limit": limit, **(extra_params or {})}

        while True:
            url = f"{self.base_url}{api_path}"
            r = self.session.get(
                url,
                params={**base_params, "page": page},
                headers=self._api_headers(),
                timeout=90,
            )
            if r.status_code != 200:
                print(f"    [WARN] HTTP {r.status_code} en pagina {page}")
                break

            payload = r.json()
            rows = payload.get("data")
            if rows is None:
                break
            if not isinstance(rows, list):
                rows = [rows]

            all_rows.extend(rows)
            meta = payload.get("meta") or {}
            last_page = int(meta.get("last_page") or page)
            total = meta.get("total")
            label = f"total={total}" if total is not None else f"+{len(rows)}"
            print(f"    pag {page}/{last_page} ({label})")

            if not rows or page >= last_page:
                break
            page += 1
            time.sleep(0.2)

        return all_rows

    def fetch_table(self, api_path: str) -> dict | list | None:
        r = self.session.get(
            f"{self.base_url}{api_path}",
            headers=self._api_headers(),
            timeout=120,
        )
        if r.status_code != 200:
            print(f"    [WARN] HTTP {r.status_code}")
            return None
        return r.json()

    def download_item_images(self, items: list[dict]) -> None:
        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        print(f"[*] Descargando imagenes de productos ({len(items)} items)...")

        for item in items:
            item_id = item.get("id")
            if not item_id:
                continue
            url = (
                item.get("image_url_small")
                or item.get("image_url_medium")
                or item.get("image_url")
            )
            if not url or not str(url).startswith("http"):
                continue

            ext = Path(urlparse(str(url)).path).suffix or ".jpg"
            dest = IMAGES_DIR / f"{item_id}{ext}"
            public_path = f"/imported-assets/items/{item_id}{ext}"

            if dest.exists() and dest.stat().st_size > 0:
                item["local_image"] = public_path
                self.images_skipped += 1
                continue

            try:
                img = self.session.get(str(url), timeout=45)
                if img.ok and img.content:
                    dest.write_bytes(img.content)
                    item["local_image"] = public_path
                    self.images_downloaded += 1
                    if self.images_downloaded % 50 == 0:
                        print(f"    {self.images_downloaded} imagenes...")
            except Exception:
                pass

            time.sleep(0.05)

        print(f"[OK] Imagenes: {self.images_downloaded} nuevas, {self.images_skipped} ya existian")

    def normalize_items(self, items: list[dict]) -> None:
        for item in items:
            item["_import"] = {
                "sale_unit_price": parse_money(
                    item.get("amount_sale_unit_price") or item.get("sale_unit_price")
                ),
                "purchase_price": parse_money(item.get("purchase_unit_price")),
                "stock": parse_float(item.get("stock")),
                "kind": "service" if item.get("unit_type_id") == "ZZ" else "product",
                "category_name": (
                    (item.get("category") or {}).get("name")
                    or item.get("category_description")
                    or ""
                ),
            }

    def save_json(self, name: str, data: object) -> Path:
        IMPORT_DIR.mkdir(parents=True, exist_ok=True)
        path = IMPORT_DIR / f"{name}.json"
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    def run_import(self, skip_images: bool = False, run_db: bool = True, only_modules: list[str] | None = None) -> None:
        print("=" * 60)
        print("IFY Import DATA — registros + tablas + imagenes")
        print("=" * 60)

        self.login()
        manifest: dict[str, object] = {
            "source": self.base_url,
            "imported_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "modules": {},
        }

        # ── Tablas auxiliares (POS, documentos, columnas) ──
        if not only_modules:
            print("\n[*] Tablas auxiliares...")
            for name, api_path in DATA_TABLE_ENDPOINTS:
                print(f"  {name} <- {api_path}")
                data = self.fetch_table(api_path)
                if data is not None:
                    self.save_json(name, data)
                    count = len(data) if isinstance(data, list) else len(data.keys())
                    manifest["modules"][name] = {"path": api_path, "count": count, "type": "table"}
                    print(f"    [OK] guardado ({count})")

        # ── Records paginados ──
        print("\n[*] Registros paginados...")
        extra_params_map: dict[str, dict] = {
            "sale_notes": {"column": "date_of_issue", "order": "desc"},
            "documents": {"column": "date_of_issue", "order": "desc"},
        }
        modules = DATA_RECORDS_ENDPOINTS
        if only_modules:
            modules = [(n, p) for n, p in DATA_RECORDS_ENDPOINTS if n in only_modules]

        for name, api_path in modules:
            print(f"  {name} <- {api_path}")
            rows = self.fetch_paginated(api_path, limit=500 if name == "sale_notes" else 100, extra_params=extra_params_map.get(name))
            if name == "items":
                self.normalize_items(rows)
                if not skip_images:
                    self.download_item_images(rows)
            self.save_json(name, rows)
            manifest["modules"][name] = {
                "path": api_path,
                "count": len(rows),
                "type": "records",
            }
            print(f"    [OK] {len(rows)} registros")

        manifest["images_downloaded"] = self.images_downloaded
        manifest["images_skipped"] = self.images_skipped
        self.save_json("manifest", manifest)

        print("\n[OK] Datos exportados en imported-data/")
        for name, info in manifest["modules"].items():
            print(f"  {name}: {info.get('count', '?')}")

        if run_db:
            print("\n[*] Volcando a SQLite (prisma/import-from-clone.ts)...")
            env = os.environ.copy()
            if only_modules:
                env["ONLY_MODULES"] = ",".join(only_modules)
            result = subprocess.run(
                ["npx", "tsx", "prisma/import-from-clone.ts"],
                cwd=ROOT,
                shell=True,
                env=env,
            )
            if result.returncode != 0:
                raise SystemExit("Fallo import-from-clone.ts")
            print("[LISTO] Base de datos actualizada. Ejecuta: npm run dev")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Importar datos del ERP IFY")
    parser.add_argument("--skip-images", action="store_true", help="No descargar imagenes")
    parser.add_argument("--images-only", action="store_true", help="Solo descargar imagenes desde items.json")
    parser.add_argument("--no-db", action="store_true", help="Solo JSON, sin volcar a SQLite")
    parser.add_argument("--only", type=str, default="", help="Solo importar modulos (csv): sale_notes,documents,...")
    args = parser.parse_args()

    base, email, password = get_config()
    importer = IFYDataImporter(base, email, password)
    only_list = [s.strip() for s in args.only.split(",") if s.strip()] or None

    if args.images_only:
        items_path = IMPORT_DIR / "items.json"
        if not items_path.exists():
            raise SystemExit("No existe imported-data/items.json. Ejecuta import_data.py primero.")
        items = json.loads(items_path.read_text(encoding="utf-8"))
        importer.login()
        importer.download_item_images(items)
        items_path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
        print("[OK] Imagenes actualizadas en items.json")
        if not args.no_db:
            subprocess.run(["npx", "tsx", "prisma/import-from-clone.ts"], cwd=ROOT, shell=True)
        return

    importer.run_import(skip_images=args.skip_images, run_db=not args.no_db, only_modules=only_list)


if __name__ == "__main__":
    main()
