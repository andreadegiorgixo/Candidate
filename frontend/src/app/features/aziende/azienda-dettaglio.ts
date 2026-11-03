import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api/api.service';
import { Contatto } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { CandidatureStore, ColloquiStore, ContattiStore, StoricoStore } from '../../core/data/archivi';
import { differenzaGiorni, formatISO, formatoCompleto, parseData } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { apriContatto } from '../../shared/dialoghi/contatto-dialog';
import { Icona } from '../../shared/icona/icona';
import { Percorso } from '../../shared/percorso/percorso';
import { StatoTag } from '../../shared/stato-tag/stato-tag';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { cronologiaAzienda } from './aziende.logic';

/** Una singola azienda: cronologia, contatti e promemoria «da non ricontattare prima del». */
@Component({
  selector: 'app-azienda-dettaglio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ReactiveFormsModule, MatDatepickerModule, MatFormFieldModule, MatInputModule, Icona, Percorso, StatoTag, StatoVuoto, Scheletro, ErroreCaricamento],
  templateUrl: './azienda-dettaglio.html',
  styleUrl: './azienda-dettaglio.scss',
})
export class AziendaDettaglio {
  /** Parametro di rotta `:chiave`. */
  readonly chiave = input.required<string>();

  protected readonly candidature = inject(CandidatureStore);
  private readonly colloqui = inject(ColloquiStore);
  private readonly contattiStore = inject(ContattiStore);
  private readonly storico = inject(StoricoStore);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);
  private readonly orologio = inject(Orologio);

  protected readonly formatoCompleto = formatoCompleto;
  protected readonly data = new FormControl<Date | null>(null);
  protected readonly salvando = signal(false);
  protected readonly promemoria = signal<string | null>(null);
  protected readonly promemoriaPronto = signal(false);

  protected readonly delle = computed(() => this.candidature.elementi().filter((c) => normalizzaAzienda(c.nomeAzienda) === this.chiave()));
  protected readonly nome = computed(() => [...this.delle()].sort((a, b) => b.dataCandidatura.localeCompare(a.dataCandidatura))[0]?.nomeAzienda.trim() ?? this.chiave());
  protected readonly contatti = computed(() => this.contattiStore.elementi().filter((c) => normalizzaAzienda(c.nomeAzienda) === this.chiave()));
  protected readonly cronologia = computed(() => cronologiaAzienda(this.delle(), this.storico.perId(), this.colloqui.elementi(), this.orologio.oggi()));
  protected readonly ordinate = computed(() => [...this.delle()].sort((a, b) => b.dataCandidatura.localeCompare(a.dataCandidatura)));
  protected readonly daAspettare = computed(() => {
    const p = this.promemoria();
    return p && differenzaGiorni(this.orologio.oggi(), p) >= 0 ? p : null;
  });

  constructor() {
    this.candidature.carica();
    this.colloqui.carica();
    this.contattiStore.carica();
    effect(() => {
      if (this.candidature.stato() !== 'pronto') return;
      const ids = this.delle().map((c) => c.id);
      untracked(() => this.storico.assicuraEIscriviti(ids));
    });
    effect(() => {
      const nome = this.nome();
      if (this.candidature.stato() !== 'pronto' || this.delle().length === 0) return;
      untracked(() => this.caricaPromemoria(nome));
    });
  }

  private caricaPromemoria(nome: string): void {
    this.api.promemoria(nome).subscribe({
      next: (p) => {
        this.promemoria.set(p.nonRicontattarePrimaDel);
        this.data.setValue(p.nonRicontattarePrimaDel ? parseData(p.nonRicontattarePrimaDel) : null);
        this.promemoriaPronto.set(true);
      },
      error: (e: unknown) => this.notifier.errore(e, () => this.caricaPromemoria(nome)),
    });
  }

  protected salvaPromemoria(): void {
    const d = this.data.value;
    this.registra(d ? formatISO(d) : null);
  }

  protected togliPromemoria(): void {
    this.data.setValue(null);
    this.registra(null);
  }

  private registra(valore: string | null): void {
    this.salvando.set(true);
    this.api.aggiornaPromemoria(this.nome(), { nonRicontattarePrimaDel: valore }).subscribe({
      next: (p) => {
        this.salvando.set(false);
        this.promemoria.set(p.nonRicontattarePrimaDel);
        this.notifier.info(valore ? 'Promemoria salvato' : 'Promemoria tolto');
      },
      error: (e: unknown) => {
        this.salvando.set(false);
        this.notifier.errore(e, () => this.registra(valore));
      },
    });
  }

  protected async nuovoContatto(): Promise<void> {
    await apriContatto(this.dialog, { nomeAzienda: this.nome() });
  }

  protected async modificaContatto(c: Contatto): Promise<void> {
    await apriContatto(this.dialog, { contatto: c });
  }

  protected async togliContatto(c: Contatto): Promise<void> {
    const ok = await chiediConferma(this.dialog, {
      titolo: `Togliere ${c.nome}?`,
      testo: 'Il contatto sparisce dall’azienda e da tutte le sue candidature.',
      conferma: 'Togli contatto',
      pericolo: true,
    });
    if (ok) this.contattiStore.elimina(c.id).subscribe({ error: (e: unknown) => this.notifier.errore(e) });
  }
}
