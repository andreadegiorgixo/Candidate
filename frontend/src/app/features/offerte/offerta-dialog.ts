import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { Offerta, OffertaInput } from '../../core/api/models';
import { CandidatureStore, OfferteStore } from '../../core/data/archivi';
import { formatISO, parseData } from '../../core/date';
import { Notifier } from '../../core/notifier';
import { eInCorso, INFO_STATO } from '../../core/stati';

export interface DatiOffertaDialog {
  offerta?: Offerta;
  /** Candidature che hanno già un'offerta: non si possono scegliere due volte. */
  giaConOfferta: number[];
}

const intero = (v: number | null) => (v === null || Number.isNaN(Number(v)) ? null : Number(v));

@Component({
  selector: 'app-offerta-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ dati.offerta ? 'Modifica proposta' : 'Aggiungi proposta' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salva()" novalidate>
      <mat-dialog-content>
        @if (dati.offerta) {
          <p class="riepilogo">
            <strong>{{ nomeCandidatura() }}</strong>
          </p>
        } @else {
          <mat-form-field appearance="outline">
            <mat-label>Candidatura</mat-label>
            <mat-select formControlName="idCandidatura" required>
              @for (c of scelte(); track c.id) {
                <mat-option [value]="c.id">{{ c.nomeAzienda }}, {{ c.posizioneLavorativa }}</mat-option>
              }
            </mat-select>
            @if (form.controls.idCandidatura.invalid) {
              <mat-error>Scegli a quale candidatura si riferisce la proposta.</mat-error>
            }
            @if (scelte().length === 0) {
              <mat-hint>Non ci sono candidature in corso senza proposta.</mat-hint>
            }
          </mat-form-field>
        }
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>RAL annua, in euro</mat-label>
            <input matInput type="number" min="0" step="500" formControlName="ral" inputmode="numeric" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Variabile annua, in euro</mat-label>
            <input matInput type="number" min="0" step="500" formControlName="variabile" inputmode="numeric" />
          </mat-form-field>
        </div>
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Giorni da remoto a settimana</mat-label>
            <input matInput type="number" min="0" max="5" formControlName="giorniRemoto" inputmode="numeric" />
            @if (form.controls.giorniRemoto.invalid) {
              <mat-error>Da 0 a 5 giorni.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Giorni di ferie all’anno</mat-label>
            <input matInput type="number" min="0" formControlName="ferie" inputmode="numeric" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Scadenza della proposta</mat-label>
          <input matInput [matDatepicker]="dp" formControlName="scadenza" />
          <mat-datepicker-toggle matIconSuffix [for]="dp" />
          <mat-datepicker #dp />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Benefit</mat-label>
          <textarea matInput formControlName="benefit" rows="2" placeholder="Buoni pasto, assicurazione, formazione"></textarea>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Note</mat-label>
          <textarea matInput formControlName="note" rows="2"></textarea>
        </mat-form-field>
        <div class="voto" role="radiogroup" aria-label="Il tuo voto, da 1 a 5">
          <span class="etichetta">Il tuo voto</span>
          @for (n of voti; track n) {
            <button type="button" role="radio" class="n" [class.on]="form.controls.voto.value === n" [attr.aria-checked]="form.controls.voto.value === n" (click)="scegliVoto(n)">{{ n }}</button>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="btn" mat-dialog-close>Annulla</button>
        <button type="submit" class="btn primario" [disabled]="salvataggio()">Salva proposta</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .riepilogo {
      background: var(--avorio);
      border-radius: var(--r-campo);
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .coppia {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 14px;
    }
    .voto {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .etichetta {
      font-weight: 600;
      margin-right: 4px;
    }
    .n {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #8b917f;
      background: var(--bianco);
      font-weight: 650;
    }
    .n:hover {
      background: var(--sabbia);
    }
    .n.on {
      background: var(--bosco);
      border-color: var(--bosco);
      color: var(--lime);
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
export class OffertaDialog {
  protected readonly dati = inject<DatiOffertaDialog>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<OffertaDialog, Offerta>>(MatDialogRef);
  private readonly store = inject(OfferteStore);
  private readonly candidature = inject(CandidatureStore);
  private readonly notifier = inject(Notifier);

  protected readonly voti = [1, 2, 3, 4, 5];
  protected readonly salvataggio = signal(false);
  private readonly o = this.dati.offerta;

  protected readonly form = new FormGroup({
    idCandidatura: new FormControl<number | null>(this.o?.idCandidatura ?? null, { validators: [Validators.required] }),
    ral: new FormControl<number | null>(this.o?.ral ?? null),
    variabile: new FormControl<number | null>(this.o?.variabile ?? null),
    giorniRemoto: new FormControl<number | null>(this.o?.giorniRemoto ?? null, { validators: [Validators.min(0), Validators.max(5)] }),
    ferie: new FormControl<number | null>(this.o?.ferie ?? null),
    benefit: new FormControl(this.o?.benefit ?? '', { nonNullable: true }),
    scadenza: new FormControl<Date | null>(this.o?.scadenza ? parseData(this.o.scadenza) : null),
    note: new FormControl(this.o?.note ?? '', { nonNullable: true }),
    voto: new FormControl<number | null>(this.o?.voto ?? null),
  });

  protected readonly scelte = computed(() =>
    this.candidature
      .elementi()
      .filter((c) => eInCorso(c.statoCandidatura) && !this.dati.giaConOfferta.includes(c.id))
      // Le candidature già arrivate alla proposta vengono per prime.
      .sort((a, b) => (INFO_STATO[b.statoCandidatura].fermata ?? 0) - (INFO_STATO[a.statoCandidatura].fermata ?? 0) || a.nomeAzienda.localeCompare(b.nomeAzienda, 'it')),
  );

  protected readonly nomeCandidatura = computed(() => {
    const c = this.candidature.trova(this.o?.idCandidatura ?? -1);
    return c ? `${c.nomeAzienda}, ${c.posizioneLavorativa}` : 'Candidatura eliminata';
  });

  protected scegliVoto(n: number): void {
    this.form.controls.voto.setValue(this.form.controls.voto.value === n ? null : n);
  }

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: OffertaInput = {
      idCandidatura: v.idCandidatura!,
      ral: intero(v.ral),
      variabile: intero(v.variabile),
      giorniRemoto: intero(v.giorniRemoto),
      ferie: intero(v.ferie),
      benefit: v.benefit.trim(),
      scadenza: v.scadenza ? formatISO(v.scadenza) : null,
      note: v.note.trim(),
      voto: v.voto,
    };
    this.salvataggio.set(true);
    const op = this.o ? this.store.aggiorna(this.o.id, input) : this.store.crea(input);
    op.subscribe({
      next: (r) => {
        this.notifier.info('Proposta salvata');
        this.ref.close(r);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

export function apriOfferta(dialog: MatDialog, dati: DatiOffertaDialog): Promise<Offerta | undefined> {
  return firstValueFrom(dialog.open<OffertaDialog, DatiOffertaDialog, Offerta>(OffertaDialog, { data: dati, width: '600px' }).afterClosed());
}
