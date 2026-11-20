import type { Period, Tier } from "../types";

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
    earnedBy: "semana completa",
    color: "var(--syntax-green)",
  },
  media: {
    label: "Média",
    rule: "Comprar algo até R$ 200",
    earnedBy: "mês completo",
    color: "var(--syntax-blue)",
  },
  boa: {
    label: "Boa",
    rule: "Comprar algo até R$ 500",
    earnedBy: "semestre completo",
    color: "var(--syntax-purple)",
  },
  muito_boa: {
    label: "Muito boa",
    rule: "Comprar algo acima de R$ 500 ou viajar",
    earnedBy: "ano completo",
    color: "var(--syntax-yellow)",
  },
};

export const TIER_ORDER: Tier[] = ["basica", "media", "boa", "muito_boa"];

export const PERIOD_LABEL: Record<Period, string> = {
  semana: "da semana",
  mes: "do mês",
  semestre: "do semestre",
  ano: "do ano",
};
