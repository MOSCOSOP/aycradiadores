"use client";

import { findNavLabel } from "@/lib/page-registry";
import { CatalogListPage } from "@/components/modules/CatalogListPage";
import { pathToRecordsApi } from "@/lib/page-registry";

type UniversalListPageProps = {
  pathname: string;
};

/** Fallback para módulos del menú sin pantalla dedicada — CRUD + buscar + exportar. */
export function UniversalListPage({ pathname }: UniversalListPageProps) {
  const title =
    findNavLabel(pathname) || pathname.split("/").pop()?.replace(/-/g, " ") || "Módulo";
  const labelField = pathname === "/person-types" ? "description" : "name";

  return (
    <CatalogListPage
      pathname={pathname}
      apiPath={pathToRecordsApi(pathname)}
      title={title.charAt(0).toUpperCase() + title.slice(1)}
      labelField={labelField as "name" | "description"}
    />
  );
}
