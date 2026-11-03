import { Candidatura, Colloquio, Offerta } from './api/models';
import {
  DataISO,
  descriviData,
  differenzaGiorni,
  formatoBreve,
  formatoCompleto,
  giorni,
  minutiTra,
  soloData,
  soloOra,
} from './date';
import { eInCorso } from './stati';

export type TipoDaFare = 'colloquio' | 'offerta' | 'azione' | 'attesa';

export interface VoceDaFare {
  chiave: string;
  tipo: TipoDaFare;
  idCandidatura: number;
  /** Per i colloqui e le offerte: id dell'elemento collegato. */
  idCollegato: number | null;
  titolo: string;
  dettaglio: string;
}

export interface IngressiDaFare {
  candidature: readonly Candidatura[];
  colloqui: readonly Colloquio[];
  offerte: readonly Offerta[];
  oggi: DataISO;
  /** LocalDateTime corrente. */
  adesso: string;
  sogliaAttesa: number;
}

const TIPO_TESTO: Record<Colloquio['tipo'], string> = {
  CONOSCITIVO: 'colloquio conoscitivo',
  TECNICO_1: 'colloquio tecnico',
  TECNICO_2: 'colloquio tecnico',
  ALTRO: 'colloquio',
};

/**
 * Coda di Oggi. Priorità: colloqui entro 48 ore, offerte in scadenza entro 7 giorni,
 * prossime azioni scadute o di oggi, candidature in attesa da troppo.
 */
export function costruisciDaFare(x: IngressiDaFare): VoceDaFare[] {
  const perId = new Map(x.candidature.map((c) => [c.id, c]));
  const voci: VoceDaFare[] = [];

  const colloqui = x.colloqui
    .filter((c) => {
      const min = minutiTra(x.adesso, c.dataOra);
      return min >= 0 && min <= 48 * 60 && perId.has(c.idCandidatura);
    })
    .sort((a, b) => a.dataOra.localeCompare(b.dataOra));
  for (const c of colloqui) {
    const cand = perId.get(c.idCandidatura)!;
    voci.push({
      chiave: `colloquio-${c.id}`,
      tipo: 'colloquio',
      idCandidatura: cand.id,
      idCollegato: c.id,
      titolo: `Prepara il ${TIPO_TESTO[c.tipo]} con ${cand.nomeAzienda}`,
      dettaglio: `${primaMaiuscola(descriviData(soloData(c.dataOra), x.oggi))} alle ${soloOra(c.dataOra)}, ${cand.posizioneLavorativa}`,
    });
  }

  const offerte = x.offerte
    .filter((o) => {
      if (!o.scadenza) return false;
      const d = differenzaGiorni(x.oggi, o.scadenza);
      const cand = perId.get(o.idCandidatura);
      return d >= 0 && d <= 7 && !!cand && eInCorso(cand.statoCandidatura);
    })
    .sort((a, b) => a.scadenza!.localeCompare(b.scadenza!));
  for (const o of offerte) {
    const cand = perId.get(o.idCandidatura)!;
    const d = differenzaGiorni(x.oggi, o.scadenza!);
    voci.push({
      chiave: `offerta-${o.id}`,
      tipo: 'offerta',
      idCandidatura: cand.id,
      idCollegato: o.id,
      titolo: `Decidi sulla proposta di ${cand.nomeAzienda}`,
      dettaglio: d === 0 ? 'Scade oggi' : d === 1 ? 'Scade domani' : `Scade ${descriviData(o.scadenza!, x.oggi)}`,
    });
  }

  const azioni = x.candidature
    .filter((c) => c.prossimaAzioneTesto && c.prossimaAzioneData && c.prossimaAzioneData <= x.oggi && eInCorso(c.statoCandidatura))
    .sort((a, b) => a.prossimaAzioneData!.localeCompare(b.prossimaAzioneData!));
  for (const c of azioni) {
    const ritardo = differenzaGiorni(c.prossimaAzioneData!, x.oggi);
    voci.push({
      chiave: `azione-${c.id}`,
      tipo: 'azione',
      idCandidatura: c.id,
      idCollegato: null,
      titolo: c.prossimaAzioneTesto!,
      dettaglio:
        ritardo === 0
          ? 'L’avevi fissata per oggi'
          : `Era per il ${formatoBreve(c.prossimaAzioneData!)}, ${giorni(ritardo)} fa`,
    });
  }

  const attese = x.candidature
    .filter((c) => c.statoCandidatura === 'IN_FASE_DI_ATTESA' && differenzaGiorni(c.dataCandidatura, x.oggi) > x.sogliaAttesa)
    .sort((a, b) => a.dataCandidatura.localeCompare(b.dataCandidatura));
  for (const c of attese) {
    voci.push({
      chiave: `attesa-${c.id}`,
      tipo: 'attesa',
      idCandidatura: c.id,
      idCollegato: null,
      titolo: `${c.nomeAzienda} non risponde da ${giorni(differenzaGiorni(c.dataCandidatura, x.oggi))}`,
      dettaglio: `${c.posizioneLavorativa}, inviata il ${formatoCompleto(c.dataCandidatura).replace(/ \d{4}$/, '')}`,
    });
  }

  return voci;
}

function primaMaiuscola(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
