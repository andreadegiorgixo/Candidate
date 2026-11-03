import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { messaggioErrore } from './errori';

/** Messaggi brevi in basso: conferme, annullamenti ed errori con «Riprova». */
@Injectable({ providedIn: 'root' })
export class Notifier {
  private readonly snack = inject(MatSnackBar);

  info(messaggio: string): void {
    this.snack.open(messaggio, undefined, { duration: 4000 });
  }

  /** Mostra un'azione (per esempio «Annulla»); restituisce una Promise che si risolve se l'azione viene scelta. */
  conAzione(messaggio: string, azione: string, alClick: () => void, durata = 7000): void {
    this.snack.open(messaggio, azione, { duration: durata }).onAction().subscribe(alClick);
  }

  errore(e: unknown, riprova?: () => void): void {
    const ref = this.snack.open(messaggioErrore(e), riprova ? 'Riprova' : 'Chiudi', { duration: 9000, panelClass: 'snack-errore' });
    if (riprova) ref.onAction().subscribe(riprova);
  }
}
