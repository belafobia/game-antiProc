import { useMemo, useState, type CSSProperties } from "react";

import { api, errorMessage } from "../api";
import { Dialog } from "../components/Dialog";
import { LoadError, Loading } from "../components/PageState";
import { useResource } from "../hooks/useResource";
import { addDays, formatDayMonth, formatMonthYear, formatTimestamp, parseISODate } from "../lib/dates";
import { TIER_ORDER, TIERS } from "../lib/labels";
import type { Page } from "../lib/router";
import type { Grant, Reward } from "../types";

// "semana de 16/11 a 22/11", "novembro de 2026", "1º semestre de 2026"…
function periodText(grant: Grant): string {
  const start = grant.period_start;
  switch (grant.period) {
    case "semana":
      return `semana de ${formatDayMonth(start)} a ${formatDayMonth(addDays(start, 6))}`;
    case "mes":
      return formatMonthYear(start);
    case "semestre": {
      const date = parseISODate(start);
      return `${date.getMonth() < 6 ? "1º" : "2º"} semestre de ${date.getFullYear()}`;
    }
    case "ano":
      return `ano de ${parseISODate(start).getFullYear()}`;
    case "meta":
      return `meta “${grant.goal_name ?? "removida"}”`;
  }
}

export function GrantsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const grantsRes = useResource<Grant[]>("/grants");
  // Inclui arquivadas: um vale usado precisa mostrar o nome da recompensa
  // mesmo que ela tenha sido arquivada depois.
  const rewardsRes = useResource<Reward[]>("/rewards?include_archived=true");
  const [redeeming, setRedeeming] = useState<Grant | null>(null);

  const rewardsById = useMemo(
    () => new Map((rewardsRes.data ?? []).map((r) => [r.id, r])),
    [rewardsRes.data],
  );

  const grants = grantsRes.data;
  const error = grantsRes.error ?? rewardsRes.error;
  if (error && (!grants || !rewardsRes.data)) {
    return (
      <LoadError
        message={error}
        onRetry={() => {
          grantsRes.reload();
          rewardsRes.reload();
        }}
      />
    );
  }
  if (!grants || !rewardsRes.data) return <Loading />;

  const pending = grants.filter((g) => g.reward_id === null);
  const used = grants.filter((g) => g.reward_id !== null);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Vales</h1>
          <p className="hint">
            Semana completa vale uma básica; mês, uma média; semestre, uma boa; ano, uma muito boa.
            Metas concluídas no prazo também dão vale, pelo nível de dificuldade.
          </p>
        </div>
      </header>

      <div className="tier-stats">
        {TIER_ORDER.map((tier) => {
          const count = pending.filter((g) => g.tier === tier).length;
          return (
            <div
              key={tier}
              className={`tier-stat${count ? "" : " is-empty"}`}
              style={{ "--tier-color": TIERS[tier].color } as CSSProperties}
            >
              <span className="tier-stat-count">{count}</span>
              <span className="tier-stat-label">{TIERS[tier].label}</span>
            </div>
          );
        })}
      </div>

      <section className="section">
        <h2>Para usar</h2>
        {pending.length === 0 ? (
          <div className="empty">
            <p>Nenhum vale disponível.</p>
            <p className="hint">
              Complete todas as tarefas da semana e feche-a no domingo, ou conclua uma meta no
              prazo.
            </p>
            <button className="button" onClick={() => onNavigate("semana")}>
              Ir para a semana
            </button>
          </div>
        ) : (
          <ul className="list">
            {pending.map((grant) => (
              <li
                key={grant.id}
                className="grant grant-row"
                style={{ "--tier-color": TIERS[grant.tier].color } as CSSProperties}
              >
                <div className="row-main">
                  <span className="grant-title">Vale {TIERS[grant.tier].label.toLowerCase()}</span>
                  <span className="hint">
                    {periodText(grant)} · {TIERS[grant.tier].rule}
                  </span>
                </div>
                <button className="button" onClick={() => setRedeeming(grant)}>
                  Usar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {used.length > 0 && (
        <section className="section">
          <h2>Já usados</h2>
          <ul className="list">
            {used.map((grant) => (
              <li
                key={grant.id}
                className="grant grant-row is-used"
                style={{ "--tier-color": TIERS[grant.tier].color } as CSSProperties}
              >
                <div className="row-main">
                  <span className="grant-title">
                    {rewardsById.get(grant.reward_id!)?.name ?? "Recompensa"}
                  </span>
                  <span className="hint">
                    Vale {TIERS[grant.tier].label.toLowerCase()} · {periodText(grant)} · usado em{" "}
                    {formatTimestamp(grant.redeemed_at!)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog
        open={redeeming !== null}
        title="Usar vale"
        onClose={() => setRedeeming(null)}
      >
        {redeeming && (
          <RedeemForm
            grant={redeeming}
            rewards={rewardsRes.data.filter((r) => r.active && r.tier === redeeming.tier)}
            onDone={() => {
              setRedeeming(null);
              grantsRes.reload();
            }}
            onGoToRewards={() => onNavigate("recompensas")}
          />
        )}
      </Dialog>
    </>
  );
}

type RedeemProps = {
  grant: Grant;
  rewards: Reward[];
  onDone: () => void;
  onGoToRewards: () => void;
};

function RedeemForm({ grant, rewards, onDone, onGoToRewards }: RedeemProps) {
  const [rewardId, setRewardId] = useState<string | null>(rewards[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tier = TIERS[grant.tier];

  async function redeem() {
    if (!rewardId) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/grants/${grant.id}/redeem`, {
        method: "POST",
        body: JSON.stringify({ reward_id: rewardId }),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (rewards.length === 0) {
    return (
      <div className="form">
        <p>
          Você ainda não cadastrou nenhuma recompensa <strong>{tier.label.toLowerCase()}</strong>.
        </p>
        <p className="hint">{tier.rule}.</p>
        <div className="form-actions">
          <button className="button" onClick={onGoToRewards}>
            Cadastrar recompensas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form" style={{ "--tier-color": tier.color } as CSSProperties}>
      <p>
        Vale <strong>{tier.label.toLowerCase()}</strong> · {periodText(grant)}. Escolha a
        recompensa:
      </p>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <fieldset className="field">
        <legend className="visually-hidden">Recompensa</legend>
        <div className="radio-list">
          {rewards.map((reward) => (
            <label
              key={reward.id}
              className="radio-card"
              style={{ "--tier-color": tier.color } as CSSProperties}
            >
              <input
                type="radio"
                name="reward"
                value={reward.id}
                checked={rewardId === reward.id}
                onChange={() => setRewardId(reward.id)}
              />
              <span className="radio-card-title">{reward.name}</span>
              {reward.description && <span className="hint">{reward.description}</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="hint">Depois de usado, o vale não volta.</p>

      <div className="form-actions">
        <button className="button" disabled={!rewardId || saving} onClick={redeem}>
          {saving ? "Usando…" : "Usar vale"}
        </button>
      </div>
    </div>
  );
}
