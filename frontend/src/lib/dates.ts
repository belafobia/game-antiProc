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

export function formatRange(start: string, end: string): string {
  return `${longDate.format(parseISODate(start))} – ${longDate.format(parseISODate(end))}`;
}
