import { useEffect, useRef, type ReactNode } from "react";

import { CloseIcon } from "./icons";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// <dialog> nativo com showModal(): o navegador já cuida de prender o foco
// dentro da janela, fechar no Esc e deixar o resto da página inerte.
// No celular vira um painel que sobe de baixo (ver .dialog no CSS).
export function Dialog({ open, title, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-label={title}
      onClose={onClose}
      // Clique no fundo escuro (fora do conteúdo) fecha.
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="dialog-body">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar">
            <CloseIcon />
          </button>
        </div>
        {/* Só monta o conteúdo aberto: cada abertura começa com o formulário limpo. */}
        {open && children}
      </div>
    </dialog>
  );
}
