import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Cv } from '../../core/api/models';
import { CvStore } from '../../core/data/archivi';
import { Notifier } from '../../core/notifier';

@Component({
  selector: 'app-cv-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ cv ? 'Modifica versione del CV' : 'Aggiungi versione del CV' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salva()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" placeholder="Per esempio: CV per ruoli backend" required />
          @if (form.controls.nome.invalid) {
            <mat-error>Dai un nome a questa versione.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Link al file</mat-label>
          <input matInput formControlName="url" placeholder="https://" inputmode="url" />
          <mat-hint>Il file resta dove lo tieni tu: qui salvi solo il link.</mat-hint>
          @if (form.controls.url.invalid) {
            <mat-error>Scrivi un link che inizi con http:// o https://.</mat-error>
          }
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button type="button" class="btn" mat-dialog-close>Annulla</button>
        <button type="submit" class="btn primario" [disabled]="salvataggio()">Salva versione</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-dialog-actions {
      padding: 8px 24px 20px;
      gap: 8px;
    }
  `,
})
export class CvDialog {
  protected readonly cv = inject<Cv | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CvDialog, Cv>>(MatDialogRef);
  private readonly store = inject(CvStore);
  private readonly notifier = inject(Notifier);

  protected readonly salvataggio = signal(false);
  protected readonly form = new FormGroup({
    nome: new FormControl(this.cv?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
    url: new FormControl(this.cv?.url ?? '', { nonNullable: true, validators: [Validators.pattern(/^$|^https?:\/\/\S+$/)] }),
  });

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input = { nome: v.nome.trim(), url: v.url.trim() };
    this.salvataggio.set(true);
    const op = this.cv ? this.store.aggiorna(this.cv.id, input) : this.store.crea(input);
    op.subscribe({
      next: (r) => {
        this.notifier.info('Versione del CV salvata');
        this.ref.close(r);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

export function apriCv(dialog: MatDialog, cv: Cv | null): Promise<Cv | undefined> {
  return firstValueFrom(dialog.open<CvDialog, Cv | null, Cv>(CvDialog, { data: cv, width: '520px' }).afterClosed());
}
