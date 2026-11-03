import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Colloquio, ColloquioInput, TipoColloquio } from '../../core/api/models';
import { CandidatureStore, ColloquiStore } from '../../core/data/archivi';
import { spuntatoDa, testoDa } from '../../core/eventi';
import { descriviData, formatoCompleto, giornoDelMese, maiuscolaIniziale, meseBreve, soloData, soloOra } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { TIPI_COLLOQUIO, TIPO_COLLOQUIO_ETICHETTA } from '../../core/stati';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { apriColloquio } from '../../shared/dialoghi/colloquio-dialog';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { Icona } from '../../shared/icona/icona';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { ModelloChecklistDialog } from './modello-checklist-dialog';
import { avanzamentoChecklist, filtraDomande, raccogliDomande, suddividiColloqui } from './colloqui.logic';

type Vista = 'programma' | 'conclusi' | 'domande';

/** Colloqui: «arrivo preparato e imparo da ognuno». Agenda, conclusi con resoconto, archivio delle domande. */
@Component({
  selector: 'app-colloqui-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatSelectModule, MatFormFieldModule, Icona, StatoVuoto, Scheletro, ErroreCaricamento, Testata],
  templateUrl: './colloqui-pagina.html',
  styleUrl: './colloqui-pagina.scss',
})
export class ColloquiPagina {
  private readonly store = inject(ColloquiStore);
  private readonly candidature = inject(CandidatureStore);
  private readonly orologio = inject(Orologio);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly tipi = TIPI_COLLOQUIO;
  protected readonly etichettaTipo = TIPO_COLLOQUIO_ETICHETTA;
  protected readonly voti = [1, 2, 3, 4, 5];
  protected readonly testoDa = testoDa;
  protected readonly spuntatoDa = spuntatoDa;

  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly apri = computed(() => {
    const v = this.params().get('apri');
    return v ? Number(v) : null;
  });
  protected readonly vistaScelta = signal<Vista | null>(null);

  protected readonly stato = computed(() => {
    const s = [this.store.stato(), this.candidature.stato()];
    if (s.includes('errore')) return 'errore';
    return s.every((x) => x === 'pronto') ? 'pronto' : 'caricamento';
  });
  protected readonly errore = computed(() => this.store.errore() ?? this.candidature.errore());

  protected readonly suddivisi = computed(() => suddividiColloqui(this.store.elementi(), this.orologio.adesso()));

  /** La scheda aperta da Oggi decide la vista; altrimenti si parte dall'agenda. */
  protected readonly vista = computed<Vista>(() => {
    const scelta = this.vistaScelta();
    if (scelta) return scelta;
    const id = this.apri();
    if (id !== null && this.suddivisi().conclusi.some((c) => c.id === id)) return 'conclusi';
    return 'programma';
  });

  protected readonly ricerca = signal('');
  protected readonly tipoDomanda = signal<'' | TipoColloquio>('');
  protected readonly domande = computed(() => raccogliDomande(this.store.elementi(), this.candidature.elementi()));
  protected readonly domandeFiltrate = computed(() => filtraDomande(this.domande(), this.ricerca(), this.tipoDomanda()));

  constructor() {
    this.store.carica();
    this.candidature.carica();
    // Quando si arriva da «Apri preparazione», porta la scheda in vista.
    effect(() => {
      const id = this.apri();
      if (this.stato() !== 'pronto' || id === null) return;
      this.vista();
      untracked(() =>
        setTimeout(() => {
          const el = document.getElementById(`colloquio-${id}`);
          el?.scrollIntoView({ block: 'center' });
        }, 60),
      );
    });
  }

  protected scegliVista(v: Vista): void {
    this.vistaScelta.set(v);
    if (this.apri() !== null) void this.router.navigate([], { relativeTo: this.route, queryParams: { apri: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected ricarica(): void {
    this.store.carica(true);
    this.candidature.carica(true);
  }

  protected azienda(c: Colloquio): string {
    return this.candidature.trova(c.idCandidatura)?.nomeAzienda ?? 'Azienda eliminata';
  }

  protected ruolo(c: Colloquio): string {
    return this.candidature.trova(c.idCandidatura)?.posizioneLavorativa ?? '';
  }

  protected giorno = (c: Colloquio) => giornoDelMese(c.dataOra);
  protected mese = (c: Colloquio) => meseBreve(soloData(c.dataOra));
  protected ora = (c: Colloquio) => soloOra(c.dataOra);
  protected avanzamento = avanzamentoChecklist;
  protected eLink = (t: string) => /^https?:\/\//.test(t);

  protected quando(c: Colloquio): string {
    return maiuscolaIniziale(descriviData(soloData(c.dataOra), this.orologio.oggi()));
  }

  protected dataCompleta(c: Colloquio): string {
    return formatoCompleto(soloData(c.dataOra));
  }

  protected async aggiungi(): Promise<void> {
    await apriColloquio(this.dialog, {});
  }

  protected async modifica(c: Colloquio, modo: 'dettagli' | 'resoconto' = 'dettagli'): Promise<void> {
    await apriColloquio(this.dialog, { colloquio: c, modo });
  }

  protected async elimina(c: Colloquio): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: `Eliminare il colloquio con ${this.azienda(c)}?`,
      testo: 'Perdi anche la checklist e il resoconto. Non si può annullare.',
      conferma: 'Elimina colloquio',
      pericolo: true,
    });
    if (!ok) return;
    this.store.elimina(c.id).subscribe({
      next: () => this.notifier.info('Colloquio eliminato'),
      error: (e: unknown) => this.notifier.errore(e, () => void this.elimina(c)),
    });
  }

  protected spunta(c: Colloquio, indice: number, fatto: boolean): void {
    const { id: _id, ...resto } = c;
    const input: ColloquioInput = { ...resto, checklist: c.checklist.map((v, i) => (i === indice ? { ...v, fatto } : v)) };
    this.store.aggiorna(c.id, input).subscribe({ error: (e: unknown) => this.notifier.errore(e, () => this.spunta(c, indice, fatto)) });
  }

  protected modelloChecklist(): void {
    this.dialog.open(ModelloChecklistDialog, { width: '520px' });
  }
}
