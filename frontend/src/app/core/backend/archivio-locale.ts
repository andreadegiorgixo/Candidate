import {
  Candidatura,
  Colloquio,
  Contatto,
  Modello,
  Offerta,
  Promemoria,
  StoricoEvento,
} from '../api/models';
import { normalizzaAzienda } from '../azienda';
import { DataISO } from '../date';
import { components } from './api.generated';
import {
  daCandidatureDTO,
  EXTRA_PREDEFINITI,
  ExtraCandidatura,
  Impostazioni,
  IMPOSTAZIONI_PREDEFINITE,
  riconciliaStorico,
} from './adattatore';

type CandidatureDTO = components['schemas']['CandidatureDTO'];

/**
 * Tutto ciò che il backend non salva ancora (vedi `BACKEND_REQUESTS.md`) vive nel browser,
 * separato per account. Si perde cambiando browser o svuotando i dati del sito.
 */
export interface DatiLocali {
  impostazioni: Impostazioni;
  extra: Record<number, ExtraCandidatura>;
  storico: Record<number, StoricoEvento[]>;
  colloqui: Colloquio[];
  contatti: Contatto[];
  modelli: Modello[];
  offerte: Offerta[];
  promemoria: Record<string, Promemoria>;
  prossimoId: number;
  /**
   * I CV ora stanno sul server. Dati salvati prima di questa modifica contengono le vecchie versioni
   * «con link», che non si possono trasformare in file: all'apertura vengono scartate (vedi `senzaCvLocali`).
   */
  cvSuServer: boolean;
}

export type ChiaveRisorsa = 'colloqui' | 'contatti' | 'modelli' | 'offerte';

type Deposito = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const PREFISSO = 'candidate.locale.';

function vuoti(): DatiLocali {
  return {
    impostazioni: { ...IMPOSTAZIONI_PREDEFINITE },
    extra: {},
    storico: {},
    colloqui: [],
    contatti: [],
    modelli: [],
    offerte: [],
    promemoria: {},
    prossimoId: 1,
    cvSuServer: true,
  };
}

/**
 * Toglie le vecchie versioni del CV salvate nel browser e scollega le candidature che le usavano:
 * i loro numeri potrebbero coincidere con quelli di CV veri creati sul server.
 */
function senzaCvLocali(dati: Partial<DatiLocali> & { cv?: unknown }): Partial<DatiLocali> {
  const { cv: _vecchi, ...resto } = dati;
  const extra = Object.fromEntries(Object.entries(resto.extra ?? {}).map(([k, e]) => [k, { ...e, idCv: null }]));
  return { ...resto, extra, cvSuServer: true };
}

export class ArchivioLocale {
  constructor(private readonly deposito: Deposito = localStorage) {}

  leggi(idAccount: number): DatiLocali {
    try {
      const grezzo = this.deposito.getItem(PREFISSO + idAccount);
      if (!grezzo) return vuoti();
      const salvati = JSON.parse(grezzo) as Partial<DatiLocali>;
      return { ...vuoti(), ...(salvati.cvSuServer ? salvati : senzaCvLocali(salvati)) };
    } catch {
      // Contenuto illeggibile: si riparte da zero invece di bloccare l'app.
      return vuoti();
    }
  }

  /** Legge, applica la modifica e salva. */
  modifica<T>(idAccount: number, f: (d: DatiLocali) => T): T {
    const dati = this.leggi(idAccount);
    const risultato = f(dati);
    this.deposito.setItem(PREFISSO + idAccount, JSON.stringify(dati));
    return risultato;
  }

  elimina(idAccount: number): void {
    this.deposito.removeItem(PREFISSO + idAccount);
  }

  // ---- impostazioni ----

  impostazioni(idAccount: number): Impostazioni {
    return this.leggi(idAccount).impostazioni;
  }

  salvaImpostazioni(idAccount: number, imp: Impostazioni): void {
    this.modifica(idAccount, (d) => void (d.impostazioni = { ...imp }));
  }

  // ---- candidature ----

  /**
   * Unisce le candidature del backend con i dati locali e aggiorna lo storico.
   * Con `completo` (elenco intero) elimina anche ciò che riguarda candidature non più presenti,
   * per esempio cancellate da fuori.
   */
  arricchisci(idAccount: number, elenco: readonly CandidatureDTO[], oggi: DataISO, completo: boolean): Candidatura[] {
    return this.modifica(idAccount, (d) => {
      const risultato = elenco.map((b) => this.unisci(d, b, oggi));
      if (completo) this.potaOrfani(d, new Set(elenco.map((b) => b.id!)));
      return risultato;
    });
  }

