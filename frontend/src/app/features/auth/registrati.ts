import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth.service';
import { dettaglioConflitto, erroriCampo, messaggioErrore } from '../../core/errori';
import { CorniceAccesso } from './cornice';

@Component({
  selector: 'app-registrati',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink, CorniceAccesso],
  template: `
    <app-cornice-accesso titolo="Crea il tuo account" sottotitolo="Ti servono pochi secondi. Poi aggiungi la prima candidatura.">
      <form [formGroup]="form" (ngSubmit)="invia()" novalidate>
        <div class="coppia">
          <mat-form-field appearance="outline">
            <mat-label>Nome</mat-label>
            <input matInput formControlName="nome" autocomplete="given-name" />
            @if (form.controls.nome.invalid) {
              <mat-error>{{ errore('nome', 'Inserisci il tuo nome.') }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Cognome</mat-label>
            <input matInput formControlName="cognome" autocomplete="family-name" />
            @if (form.controls.cognome.invalid) {
              <mat-error>{{ errore('cognome', 'Inserisci il tuo cognome.') }}</mat-error>
            }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
          @if (form.controls.email.invalid) {
            <mat-error>{{ errore('email', 'Scrivi un’email valida, per esempio nome@esempio.it.') }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>Almeno 8 caratteri.</mat-hint>
          @if (form.controls.password.invalid) {
            <mat-error>{{ errore('password', 'Scegli una password di almeno 8 caratteri.') }}</mat-error>
          }
        </mat-form-field>
        @if (erroreGenerale()) {
          <p class="errore" role="alert">{{ erroreGenerale() }}</p>
        }
        <button type="submit" class="btn primario invia" [disabled]="inCorso()">
          {{ inCorso() ? 'Creazione in corso' : 'Crea account' }}
        </button>
      </form>
      <p class="alt">Hai già un account? <a routerLink="/accedi">Accedi</a></p>
    </app-cornice-accesso>
  `,
  styles: `
    form {
      display: grid;
      gap: 2px;
    }
    .coppia {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .invia {
      margin-top: 10px;
      padding-block: 12px;
    }
    .errore {
      color: var(--errore);
      font-weight: 500;
      margin: 4px 0 0;
    }
    .alt {
      margin-top: 22px;
    }
    @media (max-width: 480px) {
      .coppia {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class Registrati {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly inCorso = signal(false);
  protected readonly erroreGenerale = signal('');

  protected readonly form = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    cognome: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
  });

  protected errore(campo: 'nome' | 'cognome' | 'email' | 'password', predefinito: string): string {
    const e = this.form.controls[campo].getError('server') as string | null;
    return e ?? predefinito;
  }

  protected invia(): void {
    this.erroreGenerale.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.inCorso.set(true);
    this.auth.registra(this.form.getRawValue()).subscribe({
      next: () => void this.router.navigateByUrl('/oggi'),
      error: (e: unknown) => {
        this.inCorso.set(false);
        const conflitto = dettaglioConflitto(e);
        const campi = erroriCampo(e);
        if (conflitto) {
          this.form.controls.email.setErrors({ server: `${conflitto}. Accedi oppure usa un’altra email.` });
          this.form.controls.email.markAsTouched();
        } else if (campi) {
          for (const [campo, msg] of Object.entries(campi)) {
            const c = this.form.get(campo);
            c?.setErrors({ server: msg });
            c?.markAsTouched();
          }
        } else {
          this.erroreGenerale.set(messaggioErrore(e));
        }
      },
    });
  }
}
