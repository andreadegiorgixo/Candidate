import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth.service';
import { CandidatureStore, StoricoStore } from '../../core/data/archivi';
import { Orologio } from '../../core/orologio';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { Grafico } from '../../shared/grafico/grafico';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import {
  applicaFiltriAndamento,
  calcolaPercorsoAggregato,
  calcolaTasso,
  FiltriAndamento,
  invioPerGiorno,
  invioPerSettimana,
  messaggioPochiDati,
  MINIMI,
  percentuale,
  Periodo,
  tassoColloquio,
} from './andamento.logic';
import { graficoCalendario, graficoRitmo, inizioCalendario, ModelloGrafico } from './grafici';

interface Sezione {
  modello: ModelloGrafico | null;
  /** Spiegazione al posto del grafico, se i dati non bastano. */
  vuoto: string | null;
  altezza: number;
}

const PERIODI: { valore: Periodo; etichetta: string; testo: string }[] = [
  { valore: '30', etichetta: '30g', testo: 'Ultimi 30 giorni' },
  { valore: '90', etichetta: '90g', testo: 'Ultimi 90 giorni' },
  { valore: '365', etichetta: '1 anno', testo: 'Ultimo anno' },
  { valore: 'tutto', etichetta: 'Tutto', testo: 'Da sempre' },
];

/** Andamento: «come sta andando?». Tre sezioni, calcolate nel browser dalle candidature e dal loro storico. */
@Component({
  selector: 'app-andamento-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Grafico, Scheletro, ErroreCaricamento, StatoVuoto, Testata],
  templateUrl: './andamento-pagina.html',
  styleUrl: './andamento-pagina.scss',
})
export class AndamentoPagina {
  private readonly candidatureStore = inject(CandidatureStore);
  private readonly storicoStore = inject(StoricoStore);
  private readonly auth = inject(Auth);
  private readonly orologio = inject(Orologio);

  protected readonly periodi = PERIODI;

  protected readonly filtri = signal<FiltriAndamento>({ periodo: '90', modalita: '', fonte: '' });
  private readonly storicoPronto = signal(false);
  private readonly stretto = signal(typeof matchMedia === 'function' && matchMedia('(max-width: 700px)').matches);

  protected readonly stato = computed<'caricamento' | 'errore' | 'vuoto' | 'pronto'>(() => {
    if (this.candidatureStore.stato() === 'errore' || this.storicoStore.errore()) return 'errore';
    if (this.candidatureStore.stato() !== 'pronto' || !this.storicoPronto()) return 'caricamento';
    return this.candidatureStore.elementi().length === 0 ? 'vuoto' : 'pronto';
  });
  protected readonly errore = computed(() => this.candidatureStore.errore() ?? this.storicoStore.errore());

  private readonly oggi = this.orologio.oggi;
  private readonly storici = this.storicoStore.perId;
  protected readonly filtrate = computed(() => applicaFiltriAndamento(this.candidatureStore.elementi(), this.filtri(), this.oggi()));

  protected readonly ritmo = computed<Sezione>(() => {
    const c = this.filtrate();
    const vuoto = messaggioPochiDati(MINIMI.ritmo, c.length, 'il ritmo degli invii');
    return {
      vuoto,
      altezza: 170,
      modello: vuoto ? null : graficoRitmo(invioPerSettimana(c, this.oggi(), this.filtri().periodo), this.auth.obiettivoSettimanale()),
    };
  });

  private readonly aggregato = computed(() => calcolaPercorsoAggregato(this.filtrate(), this.storici()));

  /** Tre numeri grandi: invii, tasso di risposta e arrivi a colloquio; `—` dove il dato manca. */
  protected readonly numeri = computed(() => {
    const c = this.filtrate();
    const tasso = calcolaTasso(c, this.storici());
    const colloqui = this.aggregato().raggiunte[1] ?? 0;
    const pct = (x: number | null) => (x === null ? '—' : `${percentuale(x)}%`);
    return [
      { etichetta: 'Inviate', valore: String(c.length), sotto: PERIODI.find((p) => p.valore === this.filtri().periodo)?.testo ?? '' },
      { etichetta: 'Tasso di risposta', valore: pct(tasso.tasso), sotto: tasso.n ? `${tasso.risposte} su ${tasso.n}` : '—' },
      { etichetta: 'Arrivate a colloquio', valore: pct(tassoColloquio(this.aggregato())), sotto: c.length ? `${colloqui} su ${c.length}` : '—' },
    ];
  });

  protected readonly costanza = computed<Sezione>(() => {
    // Calendario annuale: non dipende dal periodo scelto.
    const f = { ...this.filtri(), periodo: '365' as Periodo };
    const c = applicaFiltriAndamento(this.candidatureStore.elementi(), f, this.oggi());
    const settimane = this.stretto() ? 26 : 53;
    const da = inizioCalendario(this.oggi(), settimane);
    return { vuoto: null, altezza: 228, modello: graficoCalendario(invioPerGiorno(c, da, this.oggi()), da, this.oggi()) };
  });

  constructor() {
    this.candidatureStore.carica();
    // Serve lo storico di tutte le candidature, non solo di quelle filtrate: la risposta si legge da lì.
    effect(() => {
      if (this.candidatureStore.stato() !== 'pronto') return;
      const ids = this.candidatureStore.elementi().map((c) => c.id);
      untracked(() =>
        this.storicoStore.assicura(ids).subscribe({
          next: () => this.storicoPronto.set(true),
          error: () => undefined,
        }),
      );
    });
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(max-width: 700px)');
      mq.addEventListener('change', (e) => this.stretto.set(e.matches));
    }
  }

  protected ricarica(): void {
    this.storicoStore.errore.set(null);
    this.candidatureStore.carica(true);
    this.storicoPronto.set(false);
    this.storicoStore.assicura(this.candidatureStore.elementi().map((c) => c.id)).subscribe({ next: () => this.storicoPronto.set(true), error: () => undefined });
  }

  protected scegliPeriodo(p: Periodo): void {
    this.filtri.update((f) => ({ ...f, periodo: p }));
  }
}
