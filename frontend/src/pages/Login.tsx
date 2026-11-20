import { useEffect, useState, type FormEvent } from "react";

import { ApiError, api } from "../api";
import { LogoMark } from "../components/icons";
import type { TokenOut } from "../types";

// Depois disso sem resposta, avisamos que o servidor pode estar "acordando"
// (o plano grátis do Render desliga a API depois de um tempo parada).
const SLOW_AFTER_MS = 4000;

type Props = { onLogin: (token: string) => void };

export function Login({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [loading]);

  async function handleSubmit(event: FormEvent) {
    // Sem isto, o navegador recarregaria a página ao enviar o formulário.
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await api<TokenOut>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(access_token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado");
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="brand">
          <LogoMark className="brand-mark" />
          <span>
            <span className="syntax">anti</span>Proc
          </span>
        </div>

        <div>
          <h1 style={{ fontSize: 20 }}>Entrar</h1>
          <p className="hint">Acompanhe sua semana, suas metas e suas recompensas.</p>
        </div>

        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="button"
          type="submit"
          disabled={loading || !email || !password}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>

        {slow && (
          <p className="hint" role="status">
            O servidor está acordando, pode levar até um minuto na primeira vez.
          </p>
        )}
      </form>
    </main>
  );
}
