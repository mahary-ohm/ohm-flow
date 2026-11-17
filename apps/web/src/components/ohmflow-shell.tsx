"use client";

import type { ReactNode } from "react";
import { Bell, ChevronDown, CircleHelp, LogOut, Menu, X } from "lucide-react";
import type { View, User } from "./ohmflow-types";
import { Brand, initials, roleNames } from "./ohmflow-ui";
import type { LucideIcon } from "lucide-react";

type NavigationItem = {
  id: View;
  label: string;
  icon: LucideIcon;
  section: string;
  count?: number;
};

type AppShellProps = {
  user: User;
  userName: string;
  nav: NavigationItem[];
  view: View;
  detail: unknown;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  logout: () => void | Promise<void>;
  heading: string;
  navClick: (view: View) => void;
  children: ReactNode;
};

export function AppShell({
  user,
  userName,
  nav,
  view,
  detail,
  mobileNav,
  setMobileNav,
  logout,
  heading,
  navClick,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Brand />
        <div className="nav-label">ESPACE</div>
        {nav
          .filter((item) => item.section === "ESPACE")
          .map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id && !detail ? "active" : ""}`}
              onClick={() => navClick(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
              {item.count ? <span className="nav-count">{item.count}</span> : null}
            </button>
          ))}
        {nav
          .filter((item) => item.section !== "ESPACE")
          .map((item, index, list) => (
            <div key={item.id}>
              {(index === 0 || item.section !== list[index - 1]?.section) && (
                <div className="nav-label" style={{ marginTop: 17 }}>
                  {item.section}
                </div>
              )}
              <button
                className={`nav-item ${view === item.id && !detail ? "active" : ""}`}
                onClick={() => navClick(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.count ? <span className="nav-count">{item.count}</span> : null}
              </button>
            </div>
          ))}
        <div className="sidebar-bottom">
          <div className="profile-small">
            <div className="avatar">{initials(user)}</div>
            <div>
              <div className="profile-name">{userName}</div>
              <div className="profile-role">{roleNames[user.role]}</div>
            </div>
            <button
              className="table-link"
              title="Mon profil"
              onClick={() => navClick("profile")}
            >
              <ChevronDown size={15} />
            </button>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="top-icon mobile-menu"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X /> : <Menu />}
            </button>
            <div className="crumb">
              OhmFlow&nbsp; / &nbsp;<strong>{heading}</strong>
            </div>
          </div>
          <div className="top-actions">
            <span className="top-icon" aria-label="Aide" title="Aide OhmFlow">
              <CircleHelp />
            </span>
            <span
              className="top-icon"
              aria-label="Notifications"
              title="Aucune nouvelle notification"
            >
              <Bell />
            </span>
            <div className="avatar" title={userName}>
              {initials(user)}
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
