import { Candidatura, Cv, Fonte, Modalita, StoricoEvento } from '../../core/api/models';
import {
  aggiungiGiorni,
  chiaveMese,
  DataISO,
  differenzaGiorni,
  inizioSettimana,
  aggiungiMesi,
  primoDelMese,
} from '../../core/date';
import { calcolaPercorso, EsitoPercorso, fermataRaggiunta } from '../../core/percorso';
import { calcolaTasso, percentuale } from '../../core/risposte';
import { FERMATE, FONTE_ETICHETTA, INFO_STATO, MODALITA_ETICHETTA } from '../../core/stati';

export type Periodo = '30' | '90' | '365' | 'tutto';

export interface FiltriAndamento {
  periodo: Periodo;
  modalita: '' | Modalita;
  fonte: '' | Fonte;
}

export type Storici = ReadonlyMap<number, readonly StoricoEvento[]>;

/** Soglie sotto le quali un grafico non ha senso e si spiega invece quanti invii servono. */
export const MINIMI = { ritmo: 3, percorso: 10, tassoNelTempo: 10, tempi: 5, cosaFunziona: 5, segnale: 10, pochiDati: 5 } as const;

export function giorniPeriodo(p: Periodo): number | null {
  return p === 'tutto' ? null : Number(p);
}

/** Candidature nel periodo e con modalità e fonte scelte. */
export function applicaFiltriAndamento(candidature: readonly Candidatura[], f: FiltriAndamento, oggi: DataISO): Candidatura[] {
  const giorni = giorniPeriodo(f.periodo);
  const da = giorni === null ? null : aggiungiGiorni(oggi, -giorni);
  return candidature.filter(
    (c) => (da === null || c.dataCandidatura >= da) && (!f.modalita || c.modalita === f.modalita) && (!f.fonte || c.fonte === f.fonte),
  );
}

export { calcolaTasso, haRisposta, percentuale } from '../../core/risposte';
export type { Tasso } from '../../core/risposte';

