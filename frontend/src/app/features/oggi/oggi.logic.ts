import { Candidatura, Colloquio } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { aggiungiGiorni, DataISO, differenzaGiorni, fineSettimana, giorni, inizioSettimana, minutiTra } from '../../core/date';
import { calcolaTasso, percentuale } from '../../core/risposte';
import { FERMATE, INFO_STATO } from '../../core/stati';
import type { RiepilogoUscite } from '../../shared/percorso/linea-banda';

/** Candidature per fermata: quelle in corso più le assunzioni completate sull'ultima fermata. */
export function contaPerFermata(candidature: readonly Candidatura[]): number[] {
  const conteggi = FERMATE.map(() => 0);
  for (const c of candidature) {
    const info = INFO_STATO[c.statoCandidatura];
    if (info.tipo !== 'uscita' && info.fermata !== null) conteggi[info.fermata]++;
  }
  return conteggi;
}

/** Candidature ancora aperte: in corso, senza contare le assunzioni già completate. */
export function contaInCorso(candidature: readonly Candidatura[]): number {
  return candidature.filter((c) => INFO_STATO[c.statoCandidatura].tipo === 'in-corso').length;
}

export function riepilogoUscite(candidature: readonly Candidatura[]): RiepilogoUscite {
  const r: RiepilogoUscite = { rifiutate: 0, ritirate: 0, propostaRifiutata: 0, senzaRisposta: 0 };
  for (const c of candidature) {
    switch (c.statoCandidatura) {
      case 'RIFIUTATO_DA_RECRUITER':
        r.rifiutate++;
        break;
      case 'RIFIUTATO_DAL_CANDIDATO':
        r.ritirate++;
        break;
      case 'PROPOSTA_LAVORATIVA_RIFIUTATA':
        r.propostaRifiutata++;
        break;
      case 'GHOSTING_O_SENZA_RISPOSTA':
        r.senzaRisposta++;
        break;
    }
  }
  return r;
}

export function titoloOggi(cose: number): string {
  if (cose === 0) return 'Oggi non hai niente in sospeso';
  return cose === 1 ? 'Oggi hai 1 cosa da fare' : `Oggi hai ${cose} cose da fare`;
}

export interface Settimana {
  inviate: number;
  obiettivo: number;
  /** Quante delle dieci tacche sono piene, in proporzione all'obiettivo. */
  tacche: number;
  mancano: number;
  /** Giorni che restano fino a domenica compresa. */
  giorniRimasti: number;
}

/** Invii della settimana in corso (da lunedì a domenica) rispetto all'obiettivo. */
export function invioSettimana(candidature: readonly Candidatura[], oggi: DataISO, obiettivo: number): Settimana {
  const da = inizioSettimana(oggi);
  const a = fineSettimana(oggi);
  const inviate = candidature.filter((c) => c.dataCandidatura >= da && c.dataCandidatura <= a).length;
  const tacche = obiettivo > 0 ? Math.round((Math.min(inviate, obiettivo) / obiettivo) * 10) : 0;
  return {
    inviate,
    obiettivo,
    tacche,
    mancano: Math.max(0, obiettivo - inviate),
    giorniRimasti: differenzaGiorni(oggi, a) + 1,
  };
}

/** I prossimi colloqui, dal più vicino; quelli già passati restano fuori. */
export function prossimiColloqui(colloqui: readonly Colloquio[], adesso: string, quanti = 3): Colloquio[] {
  return colloqui
    .filter((c) => minutiTra(adesso, c.dataOra) >= 0)
    .sort((a, b) => a.dataOra.localeCompare(b.dataOra))
    .slice(0, quanti);
}

/** Giorni del periodo di «Inviate»: gli stessi del filtro «Ultimi 30 giorni» di Andamento, così i numeri coincidono. */
const GIORNI_PERIODO = 30;

/** Sotto questo numero di candidature la percentuale non è affidabile e non si mostra (come `pochiDati` di Andamento). */
const POCHI_DATI = 5;

export interface Riquadro {
  etichetta: string;
  /** Il numero o la frase grande: «7», «2 su 7». */
  valore: string;
  /** Riga sotto il valore; vuota se non c'è niente da dire. */
  sotto: string;
}

