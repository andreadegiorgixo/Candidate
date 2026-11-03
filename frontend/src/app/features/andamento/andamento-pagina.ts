import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { Fonte, Modalita } from '../../core/api/models';
import { Auth } from '../../core/auth/auth.service';
import { CandidatureStore, CvStore, StoricoStore } from '../../core/data/archivi';
import { aggiungiGiorni, differenzaGiorni } from '../../core/date';
import { Orologio } from '../../core/orologio';
import { FONTE_ETICHETTA, FONTI, MODALITA, MODALITA_ETICHETTA } from '../../core/stati';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { Grafico } from '../../shared/grafico/grafico';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import {
  applicaFiltriAndamento,
  calcolaPercorsoAggregato,
  calcolaSegnali,
  FiltriAndamento,
  invioPerGiorno,
  invioPerSettimana,
  messaggioPochiDati,
  MINIMI,
  percentuale,
  Periodo,
  tassoMensile,
  tassoPerCitta,
  tassoPerCv,
  tassoPerFonte,
  tassoPerModalita,
  tempiPerFase,
} from './andamento.logic';
import { graficoBarre, graficoCalendario, graficoPercorso, graficoRitmo, graficoTassoMensile, graficoTempi, inizioCalendario, ModelloGrafico } from './grafici';

interface Sezione {
  modello: ModelloGrafico | null;
  /** Spiegazione al posto del grafico, se i dati non bastano. */
  vuoto: string | null;
  altezza: number;
}

const PERIODI: { valore: Periodo; etichetta: string }[] = [
  { valore: '30', etichetta: '30 giorni' },
  { valore: '90', etichetta: '90 giorni' },
  { valore: '365', etichetta: '12 mesi' },
  { valore: 'tutto', etichetta: 'Tutto' },
];

/** Andamento: «come sta andando?». Sette sezioni, tutte calcolate nel browser dalle candidature e dal loro storico. */
@Component({
  selector: 'app-andamento-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatSelectModule, MatFormFieldModule, Grafico, Scheletro, ErroreCaricamento, StatoVuoto, Testata],
  templateUrl: './andamento-pagina.html',
  styleUrl: './andamento-pagina.scss',
})
export class AndamentoPagina {
  private readonly candidatureStore = inject(CandidatureStore);
  private readonly storicoStore = inject(StoricoStore);
  private readonly cvStore = inject(CvStore);
  private readonly auth = inject(Auth);
  private readonly orologio = inject(Orologio);

  protected readonly periodi = PERIODI;
  protected readonly modalita = MODALITA;
  protected readonly etichettaModalita = MODALITA_ETICHETTA;
  protected readonly fonti = FONTI;
  protected readonly etichettaFonte = FONTE_ETICHETTA;
  protected readonly percentuale = percentuale;

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
  protected readonly nFiltrate = computed(() => this.filtrate().length);

  protected readonly segnali = computed(() => calcolaSegnali(this.filtrate(), this.storici(), this.cvStore.elementi()));

  protected readonly ritmo = computed<Sezione>(() => {
    const c = this.filtrate();
    const vuoto = messaggioPochiDati(MINIMI.ritmo, c.length, 'il ritmo degli invii');
    return {
      vuoto,
      altezza: 250,
      modello: vuoto ? null : graficoRitmo(invioPerSettimana(c, this.oggi(), this.filtri().periodo), this.auth.obiettivoSettimanale()),
    };
  });

  protected readonly aggregato = computed(() => calcolaPercorsoAggregato(this.filtrate(), this.storici()));
  protected readonly percorso = computed<Sezione>(() => {
    const c = this.filtrate();
    const vuoto = messaggioPochiDati(MINIMI.percorso, c.length, 'il percorso dagli invii agli esiti');
    return { vuoto, altezza: 360, modello: vuoto ? null : graficoPercorso(this.aggregato()) };
  });

  protected readonly tassoNelTempo = computed<Sezione>(() => {
    const soglia = this.auth.sogliaAttesa();
    const idonee = this.filtrate().filter((c) => differenzaGiorni(c.dataCandidatura, this.oggi()) >= soglia);
    const punti = tassoMensile(this.filtrate(), this.storici(), this.oggi(), soglia);
    let vuoto = messaggioPochiDati(MINIMI.tassoNelTempo, idonee.length, 'come cambia il tasso di risposta');
    if (!vuoto && punti.filter((p) => p.n > 0).length < 2) vuoto = 'Servono invii in almeno due mesi diversi per vedere come cambia il tasso di risposta.';
    return { vuoto, altezza: 250, modello: vuoto ? null : graficoTassoMensile(punti) };
  });
  protected readonly nonConteggiate = computed(() => {
    const soglia = this.auth.sogliaAttesa();
    return this.filtrate().filter((c) => differenzaGiorni(c.dataCandidatura, this.oggi()) < soglia).length;
  });

  protected readonly tempi = computed<Sezione>(() => {
    const fasi = tempiPerFase(this.filtrate(), this.storici());
    const casi = fasi.reduce((s, f) => s + f.casi, 0);
    const vuoto = messaggioPochiDati(MINIMI.tempi, casi, 'i tempi tra una fase e l’altra');
    const visibili = fasi.filter((f) => f.mediana !== null).length;
    return { vuoto: vuoto ? vuoto.replace('invii', 'passaggi di fase') : null, altezza: Math.max(120, visibili * 40 + 16), modello: vuoto ? null : graficoTempi(fasi) };
  });

  protected readonly cosaFunziona = computed(() => {
    const c = this.filtrate();
    const s = this.storici();
    const vuoto = messaggioPochiDati(MINIMI.cosaFunziona, c.length, 'cosa funziona');
    if (vuoto) return { vuoto, grafici: [] as { titolo: string; sezione: Sezione }[] };
    const costruisci = (titolo: string, barre: ReturnType<typeof tassoPerModalita>) => ({
      titolo,
      sezione: { vuoto: barre.length ? null : 'Nessun dato', altezza: Math.max(80, barre.length * 34 + 12), modello: barre.length ? graficoBarre(titolo, barre) : null } as Sezione,
    });
    return {
      vuoto: null,
      grafici: [
        costruisci('Risposte per modalità', tassoPerModalita(c, s)),
        costruisci('Risposte per fonte', tassoPerFonte(c, s)),
        costruisci('Risposte per versione del CV', tassoPerCv(c, s, this.cvStore.elementi())),
        costruisci('Risposte per città', tassoPerCitta(c, s)),
      ],
    };
  });

  protected readonly costanza = computed<Sezione>(() => {
    // Calendario annuale: considera modalità e fonte, non il periodo scelto.
    const f = { ...this.filtri(), periodo: '365' as Periodo };
    const c = applicaFiltriAndamento(this.candidatureStore.elementi(), f, this.oggi());
    const settimane = this.stretto() ? 26 : 53;
    const da = inizioCalendario(this.oggi(), settimane);
    return { vuoto: null, altezza: 228, modello: graficoCalendario(invioPerGiorno(c, da, this.oggi()), da, this.oggi()) };
  });

  constructor() {
    this.candidatureStore.carica();
    this.cvStore.carica();
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

  protected scegliModalita(m: '' | Modalita): void {
    this.filtri.update((f) => ({ ...f, modalita: m }));
  }

  protected scegliFonte(o: '' | Fonte): void {
    this.filtri.update((f) => ({ ...f, fonte: o }));
  }

  protected readonly ieri = computed(() => aggiungiGiorni(this.oggi(), -1));
}
