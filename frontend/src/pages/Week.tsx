import { useEffect, useRef, useState, type CSSProperties } from "react";

import { api, errorMessage } from "../api";
import { Dialog } from "../components/Dialog";
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "../components/icons";
import { LoadError, Loading } from "../components/PageState";
import { useResource } from "../hooks/useResource";
import { addDays, formatDayMonth, formatRange, todayISO, weekdayIndex } from "../lib/dates";
import { PERIOD_LABEL, TIERS, WEEKDAYS, WEEK_GOAL_PERCENT } from "../lib/labels";
import type { Page } from "../lib/router";
import type { Completion, Occurrence, Week, WeekClose } from "../types";

// Atualiza um check na semana já carregada e recalcula os totais, sem
// buscar a semana inteira de novo a cada toque.
function withCheck(week: Week, day: string, taskId: string, completionId: string | null): Week {
  const days = week.days.map((d) =>
    d.day !== day
      ? d
      : {
          ...d,
          items: d.items.map((item) =>
            item.task_id !== taskId
              ? item
              : { ...item, completion_id: completionId, done: completionId !== null },
          ),
        },
  );
  const done = days.reduce((n, d) => n + d.items.filter((i) => i.done).length, 0);
  return {
    ...week,
    days,
    done,
    // Mesma regra do backend: arredonda para baixo; a semana vale a partir de
    // WEEK_GOAL_PERCENT (conta só com inteiros); semana vazia não vale.
    percent: week.total ? Math.floor((done * 100) / week.total) : 0,
    complete: week.total > 0 && done * 100 >= WEEK_GOAL_PERCENT * week.total,
  };
}

