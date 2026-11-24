import type { Difficulty, GoalCategory, Period, Tier } from "../types";

// A semana vale (vale básico, e conta para mês/semestre/ano) a partir desta
// porcentagem. Mesma regra do backend: WEEK_GOAL_PERCENT em
// backend/app/services/schedule.py. Mudou lá, muda aqui.
export const WEEK_GOAL_PERCENT = 90;

// Índice = convenção da API (0 = segunda ... 6 = domingo).
export const WEEKDAYS = [
  { short: "Seg", long: "Segunda" },
  { short: "Ter", long: "Terça" },
  { short: "Qua", long: "Quarta" },
  { short: "Qui", long: "Quinta" },
  { short: "Sex", long: "Sexta" },
  { short: "Sáb", long: "Sábado" },
  { short: "Dom", long: "Domingo" },
];

export const TIERS: Record<
  Tier,
  { label: string; rule: string; earnedBy: string; color: string }
> = {
  basica: {
    label: "Básica",
    rule: "Um fim de semana: amigos, cinema, namorada",
    earnedBy: `semana com ${WEEK_GOAL_PERCENT}% ou mais`,
    color: "var(--syntax-green)",
  },
  media: {
    label: "Média",
    rule: "Comprar algo até R$ 200",
    earnedBy: "todas as semanas do mês",
    color: "var(--syntax-blue)",
  },
  boa: {
    label: "Boa",
    rule: "Comprar algo até R$ 500",
    earnedBy: "todos os meses do semestre",
    color: "var(--syntax-purple)",
  },
  muito_boa: {
    label: "Muito boa",
    rule: "Comprar algo acima de R$ 500 ou viajar",
    earnedBy: "os 2 semestres do ano",
    color: "var(--syntax-yellow)",
  },
};

export const TIER_ORDER: Tier[] = ["basica", "media", "boa", "muito_boa"];

export const PERIOD_LABEL: Record<Period, string> = {
  semana: "da semana",
  mes: "do mês",
  semestre: "do semestre",
  ano: "do ano",
  meta: "da meta",
};

export const CATEGORIES: Record<GoalCategory, { label: string; color: string }> = {
  financeira: { label: "Financeira", color: "var(--syntax-green)" },
  saude: { label: "Saúde", color: "var(--syntax-teal)" },
  educacao: { label: "Educação", color: "var(--syntax-blue)" },
  profissional: { label: "Profissional", color: "var(--syntax-lightblue)" },
  pessoal: { label: "Pessoal", color: "var(--syntax-purple)" },
  relacionamentos: { label: "Relacionamentos", color: "var(--syntax-orange)" },
  lazer: { label: "Lazer", color: "var(--syntax-yellow)" },
  outra: { label: "Outra", color: "var(--text-muted)" },
};

export const CATEGORY_ORDER = Object.keys(CATEGORIES) as GoalCategory[];

// level: quantos dos 4 pontinhos acendem no indicador de dificuldade.
export const DIFFICULTIES: Record<Difficulty, { label: string; level: number }> = {
  facil: { label: "Fácil", level: 1 },
  media: { label: "Média", level: 2 },
  dificil: { label: "Difícil", level: 3 },
  muito_dificil: { label: "Muito difícil", level: 4 },
};

// Dificuldade da meta concluída no prazo -> nível do vale (igual ao backend).
export const GOAL_TIER: Record<Difficulty, Tier> = {
  facil: "basica",
  media: "media",
  dificil: "boa",
  muito_dificil: "muito_boa",
};

export const DIFFICULTY_ORDER = Object.keys(DIFFICULTIES) as Difficulty[];
