"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV_ITEMS, type NavChild, type NavItem } from "@/lib/constants";
import { api } from "@/lib/api/client";
import { useTheme } from "@/components/layout/ThemeProvider";

function NavLink({
  item,
  pathname,
  expanded,
  toggle,
  depth = 0,
  locked,
}: {
  item: NavItem | NavChild;
  pathname: string;
  expanded: Record<string, boolean>;
  toggle: (key: string) => void;
  depth?: number;
  locked: boolean;
}) {
  const hasChildren = "children" in item && item.children && item.children.length > 0;
  const href = "href" in item ? item.href : undefined;
  const icon = "icon" in item ? item.icon : undefined;
  const key = item.label;

  const isActive =
    (href && (pathname === href || pathname.startsWith(href + "/"))) ||
    (hasChildren &&
      item.children!.some(
        (c) =>
          c.href === pathname ||
          pathname.startsWith(c.href + "/") ||
          c.children?.some((gc) => gc.href === pathname)
      ));

  if (hasChildren) {
    const isOpen = locked ? true : (expanded[key] ?? key === "Ventas");
    return (
      <li className={depth === 0 ? "ify-menu-item" : ""}>
        <button
          type="button"
          onClick={() => !locked && toggle(key)}
          className={`ify-menu-link w-full ${isActive ? "active" : ""}`}
          style={{ paddingLeft: depth > 0 ? `${12 + depth * 12}px` : undefined }}
        >
          {icon && depth === 0 && <i className={`bi ${icon}`} />}
          <span className="ify-menu-label">{item.label}</span>
          {!locked && <i className={`bi bi-chevron-${isOpen ? "down" : "right"} ify-menu-chevron`} />}
        </button>
        {isOpen && (
          <ul className="ify-submenu">
            {item.children!.map((child) => (
              <NavLink
                key={child.label}
                item={child}
                pathname={pathname}
                expanded={expanded}
                toggle={toggle}
                depth={depth + 1}
                locked={locked}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href || "#"}
        className={`ify-menu-link ${pathname === href ? "active" : ""}`}
        style={{ paddingLeft: depth > 0 ? `${12 + depth * 12}px` : undefined }}
      >
        {icon && depth === 0 && <i className={`bi ${icon}`} />}
        <span className="ify-menu-label">{item.label}</span>
      </Link>
    </li>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, locked, collapsed, mobileOpen, toggleDark, toggleLock, toggleCollapsed, setMobileOpen } = useTheme();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Ventas: true });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userName, setUserName] = useState("ADMINISTRADOR");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.auth.me().then((r) => {
      if (r.user?.name) setUserName(r.user.name.toUpperCase());
    }).catch(() => {});
  }, []);

  // Cierra el panel móvil al navegar a otra pantalla.
  useEffect(() => {
    setMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      router.push("/login");
    }
  };

  return (
    <>
      {mobileOpen && <button type="button" className="ify-nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={`ify-nav ${mobileOpen ? "ify-nav-mobile-open" : ""}`}>
      <div className="ify-nav-inner">
        <div className="ify-nav-logo">
          <Link href="/dashboard">
            <Image
              src="/images/logo-client.png"
              alt="Logo"
              width={140}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        {/* Usuario arriba — como el original Acorn */}
        <div className="ify-nav-user" ref={menuRef}>
          <button
            type="button"
            className="ify-nav-user-btn"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            <Image
              src="/images/profile.jpg"
              alt="Perfil"
              width={40}
              height={40}
              className="ify-nav-avatar"
            />
            <div className="ify-nav-user-info">
              <span className="ify-nav-user-name">{userName}</span>
              <span className="ify-nav-user-env">
                <i className="bi bi-toggle-on ify-prod-icon" />
                PROD
              </span>
            </div>
            <i className={`bi bi-chevron-${userMenuOpen ? "up" : "down"} text-[var(--muted)] text-xs`} />
          </button>
          {userMenuOpen && (
            <div className="ify-nav-user-menu">
              <Link href="/list-settings" className="ify-nav-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                <i className="bi bi-gear" /> Configuración
              </Link>
              <button type="button" className="ify-nav-user-menu-item text-red-600" onClick={logout}>
                <i className="bi bi-box-arrow-right" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>

        <div className="ify-nav-icons">
          <button
            type="button"
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className="ify-nav-icon-btn ify-nav-collapse-btn"
            onClick={toggleCollapsed}
          >
            <i className={`bi ${collapsed ? "bi-layout-sidebar-inset" : "bi-layout-sidebar-inset-reverse"}`} />
          </button>
          <button
            type="button"
            title={locked ? "Desfijar menú" : "Fijar menú (candado)"}
            className={`ify-nav-icon-btn ${locked ? "active" : ""}`}
            onClick={toggleLock}
          >
            <i className={`bi ${locked ? "bi-lock-fill" : "bi-lock"}`} />
          </button>
          <button
            type="button"
            title={dark ? "Modo claro" : "Modo oscuro"}
            className={`ify-nav-icon-btn ${dark ? "active" : ""}`}
            onClick={toggleDark}
          >
            <i className={`bi ${dark ? "bi-moon-stars-fill" : "bi-sun"}`} />
          </button>
        </div>

        <nav className="ify-nav-menu">
          <ul>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.label}
                item={item}
                pathname={pathname}
                expanded={expanded}
                toggle={toggle}
                locked={locked}
              />
            ))}
          </ul>
        </nav>
      </div>
      </aside>
    </>
  );
}
