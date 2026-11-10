import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Candidatura } from '../../core/api/models';
import { CandidatureStore } from '../../core/data/archivi';
import { erroriCampo } from '../../core/errori';
import { Notifier } from '../../core/notifier';
import { Orologio } from '../../core/orologio';
import { CampiCandidatura } from '../candidatura-campi/campi-candidatura';
import { creaFormCandidatura, leggiInput } from '../candidatura-campi/form-candidatura';
import { Icona } from '../icona/icona';

/** Pannello laterale con i soli campi obbligatori; «Altri dettagli» mostra il resto. */
@Component({
  selector: 'app-pannello-candidatura',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, CampiCandidatura, Icona],
  template: `
    <header class="testa">
      <h2 mat-dialog-title>Aggiungi candidatura</h2>
      <button type="button" class="btn-icona" aria-label="Chiudi il pannello" mat-dialog-close><app-icona nome="chiudi" /></button>
    </header>
    <mat-dialog-content>
      <app-campi-candidatura [form]="form" [altri]="altri()" />
      <button type="button" class="btn testo" (click)="altri.set(!altri())" [attr.aria-expanded]="altri()">
        {{ altri() ? 'Meno dettagli' : 'Altri dettagli' }}
      </button>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button type="button" class="btn primario" (click)="salva()" [disabled]="salvataggio()">
        {{ salvataggio() ? 'Salvataggio in corso' : 'Salva candidatura' }}
      </button>
      <button type="button" class="btn" mat-dialog-close>Annulla</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .testa {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px 0 0;
    }
    h2 {
      font-size: 22px;
      font-weight: 650;
    }
    mat-dialog-content {
      flex: 1;
      max-height: none;
      padding-top: 12px !important;
    }
    mat-dialog-actions {
      justify-content: flex-start;
      gap: 8px;
      padding: 14px 24px 20px;
      border-top: 1px solid var(--sabbia);
    }
    .btn.testo {
      margin-top: 6px;
    }
  `,
})
export class PannelloCandidatura {
  private readonly ref = inject<MatDialogRef<PannelloCandidatura, Candidatura>>(MatDialogRef);
  private readonly store = inject(CandidatureStore);
  private readonly notifier = inject(Notifier);

  protected readonly form = creaFormCandidatura(null, inject(Orologio).oggi());
  protected readonly altri = signal(false);
  protected readonly salvataggio = signal(false);

  protected salva(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvataggio.set(true);
    this.store.crea(leggiInput(this.form)).subscribe({
      next: (c) => {
        this.notifier.info(`Candidatura per ${c.nomeAzienda} salvata`);
        this.ref.close(c);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        const campi = erroriCampo(e);
        if (campi) for (const [k, m] of Object.entries(campi)) this.form.get(k)?.setErrors({ server: m });
        this.notifier.errore(e, () => this.salva());
      },
    });
  }
}

@Injectable({ providedIn: 'root' })
export class NuovaCandidatura {
  private readonly dialog = inject(MatDialog);

  /** Apre il pannello laterale; restituisce la candidatura salvata, se c'è. */
  apri(): Observable<Candidatura | undefined> {
    return this.dialog
      .open<PannelloCandidatura, void, Candidatura>(PannelloCandidatura, {
        position: { right: '0', top: '0' },
        height: '100vh',
        width: '520px',
        maxWidth: '100vw',
        panelClass: 'pannello-laterale',
        autoFocus: 'first-tabbable',
      })
      .afterClosed();
  }
}
