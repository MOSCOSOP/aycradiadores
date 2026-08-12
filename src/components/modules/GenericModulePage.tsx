"use client";

import { usePathname } from "next/navigation";
import { MassDocumentEmission } from "@/components/documents/MassDocumentEmission";
import { RegularizeShippingList } from "@/components/documents/RegularizeShippingList";
import { SuppliersList } from "@/components/suppliers/SuppliersList";
import { ReportView } from "@/components/reports/ReportView";
import { InventoryReportPage } from "@/components/reports/InventoryReportPage";
import { KardexReportPage } from "@/components/reports/KardexReportPage";
import { InventoryMarginReportPage } from "@/components/reports/InventoryMarginReportPage";
import { ClonedModulePage } from "@/components/modules/ClonedModulePage";
import { SettingsHub } from "@/components/settings/SettingsHub";
import { SettingDetailPage } from "@/components/settings/SettingDetailPage";
import { CompanySettingsPage } from "@/components/settings/CompanySettingsPage";
import { BackupPage } from "@/components/settings/BackupPage";
import {
  AccountingChartList,
  AccountingDailyList,
  AccountingEntriesList,
  DispatchesList,
  DocumentsNotSentList,
  FinancesIncomeList,
  FinancesToCollectList,
  FinancesToPayList,
  OrderNotesList,
  ReportsHub,
  ServicesList,
  SireAnnexesList,
  SirePurchasesList,
  SireSalesList,
} from "@/components/modules/AdvancedModules";
import {
  CashList,
  CategoriesList,
  EstablishmentsList,
  ExchangeRatesList,
  FinancesMovementsList,
  InventoryList,
  InventoryValidateList,
  PurchasesList,
  QuotationsList,
  SaleNotesList,
  UsersList,
} from "@/components/modules/ModuleLists";
import { CatalogListPage } from "@/components/modules/CatalogListPage";
import { findReportByHref } from "@/lib/reports-catalog";

const ItemSetsList = () => (
  <CatalogListPage pathname="/item-sets" apiPath="item-sets/records" title="Packs y promociones" />
);
const PersonTypesList = () => (
  <CatalogListPage pathname="/person-types" apiPath="person-types/records" title="Tipos de clientes" labelField="description" />
);
const ZonesList = () => (
  <CatalogListPage pathname="/zones" apiPath="zones/records" title="Lista de zonas" />
);

const catalog = (pathname: string, title: string, labelField?: "name" | "description") => () => (
  <CatalogListPage pathname={pathname} apiPath={`${pathname.replace(/^\//, "")}/records`} title={title} labelField={labelField} />
);

const MODULE_ROUTES: Record<string, React.ComponentType> = {
  "/documents/massive": MassDocumentEmission,
  "/documents/regularize-shipping": RegularizeShippingList,
  "/list-reports": ReportsHub,
  "/list-settings": SettingsHub,
  "/backup": BackupPage,
  "/persons/suppliers": SuppliersList,
  "/purchases": PurchasesList,
  "/sale-notes": SaleNotesList,
  "/quotations": QuotationsList,
  "/categories": CategoriesList,
  "/item-sets": ItemSetsList,
  "/person-types": PersonTypesList,
  "/zones": ZonesList,
  "/inventory": InventoryList,
  "/inventory/validate": InventoryValidateList,
  "/cash": CashList,
  "/users": UsersList,
  "/establishments": EstablishmentsList,
  "/exchange-rates": ExchangeRatesList,
  "/finances/movements": FinancesMovementsList,
  "/finances/to-pay": FinancesToPayList,
  "/finances/to-collect": FinancesToCollectList,
  "/finances/income": FinancesIncomeList,
  "/documents/not-sent": DocumentsNotSentList,
  "/services": ServicesList,
  "/dispatches": DispatchesList,
  "/order-notes": OrderNotesList,
  "/sire/sales": SireSalesList,
  "/sire/purchases": SirePurchasesList,
  "/sire/annexes": SireAnnexesList,
  "/accounting/chart": AccountingChartList,
  "/accounting/daily": AccountingDailyList,
  "/accounting/entries": AccountingEntriesList,
  "/accounting/books": AccountingDailyList,
  "/accounting/books-excel": AccountingDailyList,
  "/inventory-references": catalog("/inventory-references", "Referencias de inventario"),
  "/transfers": catalog("/transfers", "Traslados"),
  "/devolutions": catalog("/devolutions", "Devoluciones"),
  "/brands": catalog("/brands", "Marcas"),
  "/cupones": catalog("/cupones", "Cupones"),
  "/ingredients": catalog("/ingredients", "Ingredientes"),
  "/lines": catalog("/lines", "Líneas"),
  "/series": catalog("/series", "Series"),
  "/item-lots": catalog("/item-lots", "Lotes"),
  "/price-adjustments": catalog("/price-adjustments", "Ajustes de precio"),
  "/discount-types": catalog("/discount-types", "Tipos de descuentos"),
  "/transports": catalog("/transports", "Transportistas"),
  "/drivers": catalog("/drivers", "Conductores"),
  "/vehicles": catalog("/vehicles", "Vehículos"),
  "/origin-addresses": catalog("/origin-addresses", "Direcciones de partida"),
  "/dispatches-carrier": catalog("/dispatches-carrier", "G.R. Transportista"),
  "/voided": catalog("/voided", "Anulaciones"),
  "/summaries": catalog("/summaries", "Resúmenes"),
  "/contingencies": catalog("/contingencies", "Comprobantes contingencia"),
  "/technical-services": catalog("/technical-services", "Servicio soporte técnico"),
  "/documents-recurrence": catalog("/documents-recurrence", "Comprobantes recurrentes"),
  "/expenses": catalog("/expenses", "Gastos diversos"),
  "/purchase-orders": catalog("/purchase-orders", "Órdenes de compra"),
  "/purchase-quotations": catalog("/purchase-quotations", "Cotizaciones de compra"),
  "/purchase-settlements": catalog("/purchase-settlements", "Liquidación de compra"),
  "/payroll": catalog("/payroll", "Planilla"),
  "/retentions": catalog("/retentions", "Retenciones"),
  "/perceptions": catalog("/perceptions", "Percepciones"),
  "/order-forms": catalog("/order-forms", "Órdenes de pedido"),
  "/delivery-orders": catalog("/delivery-orders", "Órdenes de entrega"),
  "/complaints-book": catalog("/complaints-book", "Libro de reclamaciones"),
  "/fixed-asset/items": catalog("/fixed-asset/items", "Activos fijos — ítems"),
  "/fixed-asset/purchases": catalog("/fixed-asset/purchases", "Activos fijos — compras"),
};

