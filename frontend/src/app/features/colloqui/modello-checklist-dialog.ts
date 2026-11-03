import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CHECKLIST_PREDEFINITA, ChecklistModello } from '../../core/checklist-modello';
import { Notifier } from '../../core/notifier';

/** Modifica il modello della checklist di preparazione, usato per i nuovi colloqui. */
@Component({
  selector: 'app-modello-checklist-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Modello di preparazione</h2>
    <mat-dialog-content>
      <p class="aiuto">Una voce per riga. Il modello vale per i colloqui che aggiungerai da ora: quelli già creati restano come sono.</p>
      <mat-form-field appearance="outline">
        <mat-label>Voci della checklist</mat-label>
        <textarea matInput [formControl]="testo" rows="8"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn testo" (click)="ripristina()">Ripristina il modello iniziale</button>
      <button type="button" class="btn" mat-dialog-close>Annulla</button>
      <button type="button" class="btn primario" (click)="salva()">Salva modello</button>
    </mat-dialog-actions>
  `,
  styles: `
    .aiuto {
      color: var(--testo-2);
      margin-bottom: 14px;
    }
    mat-dialog-actions {
      padding: 8px 24px 20px;
      gap: 8px;
      flex-wrap: wrap;
    }
  `,
})
export class ModelloChecklistDialog {
  private readonly modello = inject(ChecklistModello);
  private readonly ref = inject(MatDialogRef<ModelloChecklistDialog>);
  private readonly notifier = inject(Notifier);

  protected readonly testo = new FormControl(this.modello.voci().join('\n'), { nonNullable: true });

  protected ripristina(): void {
    this.testo.setValue(CHECKLIST_PREDEFINITA.join('\n'));
  }

  protected salva(): void {
    this.modello.salva(this.testo.value.split('\n'));
    this.notifier.info('Modello salvato');
    this.ref.close();
  }
}
