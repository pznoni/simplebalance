// Datas como texto "AAAA-MM-DD" / "AAAA-MM", sempre no horário local.

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

function parts(s: string): [number, number, number] {
  const [y = 1970, m = 1, d = 1] = s.split('-').map(Number);
  return [y, m, d];
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const todayISO = () => toISO(new Date());

// ---------- Dia de fechamento ----------
// Com fechamento no dia F, o "mês" do app é um ciclo: "Novembro" vai de (F+1)/out até F/nov.
// Sem fechamento (null), é o mês do calendário. Vem das preferências do usuário (App.tsx).
let fechamento: number | null = null;

export function setFechamento(dia: number | null): void {
  fechamento = dia != null && Number.isInteger(dia) && dia >= 1 && dia <= 31 ? dia : null;
}
export const getFechamento = () => fechamento;

/** Último dia do ciclo `ym` (o fechamento, limitado ao tamanho do mês). */
function cycleEnd(ym: string): string {
  return fechamento ? dateInMonth(ym, fechamento) : `${ym}-${pad(daysInMonth(ym))}`;
}

/** Mês (ciclo) a que uma data pertence: "2026-11-22" com fechamento 20 → "2026-12". */
export function periodOf(iso: string): string {
  const ym = iso.slice(0, 7);
  return iso > cycleEnd(ym) ? addMonths(ym, 1) : ym;
}

/** Mês (ciclo) em andamento hoje. */
export const currentMonth = () => periodOf(todayISO());

export function addMonths(ym: string, n: number): string {
  const [y, m] = parts(ym);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function daysInMonth(ym: string): number {
  const [y, m] = parts(ym);
  return new Date(y, m, 0).getDate();
}

/** Dia dentro do mês, limitado ao tamanho dele (31 em fevereiro vira 28/29). */
export function dateInMonth(ym: string, day: number): string {
  return `${ym}-${pad(Math.min(Math.max(1, day), daysInMonth(ym)))}`;
}

/** Primeiro e último dia do mês (ciclo), para filtrar no banco. */
export function monthRange(ym: string): { from: string; to: string } {
  return { from: addDays(cycleEnd(addMonths(ym, -1)), 1), to: cycleEnd(ym) };
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  return toISO(new Date(y, m - 1, d + n));
}

export function monthName(ym: string): string {
  return MESES[parts(ym)[1] - 1] ?? '';
}

/** "2026-11" → "Novembro" (com o ano, se não for o ano atual). */
export function monthTitle(ym: string, today = todayISO()): string {
  const nome = monthName(ym);
  const cap = nome.charAt(0).toUpperCase() + nome.slice(1);
  return ym.slice(0, 4) === today.slice(0, 4) ? cap : `${cap} ${ym.slice(0, 4)}`;
}

/** Diferença em dias inteiros (b − a), imune a horário de verão. */
export function diffDays(a: string, b: string): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });

/** "Hoje", "Ontem", "Amanhã" ou "Quinta, 20 nov". */
export function dayHeader(iso: string, today = todayISO()): string {
  const diff = diffDays(today, iso);
  if (diff === 0) return 'Hoje';
  if (diff === -1) return 'Ontem';
  if (diff === 1) return 'Amanhã';
  const [y, m, d] = parts(iso);
  const wd = weekday.format(new Date(y, m - 1, d)).replace('-feira', '');
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${d} ${(MESES[m - 1] ?? '').slice(0, 3)}`;
}

