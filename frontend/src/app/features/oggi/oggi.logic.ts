import { Candidatura, Colloquio } from '../../core/api/models';
import { DataISO, differenzaGiorni, fineSettimana, inizioSettimana, minutiTra } from '../../core/date';
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
