import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CandidatureStore, ColloquiStore, StoricoStore } from '../../core/data/archivi';
import { formatoCompleto } from '../../core/date';
import { testoDa } from '../../core/eventi';
import { Orologio } from '../../core/orologio';
import { normalizzaAzienda } from '../../core/azienda';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { Icona } from '../../shared/icona/icona';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { raggruppaAziende } from './aziende.logic';

/** Aziende: «ci sono già passato?». Le candidature raggruppate per azienda. */
@Component({
  selector: 'app-aziende-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icona, StatoTag, StatoVuoto, Scheletro, ErroreCaricamento, Testata],
  templateUrl: './aziende-pagina.html',
  styleUrl: './aziende-pagina.scss',
})
export class AziendePagina {
  protected readonly candidature = inject(CandidatureStore);
  private readonly colloqui = inject(ColloquiStore);
  private readonly storico = inject(StoricoStore);
  private readonly orologio = inject(Orologio);

  protected readonly ricerca = signal('');
  protected readonly formatoCompleto = formatoCompleto;
  protected readonly testoDa = testoDa;

  protected readonly aziende = computed(() =>
    raggruppaAziende(this.candidature.elementi(), this.storico.perId(), this.colloqui.elementi(), this.orologio.oggi()),
  );
  protected readonly filtrate = computed(() => {
    const q = normalizzaAzienda(this.ricerca());
    return q ? this.aziende().filter((a) => a.chiave.includes(q)) : this.aziende();
  });

  constructor() {
    this.candidature.carica();
    this.colloqui.carica();
    // L'ultimo contatto si legge dallo storico: si carica in sottofondo.
    effect(() => {
      if (this.candidature.stato() !== 'pronto') return;
      const ids = this.candidature.elementi().map((c) => c.id);
      untracked(() => this.storico.assicuraEIscriviti(ids));
    });
  }

  protected ricarica(): void {
    this.candidature.carica(true);
    this.colloqui.carica(true);
  }
}
