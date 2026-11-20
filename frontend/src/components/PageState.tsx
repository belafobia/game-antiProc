// Estados comuns das telas: carregando e erro com "tentar de novo".

export function Loading() {
  return (
    <div className="page-state" role="status">
      <div className="spinner" />
      <p className="hint">Carregando…</p>
    </div>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="page-state">
      <div className="alert" role="alert">
        {message}
      </div>
      <button className="button" onClick={onRetry}>
        Tentar de novo
      </button>
    </div>
  );
}
