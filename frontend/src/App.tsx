import { useCallback, useEffect, useState } from "react";

import { AUTH_EXPIRED_EVENT, auth } from "./api";
import { Layout } from "./components/Layout";
import { LoadError } from "./components/PageState";
import { useResource } from "./hooks/useResource";
import { useHashPage } from "./lib/router";
import { Login } from "./pages/Login";
import { RewardsPage } from "./pages/Rewards";
import { TasksPage } from "./pages/Tasks";
import { WeekPage } from "./pages/Week";
import type { Me } from "./types";

// Portão de autenticação: com token, o app; sem token, o login.
export default function App() {
  const [token, setToken] = useState(auth.get);

  // O api.ts avisa quando a API recusa o token (401): volta para o login.
  useEffect(() => {
    const onExpired = () => setToken(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const handleLogin = useCallback((newToken: string) => {
    auth.set(newToken);
    setToken(newToken);
  }, []);

  const handleLogout = useCallback(() => {
    auth.clear();
    setToken(null);
  }, []);

  return token ? <Shell onLogout={handleLogout} /> : <Login onLogin={handleLogin} />;
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const { data: me, error, reload } = useResource<Me>("/me");
  const [page, navigate] = useHashPage();

  if (error) {
    return (
      <main className="center">
        <LoadError message={error} onRetry={reload} />
      </main>
    );
  }
  if (!me) {
    return (
      <main className="center" role="status">
        <div>
          <div className="spinner" />
          <p className="hint">Carregando…</p>
        </div>
      </main>
    );
  }

  return (
    <Layout me={me} page={page} onNavigate={navigate} onLogout={onLogout}>
      {page === "semana" && <WeekPage onNavigate={navigate} />}
      {page === "tarefas" && <TasksPage />}
      {page === "recompensas" && <RewardsPage />}
    </Layout>
  );
}
