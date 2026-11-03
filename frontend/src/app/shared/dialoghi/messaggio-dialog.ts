import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Candidatura, TipoModello } from '../../core/api/models';
import { normalizzaAzienda } from '../../core/azienda';
import { ContattiStore, ModelliStore } from '../../core/data/archivi';
import { compilaModello } from '../../core/modelli';
import { Notifier } from '../../core/notifier';
import { TIPO_MODELLO_ETICHETTA } from '../../core/stati';
import { Icona } from '../icona/icona';

export interface DatiMessaggio {
  candidatura: Candidatura;
  /** Tipo di modello da proporre per primo. */
  tipo?: TipoModello;
}

/** Apre un modello di messaggio già compilato con i dati della candidatura. */
@Component({
  selector: 'app-messaggio-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, Icona],
  template: `
    <h2 mat-dialog-title>Scrivi a {{ dati.candidatura.nomeAzienda }}</h2>
    <mat-dialog-content>
      @if (modelli.elementi().length === 0) {
        <p>Non hai ancora modelli di messaggio. Creane uno da Materiali.</p>
      } @else {
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Modello</mat-label>
            <mat-select [ngModel]="idModello()" (ngModelChange)="scegliModello($event)">
              @for (m of modelli.elementi(); track m.id) {
                <mat-option [value]="m.id">{{ m.nome }} ({{ tipoEtichetta[m.tipo] }})</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Destinatario</mat-label>
            <mat-select [ngModel]="contatto()" (ngModelChange)="contatto.set($event)">
              <mat-option [value]="''">Nessun contatto</mat-option>
              @for (c of contattiAzienda(); track c.id) {
                <mat-option [value]="c.nome">{{ c.nome }}, {{ c.ruolo }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Testo del messaggio</mat-label>
          <textarea matInput rows="10" [ngModel]="testo()" (ngModelChange)="modificato.set($event)"></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn" mat-dialog-close>Chiudi</button>
      <button type="button" class="btn primario" (click)="copia()" [disabled]="!testo()">
        <app-icona nome="copia" /> Copia testo
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .coppia {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 14px;
    }
    mat-dialog-actions {
      padding: 8px 24px 20px;
      gap: 8px;
    }
    @media (max-width: 560px) {
      .coppia {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class MessaggioDialog {
  protected readonly dati = inject<DatiMessaggio>(MAT_DIALOG_DATA);
  protected readonly modelli = inject(ModelliStore);
  private readonly contatti = inject(ContattiStore);
  private readonly notifier = inject(Notifier);

  protected readonly tipoEtichetta = TIPO_MODELLO_ETICHETTA;
  protected readonly idModello = signal<number | null>(null);
  protected readonly contatto = signal('');
  /** Testo modificato a mano: finché non si cambia modello, ha la precedenza. */
  protected readonly modificato = signal<string | null>(null);

  protected readonly contattiAzienda = computed(() =>
    this.contatti.elementi().filter((c) => normalizzaAzienda(c.nomeAzienda) === normalizzaAzienda(this.dati.candidatura.nomeAzienda)),
  );

  protected readonly testo = computed(() => {
    const m = this.modelli.elementi().find((x) => x.id === this.idModello());
    if (!m) return '';
    return (
      this.modificato() ??
      compilaModello(m.testo, {
        azienda: this.dati.candidatura.nomeAzienda,
        ruolo: this.dati.candidatura.posizioneLavorativa,
        contatto: this.contatto(),
      })
    );
  });

  constructor() {
    this.modelli.carica();
    this.contatti.carica();
    effect(() => {
      const lista = this.modelli.elementi();
      if (untracked(() => this.idModello()) === null && lista.length) {
        const scelto = lista.find((m) => m.tipo === this.dati.tipo) ?? lista[0];
        untracked(() => this.idModello.set(scelto.id));
      }
    });
    effect(() => {
      const primo = this.contattiAzienda()[0];
      if (primo && untracked(() => this.contatto()) === '') untracked(() => this.contatto.set(primo.nome));
    });
  }

  protected scegliModello(id: number): void {
    this.idModello.set(id);
    this.modificato.set(null);
  }

  protected async copia(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.testo());
      this.notifier.info('Testo copiato');
    } catch {
      this.notifier.errore(new Error('clipboard'));
    }
  }
}

export function apriMessaggio(dialog: MatDialog, dati: DatiMessaggio): void {
  dialog.open(MessaggioDialog, { data: dati, width: '640px' });
}
