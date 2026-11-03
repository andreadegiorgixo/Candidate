import { Injectable, signal } from '@angular/core';
import { adesso, DataISO, oggiISO } from './date';

/** Data e ora correnti come segnali: i componenti non leggono mai `new Date()` direttamente. */
@Injectable({ providedIn: 'root' })
export class Orologio {
  readonly oggi = signal<DataISO>(oggiISO());
  readonly adesso = signal<string>(adesso());

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => this.aggiorna());
    }
  }

  aggiorna(): void {
    this.oggi.set(oggiISO());
    this.adesso.set(adesso());
  }
}
