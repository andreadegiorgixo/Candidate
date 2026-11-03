import { Candidatura, Colloquio, TipoColloquio } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { DataISO, minutiTra, soloData } from '../../core/date';

export interface Suddivisione {
  inProgramma: Colloquio[];
  conclusi: Colloquio[];
  /** Conclusi per cui manca ancora il resoconto. */
  senzaResoconto: Colloquio[];
}

/** Divide i colloqui in futuri (dal più vicino) e conclusi (dal più recente). */
export function suddividiColloqui(colloqui: readonly Colloquio[], adesso: string): Suddivisione {
  const futuri = colloqui.filter((c) => minutiTra(adesso, c.dataOra) >= 0).sort((a, b) => a.dataOra.localeCompare(b.dataOra));
  const conclusi = colloqui.filter((c) => minutiTra(adesso, c.dataOra) < 0).sort((a, b) => b.dataOra.localeCompare(a.dataOra));
  return { inProgramma: futuri, conclusi, senzaResoconto: conclusi.filter((c) => c.voto === null) };
}

export function avanzamentoChecklist(c: Colloquio): { fatte: number; totale: number } {
  return { fatte: c.checklist.filter((v) => v.fatto).length, totale: c.checklist.length };
}

export interface DomandaRicevuta {
  /** Testo come scritto la prima volta. */
  testo: string;
  /** Quante volte è tornata, in colloqui diversi. */
  volte: number;
  tipi: TipoColloquio[];
  aziende: string[];
  ultimaData: DataISO;
}

function chiave(testo: string): string {
  return normalizzaAzienda(testo).replace(/[?!.,;:]+$/g, '').trim();
}

/** Archivio delle domande: quelle uguali (ignorando maiuscole e punteggiatura) si raggruppano. */
export function raccogliDomande(colloqui: readonly Colloquio[], candidature: readonly Candidatura[]): DomandaRicevuta[] {
  const aziende = new Map(candidature.map((c) => [c.id, c.nomeAzienda]));
  const per = new Map<string, DomandaRicevuta>();
  for (const c of [...colloqui].sort((a, b) => a.dataOra.localeCompare(b.dataOra))) {
    const viste = new Set<string>();
    for (const d of c.domande) {
      const k = chiave(d);
      if (!k || viste.has(k)) continue;
      viste.add(k);
      const esistente = per.get(k);
      const azienda = aziende.get(c.idCandidatura) ?? 'Azienda eliminata';
      if (esistente) {
        esistente.volte++;
        if (!esistente.tipi.includes(c.tipo)) esistente.tipi.push(c.tipo);
        if (!esistente.aziende.includes(azienda)) esistente.aziende.push(azienda);
        esistente.ultimaData = soloData(c.dataOra);
      } else {
        per.set(k, { testo: d.trim(), volte: 1, tipi: [c.tipo], aziende: [azienda], ultimaData: soloData(c.dataOra) });
      }
    }
  }
  return [...per.values()].sort((a, b) => b.volte - a.volte || b.ultimaData.localeCompare(a.ultimaData) || a.testo.localeCompare(b.testo, 'it'));
}

export function filtraDomande(domande: readonly DomandaRicevuta[], q: string, tipo: '' | TipoColloquio): DomandaRicevuta[] {
  const cerca = normalizzaAzienda(q);
  return domande.filter((d) => (!tipo || d.tipi.includes(tipo)) && (!cerca || normalizzaAzienda(d.testo).includes(cerca)));
}
