import { StoricoEvento, StatoCandidatura } from './api/models';
import { DataISO } from './date';
import { FERMATE, INFO_STATO } from './stati';

export type EsitoPercorso = 'in-corso' | 'conclusa' | 'rifiutata' | 'ritirata' | 'proposta-rifiutata' | 'senza-risposta';

export type StatoPasso = 'raggiunto' | 'corrente' | 'futuro' | 'interrotto';

export interface PassoPercorso {
  indice: number;
  etichetta: string;
  stato: StatoPasso;
  /** Data in cui la fermata è stata raggiunta, se nota. */
  data: DataISO | null;
}

export interface Percorso {
  passi: PassoPercorso[];
  /** Ultima fermata raggiunta. */
  raggiunta: number;
  esito: EsitoPercorso;
}

function esitoDi(stato: StatoCandidatura): EsitoPercorso {
  switch (stato) {
    case 'ASSUNZIONE_COMPLETATA':
      return 'conclusa';
    case 'RIFIUTATO_DA_RECRUITER':
      return 'rifiutata';
    case 'RIFIUTATO_DAL_CANDIDATO':
      return 'ritirata';
    case 'PROPOSTA_LAVORATIVA_RIFIUTATA':
      return 'proposta-rifiutata';
    case 'GHOSTING_O_SENZA_RISPOSTA':
      return 'senza-risposta';
    default:
      return 'in-corso';
  }
}

function ordinaPerData(storico: readonly StoricoEvento[]): StoricoEvento[] {
  // `sort` è stabile: a parità di data resta l'ordine del backend.
  return [...storico].sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
}

/**
 * Ultima fermata raggiunta. Per gli stati in corso e per la proposta rifiutata
 * è quella dello stato; per le altre uscite è l'ultima secondo lo storico.
 */
export function fermataRaggiunta(stato: StatoCandidatura, storico?: readonly StoricoEvento[]): number {
  const diretta = INFO_STATO[stato].fermata;
  if (diretta !== null) return diretta;
  if (!storico?.length) return 0;
  let ultima = 0;
  for (const e of ordinaPerData(storico)) {
    const f = INFO_STATO[e.stato].fermata;
    if (f !== null) ultima = f;
  }
  return ultima;
}

export function calcolaPercorso(
  stato: StatoCandidatura,
  storico: readonly StoricoEvento[] | undefined,
  dataCandidatura: DataISO,
): Percorso {
  const esito = esitoDi(stato);
  const raggiunta = fermataRaggiunta(stato, storico);
  const date = new Map<number, DataISO>([[0, dataCandidatura]]);
  for (const e of ordinaPerData(storico ?? [])) {
    const f = INFO_STATO[e.stato].fermata;
    if (f !== null && !date.has(f)) date.set(f, e.dataEvento);
  }
  const passi = FERMATE.map<PassoPercorso>((fermata, indice) => {
    let s: StatoPasso;
    if (indice < raggiunta) s = 'raggiunto';
    else if (indice > raggiunta) s = 'futuro';
    else if (esito === 'in-corso') s = 'corrente';
    else if (esito === 'conclusa') s = 'raggiunto';
    else s = 'interrotto';
    return { indice, etichetta: fermata.etichetta, stato: s, data: date.get(indice) ?? null };
  });
  return { passi, raggiunta, esito };
}
