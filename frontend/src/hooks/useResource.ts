import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "../api";

// Busca um GET da API e guarda o resultado. Toda tela que lista algo usa isto,
// então "carregando", "erro" e "recarregar" funcionam igual em todo lugar.
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  // Qual requisição já terminou. "Carregando" é derivado disso, em vez de
  // ser um estado ligado/desligado à mão dentro do efeito.
  const key = `${path}#${version}`;
  const [settledKey, setSettledKey] = useState<string | null>(null);

  useEffect(() => {
    // Se o path mudar antes da resposta chegar (ex.: trocar de semana rápido),
    // a resposta antiga é ignorada e não sobrescreve a nova.
    let active = true;
    api<T>(path)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => active && setError(errorMessage(err)))
      .finally(() => active && setSettledKey(key));
    return () => {
      active = false;
    };
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, setData, error, loading: settledKey !== key, reload };
}