const DEFAULT_REPORT_COLUMNS = [
  { key: "date", label: "Fecha" },
  { key: "description", label: "Descripción" },
  { key: "reference", label: "Referencia" },
  { key: "amount", label: "Monto" },
];

const REPORT_COLUMN_OVERRIDES: Record<string, { key: string; label: string }[]> = {
  "/reports/kardex": [
    { key: "date", label: "Fecha" }, { key: "item", label: "Producto" },
    { key: "type", label: "Tipo" }, { key: "quantity", label: "Cantidad" }, { key: "reference", label: "Referencia" },
  ],
  "/reports/inventory": [
    { key: "item", label: "Producto" }, { key: "warehouse", label: "Almacén" },
    { key: "stock", label: "Stock" }, { key: "date", label: "Actualizado" },
  ],
  "/reports/inventory-margin": [
    { key: "description", label: "Producto" }, { key: "category", label: "Categoría" },
    { key: "stock", label: "Stock" }, { key: "sale_unit_price", label: "P. Venta" },
    { key: "purchase_price", label: "P. Compra" }, { key: "margin", label: "Margen" },
  ],
  "/reports/sales-summary": [
    { key: "number", label: "Número" }, { key: "customer_name", label: "Cliente" },
    { key: "date_of_issue", label: "Fecha" }, { key: "total", label: "Total" }, { key: "state_type_description", label: "Estado" },
  ],
  "/reports/documents": [
    { key: "number", label: "Número" }, { key: "document_type_description", label: "Tipo" },
    { key: "customer_name", label: "Cliente" }, { key: "date_of_issue", label: "Fecha" },
    { key: "total_taxed", label: "Gravado" }, { key: "total_igv", label: "IGV" }, { key: "total", label: "Total" },
  ],
  "/reports/customers": [
    { key: "number", label: "Documento" }, { key: "name", label: "Cliente" },
    { key: "telephone", label: "Teléfono" }, { key: "email", label: "Email" },
  ],
  "/reports/purchases-total": [
    { key: "number", label: "Número" }, { key: "supplier_name", label: "Proveedor" },
    { key: "date_of_issue", label: "Fecha" }, { key: "total", label: "Total" }, { key: "payment_status", label: "Pago" },
  ],
  "/reports/stock-minimum": [
    { key: "internal_id", label: "Código" }, { key: "description", label: "Producto" },
    { key: "stock", label: "Stock" }, { key: "stock_min", label: "Stock mín." },
  ],
  "/reports/products-services": [
    { key: "internal_id", label: "Código" }, { key: "description", label: "Producto" },
    { key: "stock", label: "Stock" }, { key: "sale_unit_price", label: "Precio" },
  ],
};

/** React funcional primero; iframe HTML solo si la pagina no es Vue SPA. */
export function GenericModulePage() {
  const pathname = usePathname();

  const Module = MODULE_ROUTES[pathname];
  if (Module) return <Module />;

  if (pathname.startsWith("/settings/")) {
    if (pathname === "/settings/company") return <CompanySettingsPage />;
    const key = pathname.replace("/settings/", "");
    const title = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return <SettingDetailPage title={title} settingKey={key} />;
  }

  const reportMeta = findReportByHref(pathname);
  if (reportMeta?.reportPath) {
    if (pathname === "/reports/inventory") {
      return <InventoryReportPage />;
    }
    if (pathname === "/reports/kardex") {
      return <KardexReportPage />;
    }
    if (pathname === "/reports/inventory-margin") {
      return <InventoryMarginReportPage />;
    }
    if (pathname === "/reports/historical-stock") {
      return (
        <InventoryMarginReportPage
          title="Stock histórico"
          reportPath="reports/historical-stock"
          showSold={false}
        />
      );
    }
    return (
      <ReportView
        title={reportMeta.label}
        reportPath={reportMeta.reportPath}
        columns={REPORT_COLUMN_OVERRIDES[pathname] ?? DEFAULT_REPORT_COLUMNS}
      />
    );
  }

  return <ClonedModulePage pathname={pathname} />;
}
