import type { ReactNode } from "react";

import type { Page } from "../lib/router";
import type { Me } from "../types";
import {
  CalendarIcon,
  GiftIcon,
  ListIcon,
  LogoMark,
  LogoutIcon,
  TargetIcon,
  TicketIcon,
} from "./icons";

const NAV: { id: Page; label: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { id: "semana", label: "Semana", Icon: CalendarIcon },
  { id: "tarefas", label: "Tarefas", Icon: ListIcon },
  { id: "metas", label: "Metas", Icon: TargetIcon },
  { id: "recompensas", label: "Recompensas", Icon: GiftIcon },
  { id: "vales", label: "Vales", Icon: TicketIcon },
];

export function Brand() {
  return (
    <div className="brand">
      <LogoMark className="brand-mark" />
      <span>
        <span className="syntax">anti</span>Proc
      </span>
    </div>
  );
}

type Props = {
  me: Me;
  page: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  children: ReactNode;
};

export function Layout({ me, page, onNavigate, onLogout, children }: Props) {
  return (
    <div className="app">
      {/* Celular: barra fixa embaixo. Tablet/PC: barra lateral (ver index.css). */}
      <aside className="sidebar">
        <Brand />

        <nav className="nav" aria-label="Principal">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={label}
              className="nav-item"
              aria-current={id === page ? "page" : undefined}
              onClick={() => onNavigate(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="hint" title={me.email}>
            {me.display_name}
          </p>
          <button className="button button-ghost" onClick={onLogout}>
            <LogoutIcon />
            Sair
          </button>
        </div>
      </aside>

      {/* Só no celular: no tablet/PC o nome e o "Sair" ficam na barra lateral. */}
      <header className="topbar">
        <Brand />
        <button className="icon-button" onClick={onLogout} aria-label="Sair">
          <LogoutIcon />
        </button>
      </header>

      <main className="content">{children}</main>
    </div>
  );
}
