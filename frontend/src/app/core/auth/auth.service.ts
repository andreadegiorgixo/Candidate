import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Api } from '../api/api.service';
import { Account, AccountInput, AuthResponse, LoginRequest, RegisterRequest } from '../api/models';
import { svuotaTuttiGliArchivi } from '../data/archivi';

const CHIAVE = 'candidate.token';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(Api);
  private readonly router = inject(Router);

  /** Il token sta in `sessionStorage`: si perde chiudendo la scheda. */
  readonly token = signal<string | null>(sessionStorage.getItem(CHIAVE));
  readonly account = signal<Account | null>(null);
  readonly autenticato = computed(() => this.token() !== null);

  readonly sogliaAttesa = computed(() => this.account()?.sogliaAttesaGiorni ?? 14);
  readonly obiettivoSettimanale = computed(() => this.account()?.obiettivoSettimanale ?? 10);

  accedi(r: LoginRequest): Observable<AuthResponse> {
    return this.api.login(r).pipe(tap((x) => this.salva(x)));
  }

  registra(r: RegisterRequest): Observable<AuthResponse> {
    return this.api.registra(r).pipe(tap((x) => this.salva(x)));
  }

  private salva(r: AuthResponse): void {
    sessionStorage.setItem(CHIAVE, r.token);
    this.token.set(r.token);
    this.account.set(r.account);
  }

  /** Legge l'account corrente: serve dopo un ricaricamento, quando il token c'è ma l'account no. */
  caricaAccount(): void {
    if (!this.autenticato() || this.account()) return;
    this.api.account().subscribe({ next: (a) => this.account.set(a), error: () => undefined });
  }

  aggiornaAccount(i: AccountInput): Observable<Account> {
    return this.api.aggiornaAccount(i).pipe(tap((a) => this.account.set(a)));
  }

  /** Cambia solo il link LinkedIn (vuoto = rimosso), lasciando invariato il resto dell'account. */
  impostaLinkedin(linkedin: string): Observable<Account> {
    const { nome, cognome, email, obiettivoSettimanale, sogliaAttesaGiorni } = this.account()!;
    return this.aggiornaAccount({ nome, cognome, email, obiettivoSettimanale, sogliaAttesaGiorni, linkedin });
  }

  /** Esce e torna a `/accedi`, conservando la pagina di destinazione se richiesto. */
  esci(ritorno?: string): void {
    // Più richieste possono fallire insieme con 401: la prima conserva la pagina di destinazione.
    if (this.token() === null && ritorno === undefined) return;
    sessionStorage.removeItem(CHIAVE);
    this.token.set(null);
    this.account.set(null);
    svuotaTuttiGliArchivi();
    void this.router.navigate(['/accedi'], ritorno ? { queryParams: { ritorno } } : {});
  }
}
