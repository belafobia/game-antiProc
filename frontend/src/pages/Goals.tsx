import { useState, type CSSProperties, type FormEvent } from "react";

import { api, errorMessage } from "../api";
import { Dialog } from "../components/Dialog";
import { CheckIcon, CloseIcon, PlusIcon } from "../components/icons";
import { LoadError, Loading } from "../components/PageState";
import { useResource } from "../hooks/useResource";
import { formatFullDate, formatMonthYear, timeLeft, todayISO } from "../lib/dates";
import {
  CATEGORIES,
  CATEGORY_ORDER,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  GOAL_TIER,
  TIERS,
} from "../lib/labels";
import type { Page } from "../lib/router";
import type {
  Difficulty,
  Goal,
  GoalCategory,
  GoalChange,
  GoalDetail,
  Grant,
  Subtask,
} from "../types";

type Open = { mode: "new" } | { mode: "view"; goalId: string } | null;

export function GoalsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const { data: goals, error, loading, reload } = useResource<Goal[]>(
    `/goals${showArchived ? "?include_archived=true" : ""}`,
  );
  const [open, setOpen] = useState<Open>(null);
  const today = todayISO();

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Metas</h1>
          <p className="hint">Objetivos com prazo. Cada passo concluído faz a porcentagem subir.</p>
        </div>
        <button className="button" onClick={() => setOpen({ mode: "new" })}>
          <PlusIcon />
          Nova meta
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

      {error && !goals ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !goals ? (
        <Loading />
      ) : goals && goals.length === 0 ? (
        <div className="empty">
          <p>Nenhuma meta ainda.</p>
          <p className="hint">Ex.: Tirar CNH até dezembro de 2028, ou ler 12 livros este ano.</p>
        </div>
      ) : (
        <div className="goal-grid">
          {(goals ?? []).map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              today={today}
              onOpen={() => setOpen({ mode: "view", goalId: goal.id })}
            />
          ))}
        </div>
      )}

      <Dialog
        open={open !== null}
        title={open?.mode === "new" ? "Nova meta" : "Meta"}
        onClose={() => setOpen(null)}
      >
        {open?.mode === "new" && (
          <GoalForm
            goal={null}
            onSaved={() => {
              setOpen(null);
              reload();
            }}
          />
        )}
        {open?.mode === "view" && (
          <GoalDetailView
            goalId={open.goalId}
            today={today}
            onChanged={reload}
            onSeeGrants={() => onNavigate("vales")}
          />
        )}
      </Dialog>
    </>
  );
}

function GoalCard({ goal, today, onOpen }: { goal: Goal; today: string; onOpen: () => void }) {
  const category = CATEGORIES[goal.category];
  const left = timeLeft(goal.deadline, today);
  return (
    <button
      className={`goal-card${goal.active ? "" : " row-muted"}`}
      style={{ "--goal-color": category.color } as CSSProperties}
      onClick={onOpen}
    >
      <span className="goal-card-top">
        <span className="tag goal-tag">{category.label}</span>
        <DifficultyDots difficulty={goal.difficulty} />
      </span>
      <span className="goal-name">{goal.name}</span>
      <span className="goal-deadline">
        até {formatMonthYear(goal.deadline)}
        {goal.completed ? (
          <span className="status-ok"> · concluída</span>
        ) : (
          <span className={left.overdue ? "text-error" : undefined}> · {left.text}</span>
        )}
      </span>
      <ProgressBar goal={goal} />
      <span className="goal-badges">
        <GrantBadge goal={goal} />
        {!goal.active && <span className="tag tag-muted">arquivada</span>}
      </span>
    </button>
  );
}

// Situação do vale da meta: ganho, usado, ou concluída sem vale (fora do prazo).
function GrantBadge({ goal }: { goal: Goal }) {
  if (goal.grant_tier) {
    const tier = TIERS[goal.grant_tier];
    return (
      <span className="tag" style={{ color: tier.color }}>
        {goal.grant_redeemed ? "vale usado" : `vale ${tier.label.toLowerCase()}`}
      </span>
    );
  }
  if (goal.completed) return <span className="tag tag-muted">sem vale</span>;
  return null;
}

function ProgressBar({ goal }: { goal: Goal }) {
  return (
    <span className="goal-progress">
      <span className="progress" aria-hidden>
        <span
          className={`progress-bar${goal.completed ? " is-complete" : ""}`}
          style={{ width: `${goal.progress}%` }}
        />
      </span>
      <span className="goal-progress-text">
        {goal.subtasks_total === 0
          ? "sem passos"
          : `${goal.subtasks_done}/${goal.subtasks_total} · ${goal.progress}%`}
      </span>
    </span>
  );
}

