import { Candidatura, Contatto } from './api/models';
import { normalizzaAzienda } from './azienda';

export type TipoRisultato = 'azione' | 'azienda' | 'ruolo' | 'contatto';

export interface Risultato {
  id: string;
  tipo: TipoRisultato;
  titolo: string;
  dettaglio: string;
  /** Rotta da aprire; assente per le azioni che aprono un pannello. */
  percorso?: string[];
  comando?: 'nuova-candidatura';
}

interface Azione {
  titolo: string;
  dettaglio: string;
  parole: string;
  percorso?: string[];
  comando?: 'nuova-candidatura';
}

export const AZIONI: readonly Azione[] = [
  { titolo: 'Aggiungi candidatura', dettaglio: 'Apre il pannello di aggiunta rapida', parole: 'nuova aggiungi crea inserisci candidatura', comando: 'nuova-candidatura' },
  { titolo: 'Vai a Oggi', dettaglio: 'Cosa fare adesso', parole: 'oggi da fare home', percorso: ['/oggi'] },
  { titolo: 'Vai a Candidature', dettaglio: 'Elenco e bacheca', parole: 'candidature elenco bacheca', percorso: ['/candidature'] },
  { titolo: 'Vai a Colloqui', dettaglio: 'Agenda, resoconti e domande', parole: 'colloqui agenda domande', percorso: ['/colloqui'] },
  { titolo: 'Vai ad Aziende', dettaglio: 'Le aziende a cui hai scritto', parole: 'aziende', percorso: ['/aziende'] },
  { titolo: 'Vai a Materiali', dettaglio: 'CV e modelli di messaggio', parole: 'materiali cv curriculum modelli messaggi', percorso: ['/materiali'] },
  { titolo: 'Vai a Offerte', dettaglio: 'Confronta le proposte', parole: 'offerte proposte confronto ral', percorso: ['/offerte'] },
  { titolo: 'Vai a Profilo', dettaglio: 'Dati, obiettivi ed esportazione', parole: 'profilo account password obiettivo soglia esporta elimina', percorso: ['/profilo'] },
];

const MAX_PER_GRUPPO = 5;

function punteggio(testo: string, q: string): number {
  const t = normalizzaAzienda(testo);
  if (t === q) return 3;
  if (t.startsWith(q)) return 2;
  if (t.split(' ').some((p) => p.startsWith(q))) return 1.5;
  return t.includes(q) ? 1 : 0;
}

/** Cerca aziende, ruoli e contatti e propone le azioni principali. Con il campo vuoto mostra solo le azioni. */
export function cercaGlobale(testo: string, candidature: readonly Candidatura[], contatti: readonly Contatto[]): Risultato[] {
  const q = normalizzaAzienda(testo);
  const azioni = AZIONI.filter((a) => !q || punteggio(`${a.titolo} ${a.parole}`, q) > 0).map<Risultato>((a) => ({
    id: `azione-${a.titolo}`,
    tipo: 'azione',
    titolo: a.titolo,
    dettaglio: a.dettaglio,
    percorso: a.percorso,
    comando: a.comando,
  }));
  if (!q) return azioni;

  const aziende = new Map<string, { nome: string; n: number }>();
  for (const c of candidature) {
    const k = normalizzaAzienda(c.nomeAzienda);
    const e = aziende.get(k);
    aziende.set(k, { nome: e?.nome ?? c.nomeAzienda.trim(), n: (e?.n ?? 0) + 1 });
  }
  const ris: Risultato[] = [];
  const rankAziende = [...aziende.entries()]
    .map(([k, v]) => ({ k, v, p: punteggio(v.nome, q) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.v.nome.localeCompare(b.v.nome, 'it'))
    .slice(0, MAX_PER_GRUPPO);
  for (const { k, v } of rankAziende) {
    ris.push({ id: `azienda-${k}`, tipo: 'azienda', titolo: v.nome, dettaglio: `${v.n} ${v.n === 1 ? 'candidatura' : 'candidature'}`, percorso: ['/aziende', k] });
  }
  const rankRuoli = candidature
    .map((c) => ({ c, p: punteggio(c.posizioneLavorativa, q) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || b.c.dataCandidatura.localeCompare(a.c.dataCandidatura))
    .slice(0, MAX_PER_GRUPPO);
  for (const { c } of rankRuoli) {
    ris.push({ id: `ruolo-${c.id}`, tipo: 'ruolo', titolo: c.posizioneLavorativa, dettaglio: c.nomeAzienda, percorso: ['/candidature', String(c.id)] });
  }
  const rankContatti = contatti
    .map((c) => ({ c, p: Math.max(punteggio(c.nome, q), punteggio(c.ruolo, q) * 0.8) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p || a.c.nome.localeCompare(b.c.nome, 'it'))
    .slice(0, MAX_PER_GRUPPO);
  for (const { c } of rankContatti) {
    ris.push({ id: `contatto-${c.id}`, tipo: 'contatto', titolo: c.nome, dettaglio: `${c.ruolo ? c.ruolo + ', ' : ''}${c.nomeAzienda}`, percorso: ['/aziende', normalizzaAzienda(c.nomeAzienda)] });
  }
  return [...ris, ...azioni.slice(0, 3)];
}
