// Formatos das respostas da API (espelham os schemas do backend).
// Datas sem hora ("2026-11-20") chegam como string ISO.

export type TokenOut = {
  access_token: string;
  token_type: string;
};

export type Me = {
  id: string;
  email: string;
  display_name: string;
};

export type Task = {
  id: string;
  name: string;
  category: string | null;
  // 0 = segunda ... 6 = domingo
  weekdays: number[];
  starts_on: string;
  active: boolean;
  created_at: string;
};

export type Tier = "basica" | "media" | "boa" | "muito_boa";

export type Reward = {
  id: string;
  name: string;
  description: string | null;
  tier: Tier;
  active: boolean;
  created_at: string;
};

export type Occurrence = {
  task_id: string;
  task_name: string;
  category: string | null;
  done: boolean;
  completion_id: string | null;
};

export type Day = {
  day: string;
  items: Occurrence[];
};

export type Week = {
  start: string;
  end: string;
  total: number;
  done: number;
  percent: number;
  complete: boolean;
  closed: boolean;
  days: Day[];
};

export type Completion = {
  id: string;
  task_id: string;
  day: string;
  completed_at: string;
};

// "meta": vale de meta concluída no prazo.
export type Period = "semana" | "mes" | "semestre" | "ano" | "meta";

export type Grant = {
  id: string;
  period: Period;
  period_start: string;
  tier: Tier;
  goal_id: string | null;
  goal_name: string | null;
  granted_at: string;
  reward_id: string | null;
  redeemed_at: string | null;
};

export type WeekClose = {
  week_start: string;
  complete: boolean;
  closed_at: string;
  grants: Grant[];
};

export type GoalCategory =
  | "financeira"
  | "saude"
  | "educacao"
  | "profissional"
  | "pessoal"
  | "relacionamentos"
  | "lazer"
  | "outra";

export type Difficulty = "facil" | "media" | "dificil" | "muito_dificil";

export type Goal = {
  id: string;
  name: string;
  description: string | null;
  category: GoalCategory;
  difficulty: Difficulty;
  deadline: string;
  active: boolean;
  created_at: string;
  subtasks_total: number;
  subtasks_done: number;
  // 0 a 100, arredondado para baixo
  progress: number;
  completed: boolean;
  // Vale da meta: só existe se foi concluída no prazo.
  grant_id: string | null;
  grant_tier: Tier | null;
  grant_redeemed: boolean;
};

export type Subtask = {
  id: string;
  name: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export type GoalDetail = Goal & { subtasks: Subtask[] };

// Resposta das mudanças nos passos: a meta atualizada e o vale que acabou de
// sair, se a mudança concluiu a meta no prazo.
export type GoalChange = {
  goal: GoalDetail;
  new_grant: Grant | null;
};
