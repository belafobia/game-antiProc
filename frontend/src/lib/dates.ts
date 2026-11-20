// Datas "de calendário" (sem hora), no fuso do aparelho.
//
// Cuidado clássico: new Date().toISOString() devolve a data em UTC. Às 22h em
// São Paulo já é o dia seguinte em UTC, e o check cairia no dia errado. Por
// isso montamos o "2026-11-20" a partir dos campos locais.

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// new Date("2026-11-20") seria meia-noite UTC (= 21h do dia 19 em SP).
// Com (ano, mês, dia) é meia-noite local.
export function parseISODate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

// 0 = segunda ... 6 = domingo (a mesma convenção da API).
export function weekdayIndex(value: string): number {
  return (parseISODate(value).getDay() + 6) % 7;
}

const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });
const longDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });

export function formatDayMonth(value: string): string {
  return dayMonth.format(parseISODate(value));
}

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const fullDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export function formatMonthYear(value: string): string {
  return monthYear.format(parseISODate(value));
}

export function formatFullDate(value: string): string {
  return fullDate.format(parseISODate(value));
}

// Data com hora vinda da API (ex.: granted_at) -> "20/11/2026".
export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

export function daysBetween(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  // round: absorve a hora a mais/a menos dos dias de horário de verão.
  return Math.round(ms / 86_400_000);
}

// "faltam 12 dias", "faltam 3 meses", "faltam 2 anos", "venceu há 5 dias".
export function timeLeft(deadline: string, today: string): { text: string; overdue: boolean } {
  const days = daysBetween(today, deadline);
  if (days < 0) {
    const n = -days;
    return { text: `venceu há ${n} ${n === 1 ? "dia" : "dias"}`, overdue: true };
  }
  if (days === 0) return { text: "vence hoje", overdue: false };
  if (days < 60) return { text: `${days === 1 ? "falta 1 dia" : `faltam ${days} dias`}`, overdue: false };
  if (days < 730) return { text: `faltam ${Math.floor(days / 30.44)} meses`, overdue: false };
  return { text: `faltam ${Math.floor(days / 365.25)} anos`, overdue: false };
}

export function formatRange(start: string, end: string): string {
  return `${longDate.format(parseISODate(start))} – ${longDate.format(parseISODate(end))}`;
}