/** Mediana; con un numero pari di valori è la media dei due centrali. */
export function mediana(valori: readonly number[]): number | null {
  if (!valori.length) return null;
  const v = [...valori].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export function formatoNumero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

// ---------------------------------------------------------------- segnali

interface Gruppo {
  chiave: string;
  /** «da remoto», «in sede»: segue «le candidature» o «quelle». */
  descrizione: string;
  candidature: Candidatura[];
}

const DESCRIZIONE_FONTE: Record<Fonte, string> = {
  LINKEDIN: 'trovate su LinkedIn',
  INDEED: 'trovate su Indeed',
  SITO_AZIENDA: 'inviate dal sito dell’azienda',
  PASSAPAROLA: 'arrivate per passaparola',
  RECRUITER: 'seguite da un recruiter',
  ALTRO: 'di altra provenienza',
};

const DESCRIZIONE_MODALITA: Record<Modalita, string> = { REMOTO: 'da remoto', IBRIDO: 'ibride', INSEDE: 'in sede' };

function raggruppa<T extends string>(candidature: readonly Candidatura[], chiave: (c: Candidatura) => T | null, descrizione: (k: T) => string): Gruppo[] {
  const mappa = new Map<T, Candidatura[]>();
  for (const c of candidature) {
    const k = chiave(c);
    if (k === null) continue;
    mappa.set(k, [...(mappa.get(k) ?? []), c]);
  }
  return [...mappa.entries()].map(([k, lista]) => ({ chiave: k, descrizione: descrizione(k), candidature: lista }));
}

function volte(rapporto: number): string {
  return rapporto >= 1.9 && rapporto <= 2.1 ? 'il doppio di' : `${formatoNumero(Math.round(rapporto * 10) / 10)} volte più spesso di`;
}

function fraseConfronto(gruppi: Gruppo[], storici: Storici): { frase: string; rapporto: number } | null {
  const idonei = gruppi
    .filter((g) => g.candidature.length >= MINIMI.segnale)
    .map((g) => ({ g, t: calcolaTasso(g.candidature, storici).tasso ?? 0 }));
  if (idonei.length < 2) return null;
  const migliore = idonei.reduce((a, b) => (b.t > a.t ? b : a));
  const peggiore = idonei.filter((x) => x.t > 0).reduce<(typeof idonei)[number] | null>((a, b) => (a === null || b.t < a.t ? b : a), null);
  if (!peggiore || migliore.g === peggiore.g) return null;
  const rapporto = migliore.t / peggiore.t;
  if (rapporto < 1.5) return null;
  // Si descrivono i fatti, mai le cause.
  return {
    rapporto,
    frase: `Finora le candidature ${migliore.g.descrizione} ricevono risposta ${volte(rapporto)} quelle ${peggiore.g.descrizione} (${percentuale(migliore.t)}% contro ${percentuale(peggiore.t)}%).`,
  };
}

/** Da due a quattro frasi calcolate con regole, non con AI. Compaiono solo con almeno 10 candidature per gruppo e differenza di 1,5 volte. */
export function calcolaSegnali(candidature: readonly Candidatura[], storici: Storici, cv: readonly Cv[]): string[] {
  if (!candidature.length) return [];
  const confronti = [
    fraseConfronto(raggruppa(candidature, (c) => c.modalita, (k) => DESCRIZIONE_MODALITA[k]), storici),
    fraseConfronto(raggruppa(candidature, (c) => c.fonte, (k) => DESCRIZIONE_FONTE[k]), storici),
    fraseConfronto(
      raggruppa(candidature, (c) => (c.idCv === null ? null : String(c.idCv)), (k) => `inviate con «${cv.find((v) => String(v.id) === k)?.nome ?? 'un altro CV'}»`),
      storici,
    ),
    fraseConfronto(raggruppa(candidature, (c) => (c.spontanea ? 'spontanea' : 'annuncio'), (k) => (k === 'spontanea' ? 'spontanee' : 'con annuncio')), storici),
  ]
    .filter((x): x is { frase: string; rapporto: number } => x !== null)
    .sort((a, b) => b.rapporto - a.rapporto)
    .slice(0, 3)
    .map((x) => x.frase);

  const t = calcolaTasso(candidature, storici);
  const base = `Hai inviato ${candidature.length} ${candidature.length === 1 ? 'candidatura' : 'candidature'} e il ${percentuale(t.tasso ?? 0)}% ha ricevuto risposta.`;
  const frasi = [base, ...confronti];
  if (frasi.length < 2) {
    const m = tempiPerFase(candidature, storici)[0];
    if (m.mediana !== null && m.casi >= 3) {
      frasi.push(`La prima risposta arriva di solito dopo ${formatoNumero(m.mediana)} giorni (mediana su ${m.casi} risposte).`);
    }
  }
  return frasi;
}

// ------------------------------------------------------------------ ritmo

export interface Settimana {
  inizio: DataISO;
  n: number;
}

/** Invii per settimana (da lunedì), comprese quelle senza invii. */
export function invioPerSettimana(candidature: readonly Candidatura[], oggi: DataISO, periodo: Periodo): Settimana[] {
  if (!candidature.length) return [];
  const giorni = giorniPeriodo(periodo);
  const primo = giorni === null ? candidature.reduce((m, c) => (c.dataCandidatura < m ? c.dataCandidatura : m), oggi) : aggiungiGiorni(oggi, -giorni);
  const conteggi = new Map<DataISO, number>();
  for (const c of candidature) {
    const w = inizioSettimana(c.dataCandidatura);
    conteggi.set(w, (conteggi.get(w) ?? 0) + 1);
  }
  const settimane: Settimana[] = [];
  const ultima = inizioSettimana(oggi);
  for (let w = inizioSettimana(primo); w <= ultima; w = aggiungiGiorni(w, 7)) settimane.push({ inizio: w, n: conteggi.get(w) ?? 0 });
  return settimane;
}

// --------------------------------------------------------------- percorso

export const NODI_TERMINALI: Record<Exclude<EsitoPercorso, 'conclusa'>, string> = {
  'in-corso': 'Ancora in corso',
  rifiutata: 'Rifiutate dall’azienda',
  ritirata: 'Ritirate da te',
  'proposta-rifiutata': 'Proposte rifiutate',
  'senza-risposta': 'Senza risposta',
};

export interface Collegamento {
  da: string;
  a: string;
  valore: number;
}

export interface Conversione {
  da: string;
  a: string;
  /** Da 0 a 1; `null` se nessuna candidatura ha raggiunto la fermata di partenza. */
  tasso: number | null;
  su: number;
}

export interface PercorsoAggregato {
  totale: number;
  /** Candidature che hanno raggiunto almeno la fermata `i`. */
  raggiunte: number[];
  collegamenti: Collegamento[];
  conversioni: Conversione[];
}

export const NOME_FERMATA = ['Inviate', ...FERMATE.slice(1).map((f) => f.etichetta)];

export function calcolaPercorsoAggregato(candidature: readonly Candidatura[], storici: Storici): PercorsoAggregato {
  const raggiunte = FERMATE.map(() => 0);
  const terminali = new Map<string, number>();
  for (const c of candidature) {
    const st = storici.get(c.id);
    const r = fermataRaggiunta(c.statoCandidatura, st);
    for (let i = 0; i <= r; i++) raggiunte[i]++;
    const esito = calcolaPercorso(c.statoCandidatura, st, c.dataCandidatura).esito;
    if (esito !== 'conclusa') {
      const chiave = `${r}|${esito}`;
      terminali.set(chiave, (terminali.get(chiave) ?? 0) + 1);
    }
  }
  const collegamenti: Collegamento[] = [];
  for (let i = 0; i < FERMATE.length - 1; i++) {
    if (raggiunte[i + 1] > 0) collegamenti.push({ da: NOME_FERMATA[i], a: NOME_FERMATA[i + 1], valore: raggiunte[i + 1] });
  }
  for (const [chiave, valore] of terminali) {
    const [r, esito] = chiave.split('|');
    collegamenti.push({ da: NOME_FERMATA[Number(r)], a: NODI_TERMINALI[esito as keyof typeof NODI_TERMINALI], valore });
  }
  const conversioni = FERMATE.slice(0, -1).map<Conversione>((_, i) => ({
    da: NOME_FERMATA[i],
    a: NOME_FERMATA[i + 1],
    tasso: raggiunte[i] ? raggiunte[i + 1] / raggiunte[i] : null,
    su: raggiunte[i],
  }));
  return { totale: candidature.length, raggiunte, collegamenti, conversioni };
}

/** Quota delle inviate arrivate almeno al colloquio conoscitivo, da 0 a 1; `null` se non ci sono invii. */
export function tassoColloquio(p: PercorsoAggregato): number | null {
  return p.totale ? (p.raggiunte[1] ?? 0) / p.totale : null;
}

// ------------------------------------------------------ tasso nel tempo

export interface PuntoMensile {
  mese: string;
  n: number;
  risposte: number;
  tasso: number | null;
}

/**
 * Tasso di risposta per mese di invio. Le candidature inviate da meno giorni della soglia
 * di attesa sono escluse: non hanno ancora avuto il tempo di ricevere risposta, e
 * altrimenti gli ultimi mesi sembrerebbero sempre in calo.
 */
export function tassoMensile(candidature: readonly Candidatura[], storici: Storici, oggi: DataISO, sogliaAttesa: number): PuntoMensile[] {
  const idonee = candidature.filter((c) => differenzaGiorni(c.dataCandidatura, oggi) >= sogliaAttesa);
  if (!idonee.length) return [];
  const per = new Map<string, Candidatura[]>();
  for (const c of idonee) {
    const k = chiaveMese(c.dataCandidatura);
    per.set(k, [...(per.get(k) ?? []), c]);
  }
  const mesi = [...per.keys()].sort();
  const punti: PuntoMensile[] = [];
  for (let m = `${mesi[0]}-01`; chiaveMese(m) <= mesi[mesi.length - 1]; m = aggiungiMesi(primoDelMese(m), 1)) {
    const lista = per.get(chiaveMese(m)) ?? [];
    const t = calcolaTasso(lista, storici);
    punti.push({ mese: chiaveMese(m), n: t.n, risposte: t.risposte, tasso: t.tasso });
  }
  return punti;
}

// ------------------------------------------------------------------ tempi

export interface TempoFase {
  fase: string;
  /** Giorni, mediana. `null` se non ci sono casi. */
  mediana: number | null;
  casi: number;
}

function primaData(eventi: readonly StoricoEvento[], fermata: number): DataISO | null {
  const ordinati = [...eventi].sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
  const e = ordinati.find((x) => INFO_STATO[x.stato].fermata === fermata && INFO_STATO[x.stato].tipo !== 'uscita');
  return e ? e.dataEvento : null;
}

/** Mediana dei giorni per fase, con il numero di casi. Niente medie. */
export function tempiPerFase(candidature: readonly Candidatura[], storici: Storici): TempoFase[] {
  const risposta: number[] = [];
  const passaggi: number[][] = [[], [], []];
  for (const c of candidature) {
    const st = storici.get(c.id) ?? [];
    const ordinati = [...st].sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
    const prima = ordinati.find((e) => e.stato !== 'IN_FASE_DI_ATTESA' && e.stato !== 'GHOSTING_O_SENZA_RISPOSTA');
    if (prima) risposta.push(differenzaGiorni(c.dataCandidatura, prima.dataEvento));
    for (let i = 0; i < 3; i++) {
      const da = primaData(st, i + 1);
      const a = primaData(st, i + 2);
      if (da && a) passaggi[i].push(differenzaGiorni(da, a));
    }
  }
  const fase = (nome: string, v: number[]): TempoFase => ({ fase: nome, mediana: mediana(v), casi: v.length });
  return [
    fase('Dall’invio alla prima risposta', risposta),
    fase('Dal conoscitivo al tecnico 1', passaggi[0]),
    fase('Dal tecnico 1 al tecnico 2', passaggi[1]),
    fase('Dal tecnico 2 alla proposta', passaggi[2]),
  ];
}

// -------------------------------------------------------- cosa funziona

export interface Barra {
  etichetta: string;
  n: number;
  risposte: number;
  tasso: number;
  /** Sotto le cinque candidature il valore è poco affidabile. */
  pochiDati: boolean;
}

function barra(etichetta: string, lista: readonly Candidatura[], storici: Storici): Barra {
  const t = calcolaTasso(lista, storici);
  return { etichetta, n: t.n, risposte: t.risposte, tasso: t.tasso ?? 0, pochiDati: t.n < MINIMI.pochiDati };
}

function perChiave(candidature: readonly Candidatura[], storici: Storici, chiavi: readonly string[], etichetta: (k: string) => string, chiave: (c: Candidatura) => string): Barra[] {
  return chiavi
    .map((k) => barra(etichetta(k), candidature.filter((c) => chiave(c) === k), storici))
    .filter((b) => b.n > 0);
}

export function tassoPerModalita(candidature: readonly Candidatura[], storici: Storici): Barra[] {
  return perChiave(candidature, storici, ['REMOTO', 'IBRIDO', 'INSEDE'], (k) => MODALITA_ETICHETTA[k as Modalita], (c) => c.modalita);
}

export function tassoPerFonte(candidature: readonly Candidatura[], storici: Storici): Barra[] {
  const chiavi = Object.keys(FONTE_ETICHETTA);
  return perChiave(candidature, storici, chiavi, (k) => FONTE_ETICHETTA[k as Fonte], (c) => c.fonte);
}

/** Per versione del CV, in ordine di creazione; le candidature senza CV indicato vanno in «Altre». */
export function tassoPerCv(candidature: readonly Candidatura[], storici: Storici, cv: readonly Cv[]): Barra[] {
  const ordinati = [...cv].sort((a, b) => a.id - b.id);
  const visibili = ordinati.slice(0, 5);
  const barre = visibili.map((v) => barra(v.nome, candidature.filter((c) => c.idCv === v.id), storici)).filter((b) => b.n > 0);
  const restanti = candidature.filter((c) => c.idCv === null || !visibili.some((v) => v.id === c.idCv));
  if (restanti.length) barre.push(barra('Altre', restanti, storici));
  return barre;
}

/** Le cinque città con più candidature, poi «Altre». */
export function tassoPerCitta(candidature: readonly Candidatura[], storici: Storici): Barra[] {
  const per = new Map<string, Candidatura[]>();
  for (const c of candidature) per.set(c.citta.nomeCitta, [...(per.get(c.citta.nomeCitta) ?? []), c]);
  const ordinate = [...per.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], 'it'));
  const barre = ordinate.slice(0, 5).map(([nome, lista]) => barra(nome, lista, storici));
  const altre = ordinate.slice(5).flatMap(([, lista]) => lista);
  if (altre.length) barre.push(barra('Altre', altre, storici));
  return barre;
}

// --------------------------------------------------------------- costanza

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

/** Messaggio per i grafici con troppi pochi dati: spiega quanti invii servono. */
export function messaggioPochiDati(minimo: number, attuali: number, cosa: string): string | null {
  if (attuali >= minimo) return null;
  const mancano = minimo - attuali;
  return `Per vedere ${cosa} servono almeno ${minimo} invii. Finora ne hai ${attuali}: ne ${mancano === 1 ? 'manca 1' : `mancano ${mancano}`}.`;
}