export interface RiepilogoAndamento {
  inviate: Riquadro;
  risposte: Riquadro;
  colloqui: Riquadro;
}

export interface DatiRiepilogo {
  candidature: readonly Candidatura[];
  colloqui: readonly Colloquio[];
  oggi: DataISO;
  adesso: string;
  sogliaAttesa: number;
}

/** Il confronto con i 30 giorni prima; `null` se l'account è troppo recente per averne. */
function confrontoMesePrima(corrente: number, precedente: number, esistonoPiuVecchie: boolean): string | null {
  if (precedente === 0 && !esistonoPiuVecchie) return null;
  if (corrente === precedente) return 'Come il mese prima';
  const diff = Math.abs(corrente - precedente);
  return `${diff} ${corrente > precedente ? 'in più' : 'in meno'} del mese prima`;
}

/**
 * I tre riquadri di «Andamento in breve», con i testi già pronti.
 *
 * Le risposte sono una stima prudente: Oggi non carica lo storico (costerebbe una richiesta per candidatura),
 * quindi `calcolaTasso` riceve storici vuoti. Senza storico una candidatura in «Senza risposta» conta sempre
 * come senza risposta: l'unico errore è per chi aveva già risposto e poi è passato a «Senza risposta»,
 * che qui non viene contato tra le risposte. Il numero può solo essere più basso di quello vero.
 * Le candidature in attesa inviate da meno di `sogliaAttesa` giorni restano fuori
 * dal totale: non hanno ancora avuto il tempo di rispondere.
 */
export function riepilogoAndamento(d: DatiRiepilogo): RiepilogoAndamento {
  // Inviate negli ultimi 30 giorni e confronto con i 30 prima (da oggi-60 incluso a oggi-30 escluso).
  const daCorrente = aggiungiGiorni(d.oggi, -GIORNI_PERIODO);
  const daPrecedente = aggiungiGiorni(d.oggi, -2 * GIORNI_PERIODO);
  const corrente = d.candidature.filter((c) => c.dataCandidatura >= daCorrente).length;
  const precedente = d.candidature.filter((c) => c.dataCandidatura >= daPrecedente && c.dataCandidatura < daCorrente).length;
  const piuVecchie = d.candidature.some((c) => c.dataCandidatura < daPrecedente);

  // Risposte, senza contare le attese troppo recenti per avere una risposta.
  const considerate = d.candidature.filter(
    (c) => !(c.statoCandidatura === 'IN_FASE_DI_ATTESA' && differenzaGiorni(c.dataCandidatura, d.oggi) <= d.sogliaAttesa),
  );
  const tasso = calcolaTasso(considerate, new Map());
  const periodoAttesa = `inviate da più di ${giorni(d.sogliaAttesa)}`;
  const sottoRisposte =
    tasso.n === 0
      ? `Nessuna candidatura inviata da più di ${giorni(d.sogliaAttesa)}`
      : tasso.n >= POCHI_DATI
        ? `${percentuale(tasso.risposte / tasso.n)}%, tra quelle ${periodoAttesa}`
        : `Tra quelle ${periodoAttesa}`;

  // Colloqui già svolti e aziende distinte (le candidature dello stesso nome contano una volta).
  const nomi = new Map(d.candidature.map((c) => [c.id, normalizzaAzienda(c.nomeAzienda)]));
  const fatti = d.colloqui.filter((k) => minutiTra(d.adesso, k.dataOra) < 0);
  const aziende = new Set(fatti.map((k) => nomi.get(k.idCandidatura) ?? `candidatura-${k.idCandidatura}`)).size;

  return {
    inviate: {
      etichetta: 'Inviate negli ultimi 30 giorni',
      valore: String(corrente),
      sotto: confrontoMesePrima(corrente, precedente, piuVecchie) ?? '',
    },
    risposte: {
      etichetta: 'Risposte',
      valore: tasso.n === 0 ? '0' : `${tasso.risposte} su ${tasso.n}`,
      sotto: sottoRisposte,
    },
    colloqui: {
      etichetta: 'Colloqui fatti',
      valore: String(fatti.length),
      sotto: fatti.length === 0 ? 'Ancora nessuno' : `${fatti.length === 1 ? 'colloquio' : 'colloqui'} con ${aziende === 1 ? '1 azienda' : `${aziende} aziende`}`,
    },
  };
}
