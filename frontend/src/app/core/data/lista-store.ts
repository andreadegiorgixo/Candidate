import { signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

export type StatoCaricamento = 'inattivo' | 'caricamento' | 'pronto' | 'errore';

export interface OperazioniLista<T, I> {
  elenco: () => Observable<T[]>;
  crea: (i: I) => Observable<T>;
  aggiorna: (id: number, i: I) => Observable<T>;
  elimina: (id: number) => Observable<void>;
}

const registro = new Set<{ svuota(): void }>();

export function registraArchivio(s: { svuota(): void }): void {
  registro.add(s);
}

/** Azzera tutti gli archivi in memoria (all'uscita dall'account). */
export function svuotaTuttiGliArchivi(): void {
  registro.forEach((s) => s.svuota());
}

/**
 * Archivio di una collezione caricata una volta sola e tenuta in un segnale.
 * Le modifiche aggiornano l'elenco locale dopo la risposta del server.
 */
export class ListaStore<T extends { id: number }, I> {
  readonly elementi = signal<T[]>([]);
  readonly stato = signal<StatoCaricamento>('inattivo');
  readonly errore = signal<unknown>(null);

  constructor(private readonly op: OperazioniLista<T, I>) {
    registraArchivio(this);
  }

  carica(forza = false): void {
    if (this.stato() === 'caricamento' || (!forza && this.stato() === 'pronto')) return;
    this.stato.set('caricamento');
    this.errore.set(null);
    this.op.elenco().subscribe({
      next: (lista) => {
        this.elementi.set(lista);
        this.stato.set('pronto');
      },
      error: (e: unknown) => {
        this.errore.set(e);
        this.stato.set('errore');
      },
    });
  }

  crea(input: I): Observable<T> {
    return this.op.crea(input).pipe(tap((n) => this.elementi.update((l) => [...l, n])));
  }

  aggiorna(id: number, input: I): Observable<T> {
    return this.op.aggiorna(id, input).pipe(tap((n) => this.elementi.update((l) => l.map((x) => (x.id === id ? n : x)))));
  }

  elimina(id: number): Observable<void> {
    return this.op.elimina(id).pipe(tap(() => this.elementi.update((l) => l.filter((x) => x.id !== id))));
  }

  svuota(): void {
    this.elementi.set([]);
    this.stato.set('inattivo');
    this.errore.set(null);
  }
}
