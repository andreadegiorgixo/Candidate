/**
 * Utility unica per le date. Il backend usa LocalDate (`YYYY-MM-DD`) e LocalDateTime
 * (`YYYY-MM-DDTHH:mm`): non vanno mai passate a `new Date(stringa)`, che sposta il giorno
 * in base al fuso orario. Tutte le funzioni lavorano sulle stringhe o su date locali.
 */

export type DataISO = string;

const GIORNO_MS = 86_400_000;

export function parseData(iso: DataISO): Date {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, g);
}

export function formatISO(d: Date): DataISO {
  const a = String(d.getFullYear()).padStart(4, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${g}`;
}

export function oggiISO(): DataISO {
  return formatISO(new Date());
}

/** Parte data di un LocalDateTime. */
export function soloData(dataOra: string): DataISO {
  return dataOra.slice(0, 10);
}

/** Parte oraria `HH:mm` di un LocalDateTime. */
export function soloOra(dataOra: string): string {
  return dataOra.length >= 16 ? dataOra.slice(11, 16) : '';
}

export function componiDataOra(data: DataISO, ora: string): string {
  return `${data}T${ora || '00:00'}`;
}

export function adesso(): string {
  const d = new Date();
  return `${formatISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function giorniAssoluti(iso: DataISO): number {
  const [a, m, g] = iso.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, g) / GIORNO_MS);
}

/** Giorni di calendario da `da` a `a` (positivo se `a` è dopo `da`). */
export function differenzaGiorni(da: DataISO, a: DataISO): number {
  return giorniAssoluti(a) - giorniAssoluti(da);
}

export function aggiungiGiorni(iso: DataISO, n: number): DataISO {
  const d = new Date(Date.UTC(0, 0, 1));
  d.setUTCFullYear(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + n);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function aggiungiMesi(iso: DataISO, n: number): DataISO {
  const a = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const anno = a + Math.floor(m / 12);
  const mese = ((m % 12) + 12) % 12;
  const ultimo = new Date(anno, mese + 1, 0).getDate();
  const g = Math.min(Number(iso.slice(8, 10)), ultimo);
  return formatISO(new Date(anno, mese, g));
}

/** Lunedì della settimana che contiene `iso`. */
export function inizioSettimana(iso: DataISO): DataISO {
  const giornoSett = (parseData(iso).getDay() + 6) % 7; // lunedì = 0
  return aggiungiGiorni(iso, -giornoSett);
}

export function fineSettimana(iso: DataISO): DataISO {
  return aggiungiGiorni(inizioSettimana(iso), 6);
}

/** `YYYY-MM` */
export function chiaveMese(iso: DataISO): string {
  return iso.slice(0, 7);
}

export function primoDelMese(iso: DataISO): DataISO {
  return `${iso.slice(0, 7)}-01`;
}

const fmtLungo = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const fmtCompleto = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMese = new Intl.DateTimeFormat('it-IT', { month: 'short' });
const fmtMeseAnno = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
const fmtGiornoSett = new Intl.DateTimeFormat('it-IT', { weekday: 'long' });

function maiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** «martedì 3 novembre» */
export function formatoLungo(iso: DataISO): string {
  return fmtLungo.format(parseData(iso));
}

/** «3 nov» */
export function formatoBreve(iso: DataISO): string {
  return fmtBreve.format(parseData(iso)).replace('.', '');
}

/** «3 novembre 2026» */
export function formatoCompleto(iso: DataISO): string {
  return fmtCompleto.format(parseData(iso));
}

/** «nov» */
export function meseBreve(iso: DataISO): string {
  return fmtMese.format(parseData(iso)).replace('.', '');
}

/** «novembre 2026» */
export function meseAnno(iso: DataISO): string {
  return fmtMeseAnno.format(parseData(iso));
}

export function nomeGiorno(iso: DataISO): string {
  return fmtGiornoSett.format(parseData(iso));
}

export function giornoDelMese(iso: DataISO): number {
  return Number(iso.slice(8, 10));
}

/** Descrive una data rispetto a oggi: «oggi», «domani», «venerdì 6 novembre». */
export function descriviData(iso: DataISO, oggi: DataISO): string {
  const d = differenzaGiorni(oggi, iso);
  if (d === 0) return 'oggi';
  if (d === 1) return 'domani';
  if (d === -1) return 'ieri';
  if (d > 1 && d < 7) return formatoLungo(iso);
  return formatoLungo(iso);
}

/** Come `descriviData` ma con la prima lettera maiuscola. */
export function descriviDataMaiuscola(iso: DataISO, oggi: DataISO): string {
  return maiuscola(descriviData(iso, oggi));
}

export function maiuscolaIniziale(s: string): string {
  return maiuscola(s);
}

/** Numero con unità al singolare o al plurale: `giorni(1)` → «1 giorno». */
export function giorni(n: number): string {
  return n === 1 ? '1 giorno' : `${n} giorni`;
}

/** Minuti da `da` a `a` per due LocalDateTime (`YYYY-MM-DDTHH:mm`), senza passare dal fuso orario. */
export function minutiTra(da: string, a: string): number {
  const toMin = (s: string) => {
    const [anno, mese, giorno] = s.slice(0, 10).split('-').map(Number);
    const ora = Number(s.slice(11, 13) || 0);
    const min = Number(s.slice(14, 16) || 0);
    return Date.UTC(anno, mese - 1, giorno, ora, min) / 60_000;
  };
  return toMin(a) - toMin(da);
}
