import { Candidatura, Colloquio, StatoCandidatura, StoricoEvento } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { DataISO, soloData } from '../../core/date';
import { etichettaStato } from '../../core/stati';

export interface Azienda {
  /** Chiave di raggruppamento: ignora maiuscole, accenti e spazi. */
  chiave: string;
  nome: string;
  candidature: Candidatura[];
  ultimoStato: StatoCandidatura;
  /** Data dell'ultimo evento noto: storico, colloqui già avvenuti o invio. */
  ultimoContatto: DataISO;
}

type Storici = ReadonlyMap<number, readonly StoricoEvento[]>;

/** Raggruppa le candidature per azienda. Il nome mostrato è quello della candidatura più recente. */
export function raggruppaAziende(candidature: readonly Candidatura[], storici: Storici, colloqui: readonly Colloquio[], oggi: DataISO): Azienda[] {
  const per = new Map<string, Candidatura[]>();
  for (const c of candidature) {
    const k = normalizzaAzienda(c.nomeAzienda);
    per.set(k, [...(per.get(k) ?? []), c]);
  }
  return [...per.entries()]
    .map(([chiave, lista]) => {
      const ordinate = [...lista].sort((a, b) => b.dataCandidatura.localeCompare(a.dataCandidatura) || b.id - a.id);
      const date = ordinate.flatMap((c) => [
        c.dataCandidatura,
        ...(storici.get(c.id) ?? []).map((e) => e.dataEvento),
        ...colloqui.filter((k2) => k2.idCandidatura === c.id && soloData(k2.dataOra) <= oggi).map((k2) => soloData(k2.dataOra)),
      ]);
      return {
        chiave,
        nome: ordinate[0].nomeAzienda.trim(),
        candidature: ordinate,
        ultimoStato: ordinate[0].statoCandidatura,
        ultimoContatto: date.reduce((m, d) => (d > m ? d : m), ordinate[0].dataCandidatura),
      };
    })
    .sort((a, b) => b.ultimoContatto.localeCompare(a.ultimoContatto) || a.nome.localeCompare(b.nome, 'it'));
}

export interface EventoCronologia {
  data: DataISO;
  testo: string;
  idCandidatura: number;
}

/** Cronologia dell'azienda: cambi di stato e colloqui di tutte le sue candidature, dal più recente. */
export function cronologiaAzienda(candidature: readonly Candidatura[], storici: Storici, colloqui: readonly Colloquio[], oggi: DataISO): EventoCronologia[] {
  const eventi: EventoCronologia[] = [];
  for (const c of candidature) {
    const st = storici.get(c.id);
    if (st?.length) {
      for (const e of st) {
        eventi.push({
          data: e.dataEvento,
          idCandidatura: c.id,
          testo: e.stato === 'IN_FASE_DI_ATTESA' ? `Candidatura inviata per ${c.posizioneLavorativa}` : `${c.posizioneLavorativa}: ${etichettaStato(e.stato)}`,
        });
      }
    } else {
      eventi.push({ data: c.dataCandidatura, idCandidatura: c.id, testo: `Candidatura inviata per ${c.posizioneLavorativa}` });
    }
    for (const k of colloqui.filter((x) => x.idCandidatura === c.id && soloData(x.dataOra) <= oggi)) {
      eventi.push({ data: soloData(k.dataOra), idCandidatura: c.id, testo: `Colloquio per ${c.posizioneLavorativa}` });
    }
  }
  return eventi.sort((a, b) => b.data.localeCompare(a.data));
}
