import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { Candidatura, StatoCandidatura } from '../../core/api/models';
import { CandidatureStore } from '../../core/data/archivi';
import { differenzaGiorni, formatoBreve } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { FERMATE, INFO_STATO, STATI_USCITA, etichettaStato } from '../../core/stati';
import { Icona } from '../../shared/icona/icona';

/**
 * Una colonna per fermata. Trascinare una scheda cambia lo stato, con «Annulla» nello snackbar.
 * Le uscite si scelgono dal menu di ogni scheda, che offre anche gli spostamenti da tastiera.
 */
@Component({
  selector: 'app-bacheca',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag, RouterLink, MatMenuModule, Icona],
  templateUrl: './bacheca.html',
  styleUrl: './bacheca.scss',
})
export class Bacheca {
  readonly candidature = input.required<readonly Candidatura[]>();

  private readonly store = inject(CandidatureStore);
  private readonly notifier = inject(Notifier);
  private readonly orologio = inject(Orologio);

  protected readonly fermate = FERMATE;
  protected readonly uscite = STATI_USCITA;
  protected readonly etichettaStato = etichettaStato;
  protected readonly info = INFO_STATO;

  /** Stati provvisori, mostrati subito mentre il server risponde. */
  private readonly provvisori = signal<ReadonlyMap<number, StatoCandidatura>>(new Map());

  protected readonly colonne = computed(() => {
    const provv = this.provvisori();
    const colonne: Candidatura[][] = FERMATE.map(() => []);
    let fuori = 0;
    for (const c of this.candidature()) {
      const stato = provv.get(c.id) ?? c.statoCandidatura;
      const f = INFO_STATO[stato].fermata;
      if (INFO_STATO[stato].tipo === 'uscita' || f === null) fuori++;
      else colonne[f].push({ ...c, statoCandidatura: stato });
    }
    return { colonne, fuori };
  });

  protected giorni(c: Candidatura): string {
    const n = differenzaGiorni(c.dataCandidatura, this.orologio.oggi());
    return n === 0 ? 'Inviata oggi' : `Inviata il ${formatoBreve(c.dataCandidatura)}`;
  }

  protected rilascia(e: CdkDragDrop<number, number, Candidatura>, fermata: number): void {
    if (e.previousContainer === e.container) return;
    this.sposta(e.item.data, FERMATE[fermata].stato);
  }

  protected sposta(c: Candidatura, nuovo: StatoCandidatura): void {
    const prima = c.statoCandidatura;
    const stessaFermata = INFO_STATO[prima].fermata === INFO_STATO[nuovo].fermata && INFO_STATO[prima].tipo !== 'uscita' && INFO_STATO[nuovo].tipo !== 'uscita';
    if (prima === nuovo || stessaFermata) return;
    this.provvisori.update((m) => new Map(m).set(c.id, nuovo));
    this.store.cambiaStato(c, nuovo).subscribe({
      next: () => {
        this.libera(c.id);
        this.notifier.conAzione(`${c.nomeAzienda}: ${etichettaStato(nuovo)}`, 'Annulla', () => this.annulla(c, prima));
      },
      error: (e: unknown) => {
        this.libera(c.id);
        this.notifier.errore(e, () => this.sposta(c, nuovo));
      },
    });
  }

  private annulla(c: Candidatura, prima: StatoCandidatura): void {
    const attuale = this.store.trova(c.id) ?? c;
    this.provvisori.update((m) => new Map(m).set(c.id, prima));
    this.store.cambiaStato(attuale, prima).subscribe({
      next: () => {
        this.libera(c.id);
        this.notifier.info(`${c.nomeAzienda}: di nuovo ${etichettaStato(prima)}`);
      },
      error: (e: unknown) => {
        this.libera(c.id);
        this.notifier.errore(e);
      },
    });
  }

  private libera(id: number): void {
    this.provvisori.update((m) => {
      const n = new Map(m);
      n.delete(id);
      return n;
    });
  }
}
