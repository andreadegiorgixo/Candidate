import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injectable, signal, viewChild } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CandidatureStore, ContattiStore } from '../../core/data/archivi';
import { testoDa } from '../../core/eventi';
import { cercaGlobale, Risultato, TipoRisultato } from '../../core/ricerca';
import { NuovaCandidatura } from '../../shared/aggiungi-candidatura/pannello-candidatura';
import { Icona, NomeIcona } from '../../shared/icona/icona';

const TITOLI: Record<TipoRisultato, string> = { azione: 'Azioni', azienda: 'Aziende', ruolo: 'Ruoli', contatto: 'Contatti' };
const ICONE: Record<TipoRisultato, NomeIcona> = { azione: 'piu', azienda: 'aziende', ruolo: 'candidature', contatto: 'persona' };
const ORDINE: TipoRisultato[] = ['azienda', 'ruolo', 'contatto', 'azione'];

/** Ricerca globale (Cmd+K o Ctrl+K): aziende, ruoli, contatti e azioni principali. */
@Component({
  selector: 'app-ricerca-globale',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, Icona],
  template: `
    <div class="campo-ricerca">
      <app-icona nome="cerca" />
      <input
        #campo
        type="text"
        role="combobox"
        aria-expanded="true"
        aria-controls="risultati"
        aria-autocomplete="list"
        autocomplete="off"
        spellcheck="false"
        placeholder="Cerca aziende, ruoli e contatti, o scegli un’azione"
        aria-label="Cerca"
        [attr.aria-activedescendant]="attivo() ? 'ris-' + attivo()!.id : null"
        [value]="testo()"
        (input)="scrivi(testoDa($event))"
        (keydown)="tasto($event)"
      />
      <kbd>Esc</kbd>
    </div>
    <div class="risultati" id="risultati" role="listbox" aria-label="Risultati">
      @for (g of gruppi(); track g.tipo) {
        <div role="group" [attr.aria-label]="g.titolo">
          <p class="gruppo" aria-hidden="true">{{ g.titolo }}</p>
          @for (r of g.voci; track r.id) {
            <button type="button" role="option" class="voce" [id]="'ris-' + r.id" [class.attivo]="attivo()?.id === r.id" [attr.aria-selected]="attivo()?.id === r.id" (click)="scegli(r)" (mousemove)="indice.set(posizione(r))">
              <app-icona [nome]="icone[r.tipo]" />
              <span class="testi">
                <strong>{{ r.titolo }}</strong>
                <small>{{ r.dettaglio }}</small>
              </span>
            </button>
          }
        </div>
      } @empty {
        <p class="nessuno" role="status">Non trovo niente per «{{ testo() }}». Prova con il nome di un’azienda o di un ruolo.</p>
      }
    </div>
  `,
  styleUrl: './ricerca-globale.scss',
})
export class RicercaGlobale {
  private readonly ref = inject<MatDialogRef<RicercaGlobale, Risultato>>(MatDialogRef);
  private readonly candidature = inject(CandidatureStore);
  private readonly contatti = inject(ContattiStore);

  protected readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');
  protected readonly testo = signal('');
  protected readonly indice = signal(0);
  protected readonly icone = ICONE;
  protected readonly testoDa = testoDa;

  protected readonly risultati = computed(() => cercaGlobale(this.testo(), this.candidature.elementi(), this.contatti.elementi()));
  protected readonly gruppi = computed(() =>
    ORDINE.map((tipo) => ({ tipo, titolo: TITOLI[tipo], voci: this.risultati().filter((r) => r.tipo === tipo) })).filter((g) => g.voci.length > 0),
  );
  /** Risultati nell'ordine in cui compaiono a schermo: serve alla navigazione con le frecce. */
  private readonly piatti = computed(() => this.gruppi().flatMap((g) => g.voci));
  protected readonly attivo = computed<Risultato | null>(() => this.piatti()[Math.min(this.indice(), this.piatti().length - 1)] ?? null);

  constructor() {
    this.candidature.carica();
    this.contatti.carica();
    // Il campo prende il focus subito, così non si perdono i primi caratteri digitati dopo Cmd+K.
    afterNextRender(() => this.campo()?.nativeElement.focus());
  }

  protected posizione(r: Risultato): number {
    return this.piatti().indexOf(r);
  }

  protected scrivi(valore: string): void {
    this.testo.set(valore);
    this.indice.set(0);
  }

  protected tasto(e: KeyboardEvent): void {
    const n = this.piatti().length;
    if (!n) return;
    if (e.key === 'ArrowDown') this.indice.set((this.indice() + 1) % n);
    else if (e.key === 'ArrowUp') this.indice.set((this.indice() - 1 + n) % n);
    else if (e.key === 'Enter' && this.attivo()) this.scegli(this.attivo()!);
    else return;
    e.preventDefault();
    queueMicrotask(() => document.getElementById(`ris-${this.attivo()?.id}`)?.scrollIntoView({ block: 'nearest' }));
  }

  protected scegli(r: Risultato): void {
    this.ref.close(r);
  }
}

@Injectable({ providedIn: 'root' })
export class RicercaService {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly nuova = inject(NuovaCandidatura);

  apri(): void {
    if (this.dialog.openDialogs.some((d) => d.componentInstance instanceof RicercaGlobale)) return;
    this.dialog
      .open<RicercaGlobale, void, Risultato>(RicercaGlobale, {
        width: '620px',
        maxWidth: '94vw',
        position: { top: '12vh' },
        panelClass: 'ricerca-panel',
        autoFocus: 'input',
      })
      .afterClosed()
      .subscribe((r) => {
        if (!r) return;
        if (r.comando === 'nuova-candidatura') this.nuova.apri().subscribe();
        else if (r.percorso) void this.router.navigate(r.percorso);
      });
  }
}
