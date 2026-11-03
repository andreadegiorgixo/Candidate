import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { Modello, TipoModello } from '../../core/api/models';
import { ModelliStore } from '../../core/data/archivi';
import { Notifier } from '../../core/notifier';
import { TIPI_MODELLO, TIPO_MODELLO_ETICHETTA } from '../../core/stati';

@Component({
  selector: 'app-modello-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ modello ? 'Modifica modello' : 'Aggiungi modello' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salva()" novalidate>
      <mat-dialog-content>
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              @for (t of tipi; track t) {
                <mat-option [value]="t">{{ etichette[t] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Nome</mat-label>
            <input matInput formControlName="nome" required />
            @if (form.controls.nome.invalid) {
              <mat-error>Dai un nome al modello.</mat-error>
            }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Testo</mat-label>
          <textarea matInput formControlName="testo" rows="9" required></textarea>
          <mat-hint>Segnaposto: &#123;azienda&#125;, &#123;ruolo&#125; e &#123;contatto&#125;, compilati quando apri il modello da una candidatura.</mat-hint>
          @if (form.controls.testo.invalid) {
            <mat-error>Scrivi il testo del messaggio.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="btn" mat-dialog-close>Annulla</button>
        <button type="submit" class="btn primario" [disabled]="salvataggio()">Salva modello</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .coppia {
      display: grid;
      grid-template-columns: 1fr 1.4fr;
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
export class ModelloDialog {
  protected readonly modello = inject<Modello | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ModelloDialog, Modello>>(MatDialogRef);
  private readonly store = inject(ModelliStore);
  private readonly notifier = inject(Notifier);

  protected readonly tipi = TIPI_MODELLO;
  protected readonly etichette = TIPO_MODELLO_ETICHETTA;
  protected readonly salvataggio = signal(false);
  protected readonly form = new FormGroup({
    tipo: new FormControl<TipoModello>(this.modello?.tipo ?? 'SOLLECITO', { nonNullable: true }),
    nome: new FormControl(this.modello?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
    testo: new FormControl(this.modello?.testo ?? '', { nonNullable: true, validators: [Validators.required] }),
  });

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { tipo: v.tipo, nome: v.nome.trim(), testo: v.testo.trim() };
    this.salvataggio.set(true);
    const op = this.modello ? this.store.aggiorna(this.modello.id, input) : this.store.crea(input);
    op.subscribe({
      next: (r) => {
        this.notifier.info('Modello salvato');
        this.ref.close(r);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

export function apriModello(dialog: MatDialog, m: Modello | null): Promise<Modello | undefined> {
  return firstValueFrom(dialog.open<ModelloDialog, Modello | null, Modello>(ModelloDialog, { data: m, width: '620px' }).afterClosed());
}
