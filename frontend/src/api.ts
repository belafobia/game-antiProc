// Único lugar do front que faz chamadas HTTP: token, URL base e tratamento de
// erro ficam centralizados. Trocar localStorage por cookie, por exemplo,
// mexeria só aqui.

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "token";
export const AUTH_EXPIRED_EVENT = "auth:expired";

// localStorage: simples e sobrevive a fechar o app. A troca: se o site tiver
// uma falha de XSS, um script consegue ler o token. Aceitável para um app de
// poucas pessoas e sem conteúdo de terceiros.
export const auth = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Erro inesperado";
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = auth.get();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    // fetch só lança em falha de rede: API fora do ar, sem internet ou CORS.
    throw new ApiError(0, "Não foi possível falar com o servidor");
  }

  // Token vencido ou inválido: descarta e avisa o App, que volta para o login.
  // Evento em vez de cada tela tratar o 401: a regra fica num lugar só.
  if (response.status === 401) {
    auth.clear();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    // A API manda {"detail": "..."} nos erros de regra (services/errors.py).
    // Nos 422 de validação, detail é uma lista: aí usamos a mensagem genérica.
    const detail = typeof body?.detail === "string" ? body.detail : "Erro inesperado";
    throw new ApiError(response.status, detail);
  }

  // 204 No Content (ex.: desfazer check) não tem corpo para ler.
  return (response.status === 204 ? undefined : await response.json()) as T;
}
