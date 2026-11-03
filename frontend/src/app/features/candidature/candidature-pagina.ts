import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Candidatura } from '../../core/api/models';
import { CandidatureStore, CittaStore, StoricoStore } from '../../core/data/archivi';
import { testoDa } from '../../core/eventi';
import { descriviData, differenzaGiorni, formatoBreve } from '../../core/date';
import { Orologio } from '../../core/orologio';
import { FERMATE, FONTE_ETICHETTA, FONTI, INFO_STATO, MODALITA, MODALITA_ETICHETTA, TUTTI_GLI_STATI, etichettaStato } from '../../core/stati';
import { NuovaCandidatura } from '../../shared/aggiungi-candidatura/pannello-candidatura';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { Icona } from '../../shared/icona/icona';
import { Percorso } from '../../shared/percorso/percorso';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { Bacheca } from './bacheca';
import {
  applicaFiltri,
  Colonna,
  contaFiltriAttivi,
  FILTRI_VUOTI,
  Filtri,
  generaCsv,
  Ordine,
  ordina,
  paramsDaStato,
  StatoPagina,
  statoDaParams,
  Vista,
} from './candidature.logic';

interface ColonnaTabella {
  id: Colonna;
  titolo: string;
}

/** Candidature: «gestisco tutto qui». Elenco e bacheca, con i filtri nell'URL. */
@Component({
  selector: 'app-candidature-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatSelectModule, MatFormFieldModule, MatMenuModule, Icona, Percorso, StatoTag, StatoVuoto, Scheletro, ErroreCaricamento, Testata, Bacheca],
  templateUrl: './candidature-pagina.html',
  styleUrl: './candidature-pagina.scss',
})
export class CandidaturePagina {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(CandidatureStore);
  protected readonly storico = inject(StoricoStore);
  private readonly cittaStore = inject(CittaStore);
  private readonly nuova = inject(NuovaCandidatura);
  private readonly orologio = inject(Orologio);

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly pagina = computed<StatoPagina>(() => statoDaParams((k) => this.params().get(k)));
  protected readonly filtri = computed(() => this.pagina().filtri);
  protected readonly ordine = computed(() => this.pagina().ordine);
  protected readonly vista = computed(() => this.pagina().vista);

  protected readonly colonne: ColonnaTabella[] = [
    { id: 'azienda', titolo: 'Azienda e ruolo' },
    { id: 'stato', titolo: 'Percorso' },
    { id: 'modalita', titolo: 'Modalità' },
    { id: 'citta', titolo: 'Città' },
    { id: 'invio', titolo: 'Inviata' },
    { id: 'azione', titolo: 'Prossima azione' },
  ];
  protected readonly modalita = MODALITA;
  protected readonly etichettaModalita = MODALITA_ETICHETTA;
  protected readonly fonti = FONTI;
  protected readonly etichettaFonte = FONTE_ETICHETTA;
  protected readonly stati = TUTTI_GLI_STATI;
  protected readonly etichettaStato = etichettaStato;
  protected readonly fermate = FERMATE;
  protected readonly testoDa = testoDa;

  protected readonly ricerca = signal('');
  private ritardo: ReturnType<typeof setTimeout> | null = null;

  protected readonly filtrate = computed(() => applicaFiltri(this.store.elementi(), this.filtri()));
  protected readonly ordinate = computed(() => ordina(this.filtrate(), this.ordine()));
  protected readonly nFiltri = computed(() => contaFiltriAttivi(this.filtri()));

  /** Città che compaiono nelle candidature: sono le uniche utili come filtro. */
  protected readonly cittaUsate = computed(() => {
    const viste = new Map<number, string>();
    for (const c of this.store.elementi()) viste.set(c.citta.id, c.citta.nomeCitta);
    return [...viste.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  });

  protected readonly riepilogo = computed(() => {
    const n = this.ordinate().length;
    const tot = this.store.elementi().length;
    const base = `${tot} ${tot === 1 ? 'candidatura' : 'candidature'}`;
    return n === tot ? base : `${n} su ${base}`;
  });

  constructor() {
    this.store.carica();
    this.cittaStore.carica();
    effect(() => {
      this.ricerca.set(this.filtri().q);
    });
    // Per le linee delle uscite serve lo storico: si carica solo per quelle.
    effect(() => {
      if (this.store.stato() !== 'pronto') return;
      const ids = this.filtrate()
        .filter((c) => INFO_STATO[c.statoCandidatura].fermata === null)
        .map((c) => c.id);
      untracked(() => this.storico.assicuraEIscriviti(ids));
    });
  }

  protected aggiorna(cambi: Partial<Filtri> & { vista?: Vista; ordine?: Ordine }): void {
    const p = this.pagina();
    const { vista, ordine, ...soloFiltri } = cambi;
    const nuovo: StatoPagina = {
      filtri: { ...p.filtri, ...soloFiltri },
      ordine: ordine ?? p.ordine,
      vista: vista ?? p.vista,
    };
    void this.router.navigate([], { relativeTo: this.route, queryParams: paramsDaStato(nuovo), replaceUrl: true });
  }

  protected scrivi(valore: string): void {
    this.ricerca.set(valore);
    if (this.ritardo) clearTimeout(this.ritardo);
    this.ritardo = setTimeout(() => this.aggiorna({ q: valore }), 250);
  }

  protected azzera(): void {
    this.aggiorna({ ...FILTRI_VUOTI });
  }

  protected ordinaPer(colonna: Colonna): void {
    const o = this.ordine();
    this.aggiorna({
      ordine: { colonna, direzione: o.colonna === colonna && o.direzione === 'asc' ? 'desc' : 'asc' },
    });
  }

  protected ordinaSelect(valore: string): void {
    const colonna = this.colonne.find((c) => c.id === valore)?.id;
    if (!colonna) return;
    const o = this.ordine();
    this.aggiorna({ ordine: { colonna, direzione: o.direzione } });
  }

  protected direzioneSelect(): void {
    const o = this.ordine();
    this.aggiorna({ ordine: { colonna: o.colonna, direzione: o.direzione === 'asc' ? 'desc' : 'asc' } });
  }

  protected ariaSort(colonna: Colonna): 'ascending' | 'descending' | 'none' {
    const o = this.ordine();
    return o.colonna !== colonna ? 'none' : o.direzione === 'asc' ? 'ascending' : 'descending';
  }

  protected apri(c: Candidatura, e: Event): void {
    if ((e.target as HTMLElement).closest('a, button')) return;
    void this.router.navigate(['/candidature', c.id]);
  }

  protected aggiungi(): void {
    this.nuova.apri().subscribe();
  }

  protected testoInvio(c: Candidatura): string {
    const data = formatoBreve(c.dataCandidatura);
    return c.dataCandidatura.slice(0, 4) === this.orologio.oggi().slice(0, 4) ? data : `${data} ${c.dataCandidatura.slice(0, 4)}`;
  }

  protected azione(c: Candidatura): { testo: string; data: string; scaduta: boolean } | null {
    if (!c.prossimaAzioneTesto) return null;
    const oggi = this.orologio.oggi();
    const d = c.prossimaAzioneData;
    return {
      testo: c.prossimaAzioneTesto,
      data: d ? descriviData(d, oggi) : '',
      scaduta: !!d && differenzaGiorni(oggi, d) < 0 && INFO_STATO[c.statoCandidatura].tipo === 'in-corso',
    };
  }

  protected esporta(): void {
    const csv = generaCsv(this.ordinate());
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `candidature-${this.orologio.oggi()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
