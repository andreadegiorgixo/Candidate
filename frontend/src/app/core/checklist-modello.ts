import { Injectable, signal } from '@angular/core';

const CHIAVE = 'candidate.checklist-modello';

export const CHECKLIST_PREDEFINITA = [
  'Rileggere l’annuncio e le note sull’azienda',
  'Ripassare le domande ricevute nei colloqui precedenti',
  'Preparare due domande per chi mi intervista',
  'Provare audio, camera e connessione',
];

/**
 * Modello della checklist di preparazione. Il contratto API non lo prevede,
 * quindi vive nel browser (vedi BACKEND_REQUESTS.md).
 */
@Injectable({ providedIn: 'root' })
export class ChecklistModello {
  readonly voci = signal<string[]>(this.leggi());

  private leggi(): string[] {
    try {
      const grezzo = localStorage.getItem(CHIAVE);
      const v: unknown = grezzo ? JSON.parse(grezzo) : null;
      if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v as string[];
    } catch {
      /* si usa il modello predefinito */
    }
    return [...CHECKLIST_PREDEFINITA];
  }

  salva(voci: string[]): void {
    const pulite = voci.map((v) => v.trim()).filter(Boolean);
    this.voci.set(pulite);
    localStorage.setItem(CHIAVE, JSON.stringify(pulite));
  }
}
