import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { Cv } from '../../core/api/models';
import { CV_ACCEPT, dimensioneLeggibile, erroreFileCv } from '../../core/cv-file';
import { CvStore } from '../../core/data/archivi';
import { erroriCampo } from '../../core/errori';
import { Notifier } from '../../core/notifier';
import { Icona } from '../../shared/icona/icona';

@Component({
  selector: 'app-cv-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, Icona],
  template: `
    <h2 mat-dialog-title>{{ cv ? 'Modifica versione del CV' : 'Aggiungi versione del CV' }}</h2>
    <form [formGroup]="form" (ngSubmit)="salva()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" placeholder="Per esempio: CV per ruoli backend" required />
          @if (form.controls.nome.invalid) {
            <mat-error>{{ form.controls.nome.getError('server') ?? 'Dai un nome a questa versione.' }}</mat-error>
          }
        </mat-form-field>

        <div class="file">
          <span class="etichetta" id="et-file">File del CV</span>
          <div
            class="zona"
            [class.sopra]="trascinando()"
            [class.invalida]="erroreFile()"
            role="group"
            aria-labelledby="et-file"
            (dragover)="trascina($event)"
            (dragleave)="trascinando.set(false)"
            (drop)="rilascia($event)"
          >
            <app-icona nome="materiali" />
            @if (file(); as f) {
              <p class="scelto"><strong>{{ f.name }}</strong> <small>{{ dimensione(f.size) }}</small></p>
            } @else if (cv) {
              <p class="scelto">
                <strong>{{ cv.nomeFile }}</strong> <small>{{ dimensione(cv.dimensione) }} · file attuale</small>
              </p>
            }
            <button type="button" class="btn piccolo" (click)="campo.click()">
              {{ file() ? 'Scegli un altro file' : cv ? 'Sostituisci il file' : 'Scegli un file dal computer' }}
            </button>
            <p class="aiuto">
              {{ cv && !file() ? 'Se non ne scegli un altro, resta quello attuale.' : 'Oppure trascinalo qui.' }}
              PDF, DOC o DOCX, al massimo 5 MB.
            </p>
            <input #campo type="file" hidden [accept]="accept" aria-label="File del CV" (change)="scelto($event)" />
          </div>
          @if (erroreFile(); as e) {
            <p class="errore" role="alert">{{ e }}</p>
          }
        </div>
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

    .etichetta {
      display: block;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 6px;
    }

    .zona {
      display: grid;
      justify-items: center;
      gap: 8px;
      text-align: center;
      padding: 18px 16px;
      border: 2px dashed var(--bordo-forte);
      border-radius: var(--r-campo);
      background: var(--avorio);
      transition: background-color 0.12s;

      &.sopra {
        background: var(--sabbia);
        border-color: var(--verde-testo);
      }

      &.invalida {
        border-color: var(--errore);
      }

      p {
        margin: 0;
      }
    }

    .scelto {
      overflow-wrap: anywhere;

      small {
        display: block;
        color: var(--testo-2);
      }
    }

    .aiuto {
      font-size: 13px;
      color: var(--testo-2);
    }

    .errore {
      margin: 6px 0 0;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--errore);
    }
  `,
})
export class CvDialog {
  protected readonly cv = inject<Cv | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<CvDialog, Cv>>(MatDialogRef);
  private readonly store = inject(CvStore);
  private readonly notifier = inject(Notifier);

  protected readonly accept = CV_ACCEPT;
  protected readonly dimensione = dimensioneLeggibile;
  protected readonly salvataggio = signal(false);
  protected readonly file = signal<File | null>(null);
  protected readonly erroreFile = signal<string | null>(null);
  protected readonly trascinando = signal(false);
  protected readonly form = new FormGroup({
    nome: new FormControl(this.cv?.nome ?? '', { nonNullable: true, validators: [Validators.required] }),
  });

  protected scelto(ev: Event): void {
    const campo = ev.target as HTMLInputElement;
    this.accetta(campo.files?.[0] ?? null);
    // Permette di scegliere di nuovo lo stesso file dopo un errore.
    campo.value = '';
  }

  protected trascina(ev: DragEvent): void {
    ev.preventDefault();
    this.trascinando.set(true);
  }

  protected rilascia(ev: DragEvent): void {
    ev.preventDefault();
    this.trascinando.set(false);
    const files = ev.dataTransfer?.files;
    if (files && files.length > 1) {
      this.erroreFile.set('Trascina un solo file.');
      return;
    }
    this.accetta(files?.[0] ?? null);
  }

  private accetta(f: File | null): void {
    if (!f) return;
    const errore = erroreFileCv(f);
    this.erroreFile.set(errore);
    // Un file non valido non sostituisce quello già scelto.
    if (!errore) this.file.set(f);
  }

  protected salva(): void {
    const senzaFile = !this.file() && !this.cv;
    if (senzaFile && !this.erroreFile()) this.erroreFile.set('Scegli il file del tuo CV.');
    if (this.form.invalid || senzaFile) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvataggio.set(true);
    const input = { nome: this.form.getRawValue().nome.trim(), file: this.file() };
    const op = this.cv ? this.store.aggiorna(this.cv.id, input) : this.store.crea(input);
    op.subscribe({
      next: (r) => {
        this.notifier.info('Versione del CV salvata');
        this.ref.close(r);
      },
      error: (e: unknown) => {
        this.salvataggio.set(false);
        const errori = erroriCampo(e);
        if (errori?.['nome'] || errori?.['file']) {
          if (errori['nome']) this.form.controls.nome.setErrors({ server: errori['nome'] });
          if (errori['file']) this.erroreFile.set(errori['file']);
        } else {
          this.notifier.errore(e, () => this.salva());
        }
      },
    });
  }
}

export function apriCv(dialog: MatDialog, cv: Cv | null): Promise<Cv | undefined> {
  return firstValueFrom(dialog.open<CvDialog, Cv | null, Cv>(CvDialog, { data: cv, width: '520px' }).afterClosed());
}
