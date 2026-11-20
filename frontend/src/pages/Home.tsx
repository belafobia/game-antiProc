import { useEffect, useState, type CSSProperties } from "react";

import { ApiError, api } from "../api";
import {
  CalendarIcon,
  GiftIcon,
  HomeIcon,
  LogoMark,
  LogoutIcon,
  TargetIcon,
} from "../components/icons";
import type { Me } from "../types";

type Props = { onLogout: () => void };

// As outras telas ainda não existem: ficam visíveis, desabilitadas, para o
// layout já nascer com a navegação no lugar.
const NAV = [
  { label: "Início", Icon: HomeIcon, ready: true },
  { label: "Semana", Icon: CalendarIcon, ready: false },
  { label: "Metas", Icon: TargetIcon, ready: false },
  { label: "Vales", Icon: GiftIcon, ready: false },
];

const SECTIONS = [
  {
    title: "Semana",
    text: "Os checks de cada dia e quanto da semana já foi feito.",
    color: "var(--syntax-blue)",
  },
  {
    title: "Metas",
    text: "Prazo, categoria e a porcentagem de cada meta.",
    color: "var(--syntax-teal)",
  },
  {
    title: "Vales",
    text: "As recompensas ganhas por semanas, meses e anos completos.",
    color: "var(--syntax-yellow)",
  },
];

export function Home({ onLogout }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Evita atualizar o estado se a tela já tiver sido desmontada (e o
    // efeito duplo do StrictMode em desenvolvimento).
    let active = true;
    api<Me>("/me")
      .then((data) => active && setMe(data))
      .catch((err) => {
        if (!active) return;
        // 401: token vencido. O api.ts já apagou o token; volta para o login.
        if (err instanceof ApiError && err.status === 401) onLogout();
        else setError(err instanceof ApiError ? err.message : "Erro inesperado");
      });
    return () => {
      active = false;
    };
  }, [onLogout]);

  if (error) {
    return (
      <main className="center">
        <div style={{ display: "grid", gap: 16, maxWidth: 320 }}>
          <div className="alert" role="alert">
            {error}
          </div>
          <button className="button" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  if (!me) {
    return (
      <main className="center">
        <div role="status">
          <div className="spinner" />
          <p className="hint">Carregando…</p>
        </div>
      </main>
    );
  }

  const firstName = me.display_name.split(" ")[0];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <LogoMark className="brand-mark" />
          <span>
            <span className="syntax">anti</span>Proc
          </span>
        </div>

        <nav className="nav" aria-label="Principal">
          {NAV.map(({ label, Icon, ready }) => (
            <button
              key={label}
              className="nav-item"
              aria-current={label === "Início" ? "page" : undefined}
              disabled={!ready}
              title={ready ? undefined : "Em breve"}
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
        <div className="brand">
          <LogoMark className="brand-mark" />
          <span>
            <span className="syntax">anti</span>Proc
          </span>
        </div>
        <button className="icon-button" onClick={onLogout} aria-label="Sair">
          <LogoutIcon />
        </button>
      </header>

      <main className="content">
        <section className="greeting">
          <h1>Olá, {firstName}!</h1>
          <p>Por aqui você vai acompanhar sua rotina. As telas estão chegando.</p>
        </section>

        <section className="cards">
          {SECTIONS.map(({ title, text, color }) => (
            <article
              key={title}
              className="card"
              style={{ "--card-color": color } as CSSProperties}
            >
              <h2>{title}</h2>
              <p>{text}</p>
              <span className="tag">em breve</span>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
