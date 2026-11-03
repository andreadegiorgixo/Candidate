import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';

export interface DatiConferma {
  titolo: string;
  testo: string;
  /** Il verbo del pulsante, lo stesso dell'azione che l'ha aperto. */
  conferma: string;
  pericolo?: boolean;
}

@Component({
  selector: 'app-conferma-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ dati.titolo }}</h2>
    <mat-dialog-content>{{ dati.testo }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" class="btn" mat-dialog-close>Annulla</button>
      <button type="button" class="btn" [class.pericolo]="dati.pericolo" [class.primario]="!dati.pericolo" [mat-dialog-close]="true" cdkFocusInitial>
        {{ dati.conferma }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-actions {
      padding: 8px 24px 20px;
      gap: 8px;
    }
  `,
})
export class ConfermaDialog {
  protected readonly dati = inject<DatiConferma>(MAT_DIALOG_DATA);
}

/** Chiede conferma con lo stesso verbo del pulsante che ha avviato l'azione. */
export async function chiediConferma(dialog: MatDialog, dati: DatiConferma): Promise<boolean> {
  const ref = dialog.open<ConfermaDialog, DatiConferma, boolean>(ConfermaDialog, { data: dati, width: '440px', autoFocus: false });
  return (await firstValueFrom(ref.afterClosed())) === true;
}
