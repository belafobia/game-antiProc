import { useState, type CSSProperties, type FormEvent } from "react";

import { api, errorMessage } from "../api";
import { Dialog } from "../components/Dialog";
import { PlusIcon } from "../components/icons";
import { LoadError, Loading } from "../components/PageState";
import { useResource } from "../hooks/useResource";
import { TIER_ORDER, TIERS } from "../lib/labels";
import type { Reward, Tier } from "../types";

type Editing = { reward: Reward } | { tier: Tier } | null;

export function RewardsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const { data: rewards, error, loading, reload } = useResource<Reward[]>(
    `/rewards${showArchived ? "?include_archived=true" : ""}`,
  );
  const [editing, setEditing] = useState<Editing>(null);

  function handleSaved() {
    setEditing(null);
    reload();
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Recompensas</h1>
          <p className="hint">
            Cada período completo dá um vale. Você usa o vale escolhendo uma recompensa do mesmo
            nível.
          </p>
        </div>
        <button className="button" onClick={() => setEditing({ tier: "basica" })}>
          <PlusIcon />
          Nova recompensa
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

      {error && !rewards ? (
        <LoadError message={error} onRetry={reload} />
      ) : loading && !rewards ? (
        <Loading />
      ) : (
        <div className="tier-grid">
          {TIER_ORDER.map((tier) => {
            const info = TIERS[tier];
            const items = (rewards ?? []).filter((r) => r.tier === tier);
            return (
              <section
                key={tier}
                className="tier"
                style={{ "--tier-color": info.color } as CSSProperties}
              >
                <header className="tier-header">
                  <div>
                    <h2>{info.label}</h2>
                    <p className="hint">{info.rule}</p>
                  </div>
                  <span className="tag tier-tag">{info.earnedBy}</span>
                </header>

                {items.length === 0 ? (
                  <p className="hint">Nenhuma recompensa {info.label.toLowerCase()} ainda.</p>
                ) : (
                  <ul className="list">
                    {items.map((reward) => (
                      <li key={reward.id}>
                        <button
                          className={`row${reward.active ? "" : " row-muted"}`}
                          onClick={() => setEditing({ reward })}
                        >
                          <div className="row-main">
                            <span className="row-title">{reward.name}</span>
                            {reward.description && (
                              <span className="row-meta hint">{reward.description}</span>
                            )}
                          </div>
                          {!reward.active && <span className="tag tag-muted">arquivada</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button className="link-button" onClick={() => setEditing({ tier })}>
                  <PlusIcon />
                  Adicionar
                </button>
              </section>
            );
          })}
        </div>
      )}

      <Dialog
        open={editing !== null}
        title={editing && "reward" in editing ? "Editar recompensa" : "Nova recompensa"}
        onClose={() => setEditing(null)}
      >
        {editing !== null && (
          <RewardForm
            reward={"reward" in editing ? editing.reward : null}
            initialTier={"tier" in editing ? editing.tier : editing.reward.tier}
            onSaved={handleSaved}
          />
        )}
      </Dialog>
    </>
  );
}

type FormProps = { reward: Reward | null; initialTier: Tier; onSaved: () => void };

function RewardForm({ reward, initialTier, onSaved }: FormProps) {
  const [name, setName] = useState(reward?.name ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [tier, setTier] = useState<Tier>(initialTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const body = { name: name.trim(), description: description.trim() || null, tier };
    if (reward) send(`/rewards/${reward.id}`, "PATCH", body);
    else send("/rewards", "POST", body);
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <div className="field">
        <label htmlFor="reward-name">Nome</label>
        <input
          id="reward-name"
          className="input"
          maxLength={100}
          autoFocus={!reward}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Cinema com a namorada"
        />
      </div>

      <div className="field">
        <label htmlFor="reward-description">Descrição (opcional)</label>
        <textarea
          id="reward-description"
          className="input"
          rows={2}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <fieldset className="field">
        <legend>Nível</legend>
        <div className="radio-cards">
          {TIER_ORDER.map((t) => (
            <label
              key={t}
              className="radio-card"
              style={{ "--tier-color": TIERS[t].color } as CSSProperties}
            >
              <input
                type="radio"
                name="tier"
                value={t}
                checked={tier === t}
                onChange={() => setTier(t)}
              />
              <span className="radio-card-title">{TIERS[t].label}</span>
              <span className="hint">{TIERS[t].rule}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        {reward && (
          <button
            type="button"
            className="button button-ghost"
            disabled={saving}
            onClick={() => send(`/rewards/${reward.id}`, "PATCH", { active: !reward.active })}
          >
            {reward.active ? "Arquivar" : "Reativar"}
          </button>
        )}
        <button className="button" type="submit" disabled={!name.trim() || saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
