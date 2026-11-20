import { useMemo, useState, type FormEvent } from "react";

import { api, errorMessage } from "../api";
import { Dialog } from "../components/Dialog";
import { PlusIcon } from "../components/icons";
import { LoadError, Loading } from "../components/PageState";
import { useResource } from "../hooks/useResource";
import { formatDayMonth, todayISO } from "../lib/dates";
import { WEEKDAYS } from "../lib/labels";
import type { Task } from "../types";

const PRESETS = [
  { label: "Todos os dias", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Seg a Sex", days: [0, 1, 2, 3, 4] },
  { label: "Fim de semana", days: [5, 6] },
];

export function TasksPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: tasks, error, loading, reload } = useResource<Task[]>(
    `/tasks${showArchived ? "?include_archived=true" : ""}`,
  );
  // null = fechado; "new" = criando; Task = editando
  const [editing, setEditing] = useState<Task | "new" | null>(null);

  // Categorias já usadas viram sugestões no campo (datalist).
  const categories = useMemo(
    () => [...new Set((tasks ?? []).map((t) => t.category).filter(Boolean))] as string[],
    [tasks],
  );

  const sorted = useMemo(
    () => [...(tasks ?? [])].sort((a, b) => Number(b.active) - Number(a.active)),
    [tasks],
  );

  function handleSaved() {
    setEditing(null);
    reload();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tarefas</h1>
          <p className="hint">A sua semana-modelo: o que você faz e em quais dias.</p>
        </div>
        <button className="button" onClick={() => setEditing("new")}>
          <PlusIcon />
          Nova tarefa
        </button>
      </header>

      <label className="toggle">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
        />
        Mostrar arquivadas
      </label>

      {error && !tasks ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !tasks ? (
        <Loading />
      ) : sorted.length === 0 ? (
        <div className="empty">
          <p>Nenhuma tarefa ainda.</p>
          <p className="hint">
            Comece pela rotina de uma semana comum: cuidar das gatas, Jiu Jitsu, leitura…
          </p>
        </div>
      ) : (
        <ul className="list">
          {sorted.map((task) => (
            <li key={task.id}>
              <button
                className={`row${task.active ? "" : " row-muted"}`}
                onClick={() => setEditing(task)}
              >
                <div className="row-main">
                  <span className="row-title">{task.name}</span>
                  <span className="row-meta">
                    {task.category && <span className="tag">{task.category}</span>}
                    {!task.active && <span className="tag tag-muted">arquivada</span>}
                    {task.starts_on > todayISO() && (
                      <span className="hint">começa em {formatDayMonth(task.starts_on)}</span>
                    )}
                  </span>
                </div>
                <WeekdayDots days={task.weekdays} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <datalist id="task-categories">
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Dialog
        open={editing !== null}
        title={editing === "new" ? "Nova tarefa" : "Editar tarefa"}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <TaskForm task={editing === "new" ? null : editing} onSaved={handleSaved} />
        )}
      </Dialog>
    </>
  );
}

function WeekdayDots({ days }: { days: number[] }) {
  return (
    <span className="weekday-dots" aria-label={days.map((d) => WEEKDAYS[d].long).join(", ")}>
      {WEEKDAYS.map((w, i) => (
        <span key={w.short} className={days.includes(i) ? "on" : undefined} aria-hidden>
          {w.short[0]}
        </span>
      ))}
    </span>
  );
}

function TaskForm({ task, onSaved }: { task: Task | null; onSaved: () => void }) {
  const [name, setName] = useState(task?.name ?? "");
  const [category, setCategory] = useState(task?.category ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(task?.weekdays ?? []);
  const [startsOn, setStartsOn] = useState(task?.starts_on ?? todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(day: number) {
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  async function send(path: string, method: string, body: object) {
    setSaving(true);
    setError(null);
    try {
      await api(path, { method, body: JSON.stringify(body) });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = {
      name: name.trim(),
      category: category.trim() || null,
      weekdays,
      starts_on: startsOn,
    };
    if (task) send(`/tasks/${task.id}`, "PATCH", body);
    else send("/tasks", "POST", body);
  }

  const valid = name.trim() !== "" && weekdays.length > 0 && startsOn !== "";

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="field">
        <label htmlFor="task-name">Nome</label>
        <input
          id="task-name"
          className="input"
          maxLength={100}
          autoFocus={!task}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Cuidar das gatas"
        />
      </div>

      <div className="field">
        <label htmlFor="task-category">Categoria (opcional)</label>
        <input
          id="task-category"
          className="input"
          maxLength={50}
          list="task-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Ex.: Casa, Treino, Estudo"
        />
      </div>

      <fieldset className="field">
        <legend>Dias da semana</legend>
        <div className="day-picker">
          {WEEKDAYS.map((w, i) => (
            <button
              key={w.short}
              type="button"
              className="day-toggle"
              aria-pressed={weekdays.includes(i)}
              aria-label={w.long}
              onClick={() => toggleDay(i)}
            >
              {w.short}
            </button>
          ))}
        </div>
        <div className="chips">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              onClick={() => setWeekdays(p.days)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="task-start">Começa a contar em</label>
        <input
          id="task-start"
          className="input"
          type="date"
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
        <p className="hint">
          Planejando no domingo a semana seguinte? Escolha a segunda-feira, assim a tarefa não
          conta no domingo de hoje.
        </p>
      </div>

      <div className="form-actions">
        {task && (
          <button
            type="button"
            className="button button-ghost"
            disabled={saving}
            onClick={() => send(`/tasks/${task.id}`, "PATCH", { active: !task.active })}
          >
            {task.active ? "Arquivar" : "Reativar"}
          </button>
        )}
        <button className="button" type="submit" disabled={!valid || saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