  /** Dopo una creazione o modifica: conserva i dati locali della candidatura. */
  salvaCandidatura(idAccount: number, dto: CandidatureDTO, extra: ExtraCandidatura, oggi: DataISO): Candidatura {
    return this.modifica(idAccount, (d) => {
      d.extra[dto.id!] = { ...extra };
      return this.unisci(d, dto, oggi);
    });
  }

  rimuoviCandidatura(idAccount: number, id: number): void {
    this.modifica(idAccount, (d) => {
      delete d.extra[id];
      delete d.storico[id];
      d.colloqui = d.colloqui.filter((x) => x.idCandidatura !== id);
      d.offerte = d.offerte.filter((x) => x.idCandidatura !== id);
    });
  }

  storico(idAccount: number, id: number): StoricoEvento[] | undefined {
    const s = this.leggi(idAccount).storico[id];
    return s ? s.map((e) => ({ ...e })) : undefined;
  }

  private unisci(d: DatiLocali, b: CandidatureDTO, oggi: DataISO): Candidatura {
    const id = b.id!;
    const c = daCandidatureDTO(b, d.extra[id] ?? EXTRA_PREDEFINITI);
    d.storico[id] = riconciliaStorico(d.storico[id], c, oggi);
    return c;
  }

  /** Elimina storico, dati extra, colloqui e offerte delle candidature fuori dall'insieme dato. */
  private potaOrfani(d: DatiLocali, presenti: ReadonlySet<number>): void {
    const tieni = <T>(r: Record<number, T>) => Object.fromEntries(Object.entries(r).filter(([k]) => presenti.has(Number(k))));
    d.extra = tieni(d.extra);
    d.storico = tieni(d.storico);
    d.colloqui = d.colloqui.filter((x) => presenti.has(x.idCandidatura));
    d.offerte = d.offerte.filter((x) => presenti.has(x.idCandidatura));
  }

  /**
   * Le candidature che indicano una versione del CV non più esistente (eliminata da qui o da un altro
   * browser) restano senza versione. `daScollegare` dice quali numeri non valgono più.
   */
  scollegaCv(idAccount: number, daScollegare: (idCv: number) => boolean): void {
    const orfano = (e: ExtraCandidatura) => e.idCv !== null && daScollegare(e.idCv);
    if (!Object.values(this.leggi(idAccount).extra).some(orfano)) return;
    this.modifica(idAccount, (d) => {
      for (const e of Object.values(d.extra)) if (orfano(e)) e.idCv = null;
    });
  }

  // ---- risorse semplici ----

  elenco<K extends ChiaveRisorsa>(idAccount: number, chiave: K): DatiLocali[K] {
    return this.leggi(idAccount)[chiave];
  }

  crea<K extends ChiaveRisorsa>(idAccount: number, chiave: K, input: object): DatiLocali[K][number] {
    return this.modifica(idAccount, (d) => {
      const nuovo = { ...input, id: d.prossimoId++ } as DatiLocali[K][number];
      (d[chiave] as { id: number }[]).push(nuovo);
      return { ...nuovo };
    });
  }

  /** `null` se l'elemento non esiste. */
  aggiorna<K extends ChiaveRisorsa>(idAccount: number, chiave: K, id: number, input: object): DatiLocali[K][number] | null {
    return this.modifica(idAccount, (d) => {
      const lista = d[chiave] as { id: number }[];
      const i = lista.findIndex((x) => x.id === id);
      if (i < 0) return null;
      lista[i] = { ...input, id };
      return { ...lista[i] } as DatiLocali[K][number];
    });
  }

  /** `false` se l'elemento non esiste. */
  eliminaRisorsa(idAccount: number, chiave: ChiaveRisorsa, id: number): boolean {
    return this.modifica(idAccount, (d) => {
      const liste = d as unknown as Record<ChiaveRisorsa, { id: number }[]>;
      if (!liste[chiave].some((x) => x.id === id)) return false;
      liste[chiave] = liste[chiave].filter((x) => x.id !== id);
      return true;
    });
  }

  // ---- promemoria per azienda ----

  promemoria(idAccount: number, azienda: string): Promemoria {
    return this.leggi(idAccount).promemoria[normalizzaAzienda(azienda)] ?? { nonRicontattarePrimaDel: null };
  }

  salvaPromemoria(idAccount: number, azienda: string, p: Promemoria): Promemoria {
    this.modifica(idAccount, (d) => void (d.promemoria[normalizzaAzienda(azienda)] = { ...p }));
    return { ...p };
  }
}
