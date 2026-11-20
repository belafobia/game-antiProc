import { useCallback, useEffect, useState } from "react";

// Roteamento mínimo pelo "#" da URL (ex.: /#/tarefas). Sem biblioteca, e o
// botão "voltar" do navegador/celular funciona. Com o "#", a Vercel não
// precisa de configuração extra: o servidor sempre entrega o mesmo index.html.

export const PAGES = ["semana", "tarefas", "metas", "recompensas", "vales"] as const;
export type Page = (typeof PAGES)[number];

function readHash(): Page {
  const value = window.location.hash.replace(/^#\/?/, "");
  return (PAGES as readonly string[]).includes(value) ? (value as Page) : "semana";
}

export function useHashPage(): [Page, (page: Page) => void] {
  const [page, setPage] = useState(readHash);

  useEffect(() => {
    const onChange = () => setPage(readHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    window.location.hash = `/${next}`;
  }, []);

  return [page, navigate];
}
