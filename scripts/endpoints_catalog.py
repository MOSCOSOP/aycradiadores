"""
Catalogo completo de rutas del sistema Inicia Factura Ya.
Usado por scripts/clone_all.py para clonar TODAS las pantallas.
WhatsApp excluido a proposito.
"""

# Rutas extra /create y pantallas que no siempre aparecen en el menu
EXTRA_ENDPOINTS = [
    "/documents/create",
    "/purchases/create",
    "/dispatches/create",
    "/sale-notes/create",
    "/quotations/create",
    "/order-notes/create",
    "/account/sub_diaries/create",
    "/account/sub_diaries/create_automatic",
]

# Rutas conocidas del ERP (referencia aycradiadores.iniciafacturaya.com)
STATIC_ENDPOINTS = [
    "/dashboard",
    "/documents",
    "/documents/create",
    "/documents/not-sent",
    "/documents/regularize-shipping",
    "/documents-recurrence",
    "/sale-notes",
    "/sale-notes/create",
    "/contingencies",
    "/quotations",
    "/quotations/create",
    "/summaries",
    "/voided",
    "/order-notes",
    "/order-notes/create",
    "/technical-services",
    "/pos",
    "/cash",
    "/items",
    "/item-sets",
    "/services",
    "/categories",
    "/cupones",
    "/brands",
    "/ingredients",
    "/ingredient-attributes",
    "/lines",
    "/line-attributes",
    "/series",
    "/item-lots",
    "/item-lots-group",
    "/item-cost-history",
    "/price-adjustments",
    "/discount-types",
    "/persons/customers",
    "/person-types",
    "/zones",
    "/persons/suppliers",
    "/purchases",
    "/purchases/create",
    "/purchase-settlements",
    "/purchase-quotations",
    "/purchase-orders",
    "/expenses",
    "/fixed-asset/items",
    "/fixed-asset/purchases",
    "/inventory-references",
    "/inventory",
    "/inventory/validate",
    "/transfers",
    "/devolutions",
    "/reports/kardex",
    "/reports/inventory",
    "/reports/valued-kardex",
    "/reports/kardexaverage",
    "/reports/stock_date",
    "/list-reports",
    "/payroll",
    "/users",
    "/establishments",
    "/dispatches",
    "/dispatches/create",
    "/dispatch_carrier",
    "/dispatchers",
    "/transports",
    "/drivers",
    "/vehicles",
    "/origin_addresses",
    "/retentions",
    "/perceptions",
    "/order-forms",
    "/order-delivery",
    "/order-notes",
    "/account/format",
    "/account/ple",
    "/account/ledger_accounts",
    "/account/sub_diaries/create",
    "/account/sub_diaries/create_automatic",
    "/sire/appendix",
    "/sire/purchase",
    "/sire/sale",
    "/finances/movements",
    "/finances/income",
    "/finances/to-pay",
    "/finances/unpaid",
    "/finances/balance",
    "/finances/global-payments",
    "/finances/payment-method-types",
    "/exchange_currency",
    "/complaint",
    "/list-settings",
    "/cuenta/payment_index",
    "/bill-of-exchange",
    "/bill-of-exchange-pay",
]

# Rutas de nuestro menu clon -> ruta real en el sistema origen
PATH_ALIASES = {
    "/accounting/chart": "/account/ledger_accounts",
    "/accounting/daily": "/account/sub_diaries/create",
    "/accounting/books": "/account/ple",
    "/accounting/books-excel": "/account/format",
    "/accounting/entries": "/account/sub_diaries/create_automatic",
    "/exchange-rates": "/exchange_currency",
    "/complaints-book": "/complaint",
    "/payments": "/cuenta/payment_index",
    "/sire/sales": "/sire/sale",
    "/sire/purchases": "/sire/purchase",
    "/sire/annexes": "/sire/appendix",
    "/origin-addresses": "/origin_addresses",
    "/dispatches-carrier": "/dispatch_carrier",
    "/delivery-orders": "/order-delivery",
    "/reports/kardex-average-cost": "/reports/kardexaverage",
    "/reports/kardex-valorized": "/reports/valued-kardex",
    "/reports/historical-stock": "/reports/stock_date",
    "/reports": "/list-reports",
    "/backup": "/list-settings",
    "/lines": "/line-attributes",
    "/ingredients": "/ingredient-attributes",
    "/item-lots": "/item-lots-group",
    "/finances/to-collect": "/finances/unpaid",
    "/establishments": "/users",
}

# Rutas que mantienen componente React funcional (API local). El resto = HTML clonado.
FUNCTIONAL_ROUTES = {
    "/dashboard",
    "/login",
    "/documents",
    "/documents/create",
    "/documents/",
    "/pos",
    "/persons/customers",
    "/items",
}

def merge_paths(*lists: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for lst in lists:
        for p in lst:
            p = p.rstrip("/") or "/"
            if p not in seen and not p.startswith("#"):
                seen.add(p)
                out.append(p)
    return sorted(out)

def all_source_paths() -> list[str]:
    """Rutas a descargar del servidor origen (sin alias)."""
    return merge_paths(STATIC_ENDPOINTS, EXTRA_ENDPOINTS)

def all_clone_paths() -> list[str]:
    """Rutas que servira nuestro clon (menu + alias inverso)."""
    paths = merge_paths(STATIC_ENDPOINTS, EXTRA_ENDPOINTS, list(PATH_ALIASES.keys()))
    return paths

def resolve_source_path(clone_path: str) -> str:
    return PATH_ALIASES.get(clone_path, clone_path)

def build_reverse_aliases() -> dict[str, str]:
    rev: dict[str, str] = {}
    for clone_path, source in PATH_ALIASES.items():
        rev[source] = clone_path
    return rev
