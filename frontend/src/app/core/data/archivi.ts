import { inject, Injectable, signal } from '@angular/core';
import { from, map, mergeMap, Observable, of, tap, toArray } from 'rxjs';
import { Api } from '../api/api.service';
import {
  Candidatura,
  CandidaturaInput,
  Citta,
  CittaInput,
  Colloquio,
  ColloquioInput,
  Contatto,
  ContattoInput,
  Cv,
  CvInput,
  Modello,
  ModelloInput,
  Offerta,
  OffertaInput,
  StatoCandidatura,
  StoricoEvento,
} from '../api/models';
import { ListaStore, registraArchivio, svuotaTuttiGliArchivi } from './lista-store';

export { svuotaTuttiGliArchivi };

@Injectable({ providedIn: 'root' })
export class StoricoStore {
  private readonly api = inject(Api);
  /** Storico per candidatura, caricato quando serve. */
  readonly perId = signal<ReadonlyMap<number, StoricoEvento[]>>(new Map());
  readonly inCaricamento = signal(false);
  readonly errore = signal<unknown>(null);

  constructor() {
    registraArchivio(this);
  }

  /** Carica gli storici mancanti, al massimo sei richieste alla volta. */
  assicura(ids: readonly number[]): Observable<void> {
    const mancanti = ids.filter((id) => !this.perId().has(id));
    if (!mancanti.length) return of(undefined);
    this.inCaricamento.set(true);
    return from(mancanti).pipe(
      mergeMap((id) => this.api.storico(id).pipe(map((s) => [id, s] as const)), 6),
      toArray(),
      tap({
        next: (coppie) => {
          this.perId.update((m) => new Map([...m, ...coppie]));
          this.inCaricamento.set(false);
        },
        error: (e: unknown) => {
          this.errore.set(e);
          this.inCaricamento.set(false);
        },
      }),
      map(() => undefined),
    );
  }

  assicuraEIscriviti(ids: readonly number[]): void {
    this.assicura(ids).subscribe({ error: () => undefined });
  }

  invalida(id: number): void {
    this.perId.update((m) => {
      const n = new Map(m);
      n.delete(id);
      return n;
    });
  }

  ricarica(id: number): Observable<void> {
    this.invalida(id);
    return this.assicura([id]);
  }

  svuota(): void {
    this.perId.set(new Map());
    this.errore.set(null);
  }
}

@Injectable({ providedIn: 'root' })
export class CandidatureStore extends ListaStore<Candidatura, CandidaturaInput> {
  private readonly storico = inject(StoricoStore);

  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.candidature(),
      crea: (i) => api.creaCandidatura(i),
      aggiorna: (id, i) => api.aggiornaCandidatura(id, i),
      elimina: (id) => api.eliminaCandidatura(id),
    });
  }

  override aggiorna(id: number, input: CandidaturaInput): Observable<Candidatura> {
    return super.aggiorna(id, input).pipe(tap(() => this.storico.invalida(id)));
  }

  /** Dati modificabili di una candidatura esistente. */
  static comeInput(c: Candidatura): CandidaturaInput {
    const { id: _id, idAccount: _acc, dataCreazione: _dc, ...input } = c;
    return input;
  }

  cambiaStato(c: Candidatura, stato: StatoCandidatura): Observable<Candidatura> {
    return this.aggiorna(c.id, { ...CandidatureStore.comeInput(c), statoCandidatura: stato });
  }

  trova(id: number): Candidatura | undefined {
    return this.elementi().find((c) => c.id === id);
  }

  override svuota(): void {
    super.svuota();
  }
}

@Injectable({ providedIn: 'root' })
export class ColloquiStore extends ListaStore<Colloquio, ColloquioInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.colloqui(),
      crea: (i) => api.creaColloquio(i),
      aggiorna: (id, i) => api.aggiornaColloquio(id, i),
      elimina: (id) => api.eliminaColloquio(id),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ContattiStore extends ListaStore<Contatto, ContattoInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.contatti(),
      crea: (i) => api.creaContatto(i),
      aggiorna: (id, i) => api.aggiornaContatto(id, i),
      elimina: (id) => api.eliminaContatto(id),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CvStore extends ListaStore<Cv, CvInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.cv(),
      crea: (i) => api.creaCv(i),
      aggiorna: (id, i) => api.aggiornaCv(id, i),
      elimina: (id) => api.eliminaCv(id),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ModelliStore extends ListaStore<Modello, ModelloInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.modelli(),
      crea: (i) => api.creaModello(i),
      aggiorna: (id, i) => api.aggiornaModello(id, i),
      elimina: (id) => api.eliminaModello(id),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class OfferteStore extends ListaStore<Offerta, OffertaInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.offerte(),
      crea: (i) => api.creaOfferta(i),
      aggiorna: (id, i) => api.aggiornaOfferta(id, i),
      elimina: (id) => api.eliminaOfferta(id),
    });
  }
}

@Injectable({ providedIn: 'root' })
export class CittaStore extends ListaStore<Citta, CittaInput> {
  constructor() {
    const api = inject(Api);
    super({
      elenco: () => api.citta(),
      crea: (i) => api.creaCitta(i),
      aggiorna: () => {
        throw new Error('Le città non si modificano');
      },
      elimina: () => {
        throw new Error('Le città non si eliminano');
      },
    });
  }
}
