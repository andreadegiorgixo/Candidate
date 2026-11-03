import { Fonte, Modalita, StatoCandidatura, TipoColloquio, TipoModello } from './api/models';

/**
 * Unico punto in cui gli enum del backend diventano testo e fermata.
 */

export type TipoStato = 'in-corso' | 'conclusa' | 'uscita';
export type GruppoStato = 'attesa' | 'colloqui' | 'proposta' | 'assunzione' | 'rifiutata' | 'senza-risposta';

export interface InfoStato {
  etichetta: string;
  /** Indice della fermata sulla linea; `null` per le uscite che dipendono dallo storico. */
  fermata: number | null;
  tipo: TipoStato;
  gruppo: GruppoStato;
}

export interface Fermata {
  etichetta: string;
  /** Stato assegnato quando una candidatura viene spostata su questa fermata. */
  stato: StatoCandidatura;
}

export const FERMATE: readonly Fermata[] = [
  { etichetta: 'In attesa', stato: 'IN_FASE_DI_ATTESA' },
  { etichetta: 'Conoscitivo', stato: 'FASE_DI_COLLOQUIO_CONOSCITIVO' },
  { etichetta: 'Tecnico 1', stato: 'FASE_DI_COLLOQUIO_TECNICO_1' },
  { etichetta: 'Tecnico 2', stato: 'FASE_DI_COLLOQUIO_TECNICO_2' },
  { etichetta: 'Proposta', stato: 'PROPOSTA_LAVORATIVA_RICEVUTA' },
  { etichetta: 'Assunzione', stato: 'ASSUNZIONE_COMPLETATA' },
];

export const INFO_STATO: Readonly<Record<StatoCandidatura, InfoStato>> = {
  IN_FASE_DI_ATTESA: { etichetta: 'In attesa', fermata: 0, tipo: 'in-corso', gruppo: 'attesa' },
  FASE_DI_COLLOQUIO_CONOSCITIVO: { etichetta: 'Conoscitivo', fermata: 1, tipo: 'in-corso', gruppo: 'colloqui' },
  FASE_DI_COLLOQUIO_TECNICO_1: { etichetta: 'Tecnico 1', fermata: 2, tipo: 'in-corso', gruppo: 'colloqui' },
  FASE_DI_COLLOQUIO_TECNICO_2: { etichetta: 'Tecnico 2', fermata: 3, tipo: 'in-corso', gruppo: 'colloqui' },
  PROPOSTA_LAVORATIVA_RICEVUTA: { etichetta: 'Proposta ricevuta', fermata: 4, tipo: 'in-corso', gruppo: 'proposta' },
  PROPOSTA_LAVORATIVA_IN_FASE_DI_REVISIONE: {
    etichetta: 'Proposta in valutazione',
    fermata: 4,
    tipo: 'in-corso',
    gruppo: 'proposta',
  },
  PROPOSTA_LAVORATIVA_ACCETTATA: { etichetta: 'Proposta accettata', fermata: 4, tipo: 'in-corso', gruppo: 'proposta' },
  ASSUNZIONE_COMPLETATA: { etichetta: 'Assunzione completata', fermata: 5, tipo: 'conclusa', gruppo: 'assunzione' },
  RIFIUTATO_DA_RECRUITER: { etichetta: 'Rifiutata dall’azienda', fermata: null, tipo: 'uscita', gruppo: 'rifiutata' },
  RIFIUTATO_DAL_CANDIDATO: { etichetta: 'Ritirata da te', fermata: null, tipo: 'uscita', gruppo: 'rifiutata' },
  PROPOSTA_LAVORATIVA_RIFIUTATA: { etichetta: 'Proposta rifiutata', fermata: 4, tipo: 'uscita', gruppo: 'rifiutata' },
  GHOSTING_O_SENZA_RISPOSTA: { etichetta: 'Senza risposta', fermata: null, tipo: 'uscita', gruppo: 'senza-risposta' },
};

export const TUTTI_GLI_STATI = Object.keys(INFO_STATO) as StatoCandidatura[];

export const STATI_USCITA = TUTTI_GLI_STATI.filter((s) => INFO_STATO[s].tipo === 'uscita');

export function etichettaStato(s: StatoCandidatura): string {
  return INFO_STATO[s].etichetta;
}

export function eInCorso(s: StatoCandidatura): boolean {
  return INFO_STATO[s].tipo === 'in-corso';
}

export function eUscita(s: StatoCandidatura): boolean {
  return INFO_STATO[s].tipo === 'uscita';
}

/** Una candidatura ha avuto risposta se ha lasciato l'attesa verso uno stato diverso dal ghosting. */
export function haAvutoRisposta(statoAttuale: StatoCandidatura, storico?: readonly { stato: StatoCandidatura }[]): boolean {
  if (statoAttuale !== 'IN_FASE_DI_ATTESA' && statoAttuale !== 'GHOSTING_O_SENZA_RISPOSTA') return true;
  if (statoAttuale === 'GHOSTING_O_SENZA_RISPOSTA' && storico) {
    // Se ha già avuto una risposta e poi si è fermata, la risposta c'è stata comunque.
    return storico.some((e) => e.stato !== 'IN_FASE_DI_ATTESA' && e.stato !== 'GHOSTING_O_SENZA_RISPOSTA');
  }
  return false;
}

export const MODALITA_ETICHETTA: Readonly<Record<Modalita, string>> = {
  REMOTO: 'Da remoto',
  IBRIDO: 'Ibrido',
  INSEDE: 'In sede',
};

export const MODALITA = Object.keys(MODALITA_ETICHETTA) as Modalita[];

export const FONTE_ETICHETTA: Readonly<Record<Fonte, string>> = {
  LINKEDIN: 'LinkedIn',
  INDEED: 'Indeed',
  SITO_AZIENDA: 'Sito dell’azienda',
  PASSAPAROLA: 'Passaparola',
  RECRUITER: 'Recruiter',
  ALTRO: 'Altro',
};

export const FONTI = Object.keys(FONTE_ETICHETTA) as Fonte[];

export const TIPO_COLLOQUIO_ETICHETTA: Readonly<Record<TipoColloquio, string>> = {
  CONOSCITIVO: 'Conoscitivo',
  TECNICO_1: 'Tecnico 1',
  TECNICO_2: 'Tecnico 2',
  ALTRO: 'Altro colloquio',
};

export const TIPI_COLLOQUIO = Object.keys(TIPO_COLLOQUIO_ETICHETTA) as TipoColloquio[];

export const TIPO_MODELLO_ETICHETTA: Readonly<Record<TipoModello, string>> = {
  SOLLECITO: 'Sollecito',
  RINGRAZIAMENTO: 'Ringraziamento',
  SPONTANEA: 'Candidatura spontanea',
};

export const TIPI_MODELLO = Object.keys(TIPO_MODELLO_ETICHETTA) as TipoModello[];
