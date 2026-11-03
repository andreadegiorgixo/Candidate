import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { Offerta } from '../../core/api/models';
import { CandidatureStore, OfferteStore } from '../../core/data/archivi';
import { formatoCompleto } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { eInCorso } from '../../core/stati';
import { ErroreCaricamento, Scheletro } from '../../shared/caricamento/caricamento';
import { chiediConferma } from '../../shared/dialoghi/conferma-dialog';
import { Icona } from '../../shared/icona/icona';
import { StatoVuoto } from '../../shared/stato-vuoto/stato-vuoto';
import { Testata } from '../../shared/testata/testata';
import { euro, migliori, RigaConfronto } from './offerte.logic';
import { apriOfferta } from './offerta-dialog';

interface RigaTabella {
  chiave: RigaConfronto | 'benefit' | 'note';
  etichetta: string;
  testo: (o: Offerta) => string;
}

/** Offerte: «quale accetto?». Confronto affiancato delle proposte aperte, senza dichiarare un vincitore. */
@Component({
  selector: 'app-offerte-pagina',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icona, StatoVuoto, Scheletro, ErroreCaricamento, Testata],
  templateUrl: './offerte-pagina.html',
  styleUrl: './offerte-pagina.scss',
})
export class OffertePagina {
  private readonly store = inject(OfferteStore);
  private readonly candidature = inject(CandidatureStore);
  private readonly notifier = inject(Notifier);
  private readonly dialog = inject(MatDialog);

  protected readonly righe: RigaTabella[] = [
    { chiave: 'ral', etichetta: 'RAL', testo: (o) => euro(o.ral) },
    { chiave: 'variabile', etichetta: 'Variabile', testo: (o) => euro(o.variabile) },
    { chiave: 'giorniRemoto', etichetta: 'Giorni da remoto a settimana', testo: (o) => (o.giorniRemoto === null ? '' : String(o.giorniRemoto)) },
    { chiave: 'ferie', etichetta: 'Giorni di ferie', testo: (o) => (o.ferie === null ? '' : String(o.ferie)) },
    { chiave: 'benefit', etichetta: 'Benefit', testo: (o) => o.benefit },
    { chiave: 'scadenza', etichetta: 'Scadenza', testo: (o) => (o.scadenza ? formatoCompleto(o.scadenza) : '') },
    { chiave: 'note', etichetta: 'Note', testo: (o) => o.note },
    { chiave: 'voto', etichetta: 'Il tuo voto', testo: (o) => (o.voto === null ? '' : `${o.voto} su 5`) },
  ];

  protected readonly stato = computed(() => {
    const s = [this.store.stato(), this.candidature.stato()];
    if (s.includes('errore')) return 'errore';
    return s.every((x) => x === 'pronto') ? 'pronto' : 'caricamento';
  });
  protected readonly errore = computed(() => this.store.errore() ?? this.candidature.errore());

  /** Solo le proposte ancora aperte: quelle di candidature chiuse non si confrontano più. */
  protected readonly aperte = computed(() =>
    this.store
      .elementi()
      .map((o) => ({ o, c: this.candidature.trova(o.idCandidatura) }))
      .filter((x) => !!x.c && eInCorso(x.c.statoCandidatura))
      .sort((a, b) => (a.o.scadenza ?? '9999').localeCompare(b.o.scadenza ?? '9999')),
  );
  protected readonly migliori = computed(() => migliori(this.aperte().map((x) => x.o)));

  protected eMigliore(riga: RigaTabella['chiave'], id: number): boolean {
    return riga !== 'benefit' && riga !== 'note' && this.migliori()[riga].has(id);
  }

  protected ricarica(): void {
    this.store.carica(true);
    this.candidature.carica(true);
  }

  constructor() {
    this.store.carica();
    this.candidature.carica();
  }

  protected aggiungi(): void {
    void apriOfferta(this.dialog, { giaConOfferta: this.store.elementi().map((o) => o.idCandidatura) });
  }

  protected modifica(o: Offerta): void {
    void apriOfferta(this.dialog, { offerta: o, giaConOfferta: [] });
  }

  protected async elimina(o: Offerta): Promise<void> {
    const nome = this.candidature.trova(o.idCandidatura)?.nomeAzienda ?? 'questa azienda';
    const ok = await chiediConferma(this.dialog, {
      titolo: `Eliminare la proposta di ${nome}?`,
      testo: 'La candidatura resta com’è. Non si può annullare.',
      conferma: 'Elimina proposta',
      pericolo: true,
    });
    if (!ok) return;
    this.store.elimina(o.id).subscribe({
      next: () => this.notifier.info('Proposta eliminata'),
      error: (e: unknown) => this.notifier.errore(e, () => void this.elimina(o)),
    });
  }
}
