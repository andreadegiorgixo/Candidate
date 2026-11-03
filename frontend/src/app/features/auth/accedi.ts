import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../core/auth/auth.service';
import { erroriCampo, messaggioErrore, statoHttp } from '../../core/errori';
import { environment } from '../../../environments/environment';
import { CorniceAccesso } from './cornice';

@Component({
  selector: 'app-accedi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, RouterLink, CorniceAccesso],
  template: `
    <app-cornice-accesso titolo="Accedi" sottotitolo="Riprendi da dove avevi lasciato.">
      <form [formGroup]="form" (ngSubmit)="invia()" novalidate>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="username" inputmode="email" />
          @if (form.controls.email.hasError('required')) {
            <mat-error>Inserisci la tua email.</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Scrivi un’email valida, per esempio nome&#64;esempio.it.</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Password</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password" />
          @if (form.controls.password.hasError('required')) {
            <mat-error>Inserisci la password.</mat-error>
          } @else if (form.controls.password.hasError('server')) {
            <mat-error>{{ form.controls.password.getError('server') }}</mat-error>
          }
        </mat-form-field>
        @if (erroreGenerale()) {
          <p class="errore" role="alert">{{ erroreGenerale() }}</p>
        }
        <button type="submit" class="btn primario invia" [disabled]="inCorso()">
          {{ inCorso() ? 'Accesso in corso' : 'Accedi' }}
        </button>
      </form>
      <p class="alt">Non hai un account? <a routerLink="/registrati">Registrati</a></p>
      @if (demo; as d) {
        <p class="prova">
          Dati di prova: <strong>{{ d.email }}</strong> con password <strong>{{ d.password }}</strong>.
          <button type="button" class="btn testo piccolo" (click)="compilaDemo()">Compila i campi</button>
        </p>
      }
    </app-cornice-accesso>
  `,
  styles: `
    form {
      display: grid;
      gap: 2px;
    }
    .invia {
      margin-top: 6px;
      padding-block: 12px;
    }
    .errore {
      color: var(--errore);
      font-weight: 500;
      margin: 0 0 8px;
    }
    .alt {
      margin-top: 22px;
    }
    .prova {
      margin-top: 22px;
      padding: 12px 14px;
      border-radius: var(--r-campo);
      background: var(--sabbia);
      color: var(--testo-2);
      font-size: 14px;
    }
  `,
})
export class Accedi {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly demo = environment.demo;
  protected readonly inCorso = signal(false);
  protected readonly erroreGenerale = signal('');

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected compilaDemo(): void {
    if (this.demo) this.form.setValue(this.demo);
  }

  protected invia(): void {
    this.erroreGenerale.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.inCorso.set(true);
    this.auth.accedi(this.form.getRawValue()).subscribe({
      next: () => {
        const ritorno = this.route.snapshot.queryParamMap.get('ritorno');
        void this.router.navigateByUrl(ritorno && ritorno.startsWith('/') && !ritorno.startsWith('//') ? ritorno : '/oggi');
      },
      error: (e: unknown) => {
        this.inCorso.set(false);
        if (statoHttp(e) === 401) {
          this.form.controls.password.setErrors({ server: 'Email o password non corrette. Controlla i dati e riprova.' });
          this.form.controls.password.markAsTouched();
        } else if (erroriCampo(e)) {
          this.erroreGenerale.set('I dati inseriti non sono validi. Controllali e riprova.');
        } else {
          this.erroreGenerale.set(messaggioErrore(e));
        }
      },
    });
  }
}
