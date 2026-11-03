import { Candidatura, StoricoEvento } from './api/models';
import { haAvutoRisposta } from './stati';

type Storici = ReadonlyMap<number, readonly StoricoEvento[]>;

export interface Tasso {
  n: number;
  risposte: number;
  /** Da 0 a 1; `null` se non ci sono candidature. */
  tasso: number | null;
}

export function haRisposta(c: Candidatura, storici: Storici): boolean {
  return haAvutoRisposta(c.statoCandidatura, storici.get(c.id));
}

export function calcolaTasso(candidature: readonly Candidatura[], storici: Storici): Tasso {
  const risposte = candidature.filter((c) => haRisposta(c, storici)).length;
  return { n: candidature.length, risposte, tasso: candidature.length ? risposte / candidature.length : null };
}

export function percentuale(x: number): number {
  return Math.round(x * 100);
}