function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const { label, level } = DIFFICULTIES[difficulty];
  return (
    <span className="difficulty" title={`Dificuldade: ${label}`} aria-label={`Dificuldade: ${label}`}>
      {[1, 2, 3, 4].map((n) => (
        <span key={n} className={n <= level ? "on" : undefined} aria-hidden />
      ))}
      <span className="difficulty-label">{label}</span>
    </span>
  );
}

// ---------- Detalhe: passos (subtarefas) e edição ----------

function GoalDetailView({
  goalId,
  today,
  onChanged,
  onSeeGrants,
}: {
  goalId: string;
  today: string;
  onChanged: () => void;
  onSeeGrants: () => void;
}) {
  const { data: goal, setData, error, reload } = useResource<GoalDetail>(`/goals/${goalId}`);
  const [editing, setEditing] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Vale que acabou de sair ao concluir a meta: mostra o aviso de comemoração.
  const [newGrant, setNewGrant] = useState<Grant | null>(null);

  if (error && !goal) return <LoadError message={error} onRetry={reload} />;
  if (!goal) return <Loading />;

  if (editing) {
    return (
      <GoalForm
        goal={goal}
        onSaved={() => {
          setEditing(false);
          reload();
          onChanged();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // A API devolve a meta já recalculada (porcentagem e vale): usamos ela
  // direto, em vez de repetir no front a regra do vale.
  function applyChange(change: GoalChange) {
    setData(change.goal);
    setNewGrant(change.new_grant);
    onChanged();
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const g = goal;
  const category = CATEGORIES[g.category];
  const left = timeLeft(g.deadline, today);

  function toggleStep(step: Subtask) {
    run(step.id, async () => {
      applyChange(
        await api<GoalChange>(`/goals/${g.id}/subtasks/${step.id}`, {
          method: "PATCH",
          body: JSON.stringify({ done: !step.done }),
        }),
      );
    });
  }

  function deleteStep(step: Subtask) {
    run(`del-${step.id}`, async () => {
      applyChange(
        await api<GoalChange>(`/goals/${g.id}/subtasks/${step.id}`, { method: "DELETE" }),
      );
    });
  }

  function addStep(event: FormEvent) {
    event.preventDefault();
    const name = newStep.trim();
    if (!name) return;
    run("add", async () => {
      applyChange(
        await api<GoalChange>(`/goals/${g.id}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ name }),
        }),
      );
      setNewStep("");
    });
  }

  function toggleArchive() {
    run("archive", async () => {
      const updated = await api<GoalDetail>(`/goals/${g.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !g.active }),
      });
      setData(updated);
      onChanged();
    });
  }

  return (
    <div className="form" style={{ "--goal-color": category.color } as CSSProperties}>
      <div className="goal-detail-head">
        <span className="goal-card-top">
          <span className="tag goal-tag">{category.label}</span>
          <DifficultyDots difficulty={g.difficulty} />
        </span>
        <h3 className="goal-detail-name">{g.name}</h3>
        {g.description && <p className="hint">{g.description}</p>}
        <p className="goal-deadline">
          Prazo: {formatFullDate(g.deadline)}
          {g.completed ? (
            <span className="status-ok"> · concluída</span>
          ) : (
            <span className={left.overdue ? "text-error" : undefined}> · {left.text}</span>
          )}
        </p>
        <ProgressBar goal={g} />
        <GoalGrantStatus goal={g} today={today} />
      </div>

      {newGrant && (
        <div
          className="celebrate"
          role="status"
          style={{ "--tier-color": TIERS[newGrant.tier].color } as CSSProperties}
        >
          <div>
            <strong>Meta concluída no prazo!</strong>
            <p>
              Você ganhou um vale {TIERS[newGrant.tier].label.toLowerCase()}:{" "}
              {TIERS[newGrant.tier].rule.toLowerCase()}.
            </p>
          </div>
          <button className="button" onClick={onSeeGrants}>
            Ver meus vales
          </button>
        </div>
      )}

      {actionError && (
        <div className="alert" role="alert">
          {actionError}
        </div>
      )}

      <div className="field">
        <span className="field-title">Passos</span>
        {g.subtasks.length === 0 ? (
          <p className="hint">
            Nenhum passo ainda. Quebre a meta em partes: os livros da lista, as etapas da CNH…
          </p>
        ) : (
          <ul className="checks">
            {g.subtasks.map((step) => (
              <li key={step.id} className="step">
                <button
                  className="check"
                  role="checkbox"
                  aria-checked={step.done}
                  disabled={busy === step.id}
                  onClick={() => toggleStep(step)}
                >
                  <span className="check-box">{step.done && <CheckIcon />}</span>
                  <span className="check-label">{step.name}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Apagar o passo ${step.name}`}
                  disabled={busy === `del-${step.id}`}
                  onClick={() => deleteStep(step)}
                >
                  <CloseIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="add-step" onSubmit={addStep}>
          <input
            className="input"
            maxLength={200}
            placeholder="Novo passo"
            aria-label="Novo passo"
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
          />
          <button
            className="button"
            type="submit"
            disabled={!newStep.trim() || busy === "add"}
            aria-label="Adicionar passo"
          >
            <PlusIcon />
          </button>
        </form>
      </div>

      <div className="form-actions">
        <button
          className="button button-ghost"
          disabled={busy === "archive"}
          onClick={toggleArchive}
        >
          {g.active ? "Arquivar" : "Reativar"}
        </button>
        <button className="button" onClick={() => setEditing(true)}>
          Editar meta
        </button>
      </div>
    </div>
  );
}

// Uma linha explicando o vale desta meta, em qualquer situação.
function GoalGrantStatus({ goal, today }: { goal: Goal; today: string }) {
  const promised = TIERS[GOAL_TIER[goal.difficulty]];
  let text: string;
  if (goal.grant_tier) {
    const tier = TIERS[goal.grant_tier].label.toLowerCase();
    text = goal.grant_redeemed
      ? `Vale ${tier} já usado: os passos ficam travados.`
      : `Vale ${tier} ganho. Desmarcar um passo cancela o vale.`;
  } else if (goal.completed) {
    text = "Concluída sem vale (fora do prazo ou arquivada).";
  } else if (today > goal.deadline) {
    text = "Prazo vencido: concluir agora não dá mais vale.";
  } else {
    text = `Concluída no prazo, vale ${promised.label.toLowerCase()}: ${promised.rule.toLowerCase()}.`;
  }
  return <p className="hint">{text}</p>;
}

// ---------- Formulário (criar e editar) ----------

function GoalForm({
  goal,
  onSaved,
  onCancel,
}: {
  goal: GoalDetail | null;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? "pessoal");
  const [difficulty, setDifficulty] = useState<Difficulty>(goal?.difficulty ?? "media");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [steps, setSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      difficulty,
    };
    // Só manda o prazo se mudou: a API recusa prazo no passado, e uma meta
    // vencida precisa continuar editável (ex.: corrigir o nome).
    if (!goal || deadline !== goal.deadline) body.deadline = deadline;
    if (!goal) {
      // Um passo por linha: colar a lista de livros já cria tudo de uma vez.
      body.subtasks = steps
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    try {
      await api(goal ? `/goals/${goal.id}` : "/goals", {
        method: goal ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  const valid = name.trim() !== "" && deadline !== "";

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="field">
        <label htmlFor="goal-name">Nome</label>
        <input
          id="goal-name"
          className="input"
          maxLength={100}
          autoFocus={!goal}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Tirar CNH"
        />
      </div>

      <div className="field">
        <label htmlFor="goal-description">Descrição (opcional)</label>
        <textarea
          id="goal-description"
          className="input"
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="field">
          <label htmlFor="goal-category">Categoria</label>
          <select
            id="goal-category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as GoalCategory)}
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>
                {CATEGORIES[c].label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="goal-deadline">Prazo</label>
          <input
            id="goal-deadline"
            className="input"
            type="date"
            min={todayISO()}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="field">
        <legend>Dificuldade</legend>
        <div className="segmented">
          {DIFFICULTY_ORDER.map((d) => (
            <button
              key={d}
              type="button"
              className="day-toggle"
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTIES[d].label}
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 6 }}>
          Concluída no prazo, dá um vale{" "}
          <strong style={{ color: TIERS[GOAL_TIER[difficulty]].color }}>
            {TIERS[GOAL_TIER[difficulty]].label.toLowerCase()}
          </strong>
          .
          {goal?.grant_tier && " Mudar a dificuldade agora não muda o vale já ganho."}
        </p>
      </fieldset>

      {!goal && (
        <div className="field">
          <label htmlFor="goal-steps">Passos (opcional, um por linha)</label>
          <textarea
            id="goal-steps"
            className="input"
            rows={4}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder={"Exame médico\nAulas teóricas\nProva teórica\nAulas práticas\nProva prática"}
          />
          <p className="hint">Dá para adicionar, marcar e apagar passos depois, abrindo a meta.</p>
        </div>
      )}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="button button-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="button" type="submit" disabled={!valid || saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
