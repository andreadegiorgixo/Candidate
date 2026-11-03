import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Contatto } from '../../core/api/models';
import { ContattiStore } from '../../core/data/archivi';
import { Notifier } from '../../core/notifier';

export interface DatiContattoDialog {
  contatto?: Contatto;
  nomeAzienda?: string;
}

@Component({
  selector: 'app-contatto-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ dati.contatto ? 'Modifica contatto' : 'Aggiungi contatto' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salva()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Azienda</mat-label>
          <input matInput formControlName="nomeAzienda" required />
          @if (form.controls.nomeAzienda.invalid) {
            <mat-error>Indica l’azienda.</mat-error>
          }
        </mat-form-field>
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Nome e cognome</mat-label>
            <input matInput formControlName="nome" required autocomplete="off" />
            @if (form.controls.nome.invalid) {
              <mat-error>Scrivi il nome della persona.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Ruolo</mat-label>
            <input matInput formControlName="ruolo" autocomplete="off" />
          </mat-form-field>
        </div>
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="off" />
            @if (form.controls.email.invalid) {
              <mat-error>Scrivi un’email valida o lascia vuoto.</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Profilo LinkedIn</mat-label>
            <input matInput formControlName="linkedin" placeholder="https://" autocomplete="off" />
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Note</mat-label>
          <textarea matInput formControlName="note" rows="3"></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="btn" mat-dialog-close>Annulla</button>
        <button type="submit" class="btn primario" [disabled]="salvataggio()">Salva contatto</button>
      </mat-dialog-actions>
    </form>
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
export class ContattoDialog {
  protected readonly dati = inject<DatiContattoDialog>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ContattoDialog, Contatto>>(MatDialogRef);
  private readonly store = inject(ContattiStore);
  private readonly notifier = inject(Notifier);

  protected readonly salvataggio = signal(false);
  protected readonly form = new FormGroup({
    nomeAzienda: new FormControl(this.dati.contatto?.nomeAzienda ?? this.dati.nomeAzienda ?? '', { nonNullable: true, validators: [Validators.required] }),
    nome: new FormControl(this.dati.contatto?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
    ruolo: new FormControl(this.dati.contatto?.ruolo ?? '', { nonNullable: true }),
    email: new FormControl(this.dati.contatto?.email ?? '', { nonNullable: true, validators: [Validators.email] }),
    linkedin: new FormControl(this.dati.contatto?.linkedin ?? '', { nonNullable: true }),
    note: new FormControl(this.dati.contatto?.note ?? '', { nonNullable: true }),
  });

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { ...v, nomeAzienda: v.nomeAzienda.trim(), nome: v.nome.trim() };
    this.salvataggio.set(true);
    const op = this.dati.contatto ? this.store.aggiorna(this.dati.contatto.id, input) : this.store.crea(input);
    op.subscribe({
      next: (c) => {
        this.notifier.info('Contatto salvato');
        this.ref.close(c);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

export function apriContatto(dialog: MatDialog, dati: DatiContattoDialog): Promise<Contatto | undefined> {
  return firstValueFrom(dialog.open<ContattoDialog, DatiContattoDialog, Contatto>(ContattoDialog, { data: dati, width: '560px' }).afterClosed());
}
