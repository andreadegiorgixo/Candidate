import { Candidatura } from '../../core/api/models';
import { aggiungiGiorni, DataISO, inizioSettimana } from '../../core/date';

/** Giorni coperti dal grafico del ritmo. */
export const GIORNI_RITMO = 90;

/** Sotto questo numero di invii nel periodo il grafico del ritmo non ha senso. */
export const MINIMO_RITMO = 3;

export interface Settimana {
  inizio: DataISO;
  n: number;
}

/** Candidature inviate negli ultimi `giorni` giorni, oggi compreso. */
export function inviateNegliUltimi(candidature: readonly Candidatura[], oggi: DataISO, giorni: number): Candidatura[] {
  const da = aggiungiGiorni(oggi, -giorni);
  return candidature.filter((c) => c.dataCandidatura >= da);
}

/** Invii per settimana (da lunedì) negli ultimi `giorni` giorni, comprese le settimane senza invii. */
export function invioPerSettimana(candidature: readonly Candidatura[], oggi: DataISO, giorni: number): Settimana[] {
  if (!candidature.length) return [];
  const conteggi = new Map<DataISO, number>();
  for (const c of candidature) {
    const w = inizioSettimana(c.dataCandidatura);
    conteggi.set(w, (conteggi.get(w) ?? 0) + 1);
  }
  const settimane: Settimana[] = [];
  const ultima = inizioSettimana(oggi);
  for (let w = inizioSettimana(aggiungiGiorni(oggi, -giorni)); w <= ultima; w = aggiungiGiorni(w, 7)) settimane.push({ inizio: w, n: conteggi.get(w) ?? 0 });
  return settimane;
}

export interface Giorno {
  data: DataISO;
  n: number;
}

/** Invii per giorno nell'intervallo, compresi i giorni vuoti. */
export function invioPerGiorno(candidature: readonly Candidatura[], da: DataISO, a: DataISO): Giorno[] {
  const conteggi = new Map<DataISO, number>();
  for (const c of candidature) conteggi.set(c.dataCandidatura, (conteggi.get(c.dataCandidatura) ?? 0) + 1);
  const giorni: Giorno[] = [];
  for (let d = da; d <= a; d = aggiungiGiorni(d, 1)) giorni.push({ data: d, n: conteggi.get(d) ?? 0 });
  return giorni;
}

/** Primo giorno del calendario: ultime `settimane` settimane. */
export function inizioCalendario(oggi: DataISO, settimane: number): DataISO {
  return aggiungiGiorni(oggi, -(settimane * 7 - 1));
}

/** Messaggio per i grafici con troppi pochi dati: spiega quanti invii servono. */
export function messaggioPochiDati(minimo: number, attuali: number, cosa: string): string | null {
  if (attuali >= minimo) return null;
  const mancano = minimo - attuali;
  return `Per vedere ${cosa} servono almeno ${minimo} invii. Finora ne hai ${attuali}: ne ${mancano === 1 ? 'manca 1' : `mancano ${mancano}`}.`;
}
