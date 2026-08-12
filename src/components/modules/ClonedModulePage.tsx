"use client";

import { type ReactNode } from "react";
import { UniversalListPage } from "./UniversalListPage";

type ClonedModulePageProps = {
  pathname: string;
  fallback?: ReactNode;
};

/** Siempre usa listado React con CRUD — el shell HTML clonado no permite editar/eliminar. */
export function ClonedModulePage({ pathname, fallback }: ClonedModulePageProps) {
  if (fallback) return <>{fallback}</>;
  return <UniversalListPage pathname={pathname} />;
}