export function WeekPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const today = todayISO();
  // Qualquer dia da semana exibida; a API devolve a semana (seg–dom) que o contém.
  const [day, setDay] = useState(today);
  const { data: week, setData, error, loading, reload } = useResource<Week>(`/weeks/${day}`);
  // Checks em andamento: evita duplo toque mandando duas requisições.
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<WeekClose | null>(null);

  const isCurrentWeek = week !== null && week.start <= today && today <= week.end;

  // No celular, os dias ficam um embaixo do outro: rola até hoje ao abrir.
  const scrolled = useRef(false);
  useEffect(() => {
    if (!week || scrolled.current || window.innerWidth >= 768) return;
    scrolled.current = true;
    if (weekdayIndex(today) > 0) {
      document.getElementById(`day-${today}`)?.scrollIntoView({ block: "start" });
    }
  }, [week, today]);

  async function toggle(dayValue: string, item: Occurrence) {
    const key = `${item.task_id}:${dayValue}`;
    if (pending.has(key)) return;
    setPending((p) => new Set(p).add(key));
    setActionError(null);
    try {
      if (item.completion_id) {
        await api(`/completions/${item.completion_id}`, { method: "DELETE" });
        setData((w) => w && withCheck(w, dayValue, item.task_id, null));
      } else {
        const completion = await api<Completion>(`/tasks/${item.task_id}/complete`, {
          method: "POST",
          body: JSON.stringify({ day: dayValue }),
        });
        setData((w) => w && withCheck(w, dayValue, item.task_id, completion.id));
      }
    } catch (err) {
      setActionError(errorMessage(err));
      reload();
    } finally {
      setPending((p) => {
        const next = new Set(p);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleClose() {
    if (!week) return;
    setClosing(true);
    try {
      const result = await api<WeekClose>(`/weeks/${week.start}/close`, { method: "POST" });
      setConfirmClose(false);
      setCloseResult(result);
      reload();
    } catch (err) {
      setConfirmClose(false);
      setActionError(errorMessage(err));
    } finally {
      setClosing(false);
    }
  }

  if (error && !week) return <LoadError message={error} onRetry={reload} />;
  if (!week) return <Loading />;

  const canClose = !week.closed && today >= week.end;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Semana</h1>
          <p className="hint">{formatRange(week.start, week.end)}</p>
        </div>
        <div className="week-nav">
          {!isCurrentWeek && (
            <button className="button button-ghost" onClick={() => setDay(today)}>
              Hoje
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Semana anterior"
            onClick={() => setDay(addDays(week.start, -7))}
          >
            <ChevronLeftIcon />
          </button>
          <button
            className="icon-button"
            aria-label="Próxima semana"
            onClick={() => setDay(addDays(week.start, 7))}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </header>

      <section className={`week-summary${loading ? " is-loading" : ""}`}>
        <div className="progress-label">
          <span>
            <strong>{week.done}</strong> de {week.total} feitas
          </span>
          <span className="progress-percent">
            {week.percent}% <span className="hint">(meta: {WEEK_GOAL_PERCENT}%)</span>
          </span>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={week.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da semana"
        >
          <div
            className={`progress-bar${week.complete ? " is-complete" : ""}`}
            style={{ width: `${week.percent}%` }}
          />
        </div>

        {week.closed ? (
          <p className={`status ${week.complete ? "status-ok" : "status-muted"}`}>
            {week.complete
              ? "Semana fechada e meta batida: vale básico garantido."
              : `Semana fechada sem chegar a ${WEEK_GOAL_PERCENT}%. Sem vale desta vez.`}
          </p>
        ) : canClose ? (
          <div className="close-row">
            <p className="hint">
              {today === week.end
                ? "Domingo: hora de fechar a semana."
                : "Esta semana já acabou e ainda não foi fechada."}
            </p>
            <button className="button" onClick={() => setConfirmClose(true)}>
              Fechar semana
            </button>
          </div>
        ) : null}
      </section>

      {actionError && (
        <div className="alert alert-dismissable" role="alert">
          <span>{actionError}</span>
          <button className="link-button" onClick={() => setActionError(null)}>
            OK
          </button>
        </div>
      )}

      {week.total === 0 && !week.closed ? (
        <div className="empty">
          <p>Nada planejado para esta semana.</p>
          <p className="hint">Cadastre as tarefas da sua rotina e os dias de cada uma.</p>
          <button className="button" onClick={() => onNavigate("tarefas")}>
            Cadastrar tarefas
          </button>
        </div>
      ) : (
        <div className={`days${loading ? " is-loading" : ""}`}>
          {week.days.map((d) => {
            const isToday = d.day === today;
            const isFuture = d.day > today;
            const doneCount = d.items.filter((i) => i.done).length;
            return (
              <section
                key={d.day}
                id={`day-${d.day}`}
                className={`day${isToday ? " is-today" : ""}`}
              >
                <header className="day-header">
                  <h2>
                    {WEEKDAYS[weekdayIndex(d.day)].long}
                    <span className="day-date">{formatDayMonth(d.day)}</span>
                  </h2>
                  {isToday && <span className="tag">hoje</span>}
                  {d.items.length > 0 && (
                    <span className="day-count">
                      {doneCount}/{d.items.length}
                    </span>
                  )}
                </header>

                {d.items.length === 0 ? (
                  <p className="hint">Nada planejado.</p>
                ) : (
                  <ul className="checks">
                    {d.items.map((item) => {
                      const key = `${item.task_id}:${d.day}`;
                      return (
                        <li key={key}>
                          <button
                            className="check"
                            role="checkbox"
                            aria-checked={item.done}
                            disabled={week.closed || isFuture || pending.has(key)}
                            title={isFuture ? "Esse dia ainda não chegou" : undefined}
                            onClick={() => toggle(d.day, item)}
                          >
                            <span className="check-box">{item.done && <CheckIcon />}</span>
                            <span className="check-label">
                              {item.task_name}
                              {item.category && (
                                <span className="check-category">{item.category}</span>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <Dialog open={confirmClose} title="Fechar a semana?" onClose={() => setConfirmClose(false)}>
        <div className="form">
          <p>
            Você fez <strong>{week.done}</strong> de {week.total} tarefas (
            {week.percent}%).{" "}
            {week.complete
              ? `Passou de ${WEEK_GOAL_PERCENT}%: fechando agora você ganha o vale básico.`
              : `A semana não chegou a ${WEEK_GOAL_PERCENT}%, então não vai dar vale.`}
          </p>
          <p className="hint">
            Depois de fechada, a semana não aceita mais checks nem desfazer. O resultado fica
            guardado e conta para o mês, o semestre e o ano.
          </p>
          <div className="form-actions">
            <button className="button button-ghost" onClick={() => setConfirmClose(false)}>
              Cancelar
            </button>
            <button className="button" disabled={closing} onClick={handleClose}>
              {closing ? "Fechando…" : "Fechar semana"}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={closeResult !== null}
        title={closeResult?.complete ? "Meta da semana batida!" : "Semana fechada"}
        onClose={() => setCloseResult(null)}
      >
        {closeResult && (
          <div className="form">
            {closeResult.grants.length > 0 ? (
              <>
                <p>Você ganhou:</p>
                <ul className="grants">
                  {closeResult.grants.map((g) => (
                    <li
                      key={g.id}
                      className="grant"
                      style={{ "--tier-color": TIERS[g.tier].color } as CSSProperties}
                    >
                      <span className="grant-title">Vale {TIERS[g.tier].label.toLowerCase()}</span>
                      <span className="hint">
                        {PERIOD_LABEL[g.period]} · {TIERS[g.tier].rule}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Desta vez não deu vale. Semana que vem tem outra chance.</p>
            )}
            <div className="form-actions">
              {closeResult.grants.length > 0 ? (
                <button className="button" onClick={() => onNavigate("vales")}>
                  Ver meus vales
                </button>
              ) : (
                <button className="button" onClick={() => setCloseResult(null)}>
                  OK
                </button>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
