import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Account,
  AccountInput,
  AuthResponse,
  Candidatura,
  CandidaturaInput,
  Citta,
  CittaInput,
  Colloquio,
  ColloquioInput,
  Contatto,
  ContattoInput,
  Cv,
  CvInput,
  LoginRequest,
  Modello,
  ModelloInput,
  Offerta,
  OffertaInput,
  Promemoria,
  RegisterRequest,
  StoricoEvento,
} from './models';

/** Unico punto in cui si conoscono gli URL del backend. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  login(r: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/login`, r);
  }
  registra(r: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/auth/register`, r);
  }

  account(): Observable<Account> {
    return this.http.get<Account>(`${this.base}/account/me`);
  }
  aggiornaAccount(i: AccountInput): Observable<Account> {
    return this.http.put<Account>(`${this.base}/account/me`, i);
  }
  eliminaAccount(): Observable<void> {
    return this.http.delete<void>(`${this.base}/account/me`);
  }

  candidature(): Observable<Candidatura[]> {
    return this.http.get<Candidatura[]>(`${this.base}/candidatura`);
  }
  candidatura(id: number): Observable<Candidatura> {
    return this.http.get<Candidatura>(`${this.base}/candidatura/${id}`);
  }
  creaCandidatura(i: CandidaturaInput): Observable<Candidatura> {
    return this.http.post<Candidatura>(`${this.base}/candidatura`, i);
  }
  aggiornaCandidatura(id: number, i: CandidaturaInput): Observable<Candidatura> {
    return this.http.put<Candidatura>(`${this.base}/candidatura/${id}`, i);
  }
  eliminaCandidatura(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/candidatura/delete/${id}`);
  }
  storico(id: number): Observable<StoricoEvento[]> {
    return this.http.get<StoricoEvento[]>(`${this.base}/candidatura/${id}/storico`);
  }

  citta(): Observable<Citta[]> {
    return this.http.get<Citta[]>(`${this.base}/citta`);
  }
  creaCitta(i: CittaInput): Observable<Citta> {
    return this.http.post<Citta>(`${this.base}/citta`, i);
  }

  colloqui(): Observable<Colloquio[]> {
    return this.http.get<Colloquio[]>(`${this.base}/colloquio`);
  }
  creaColloquio(i: ColloquioInput): Observable<Colloquio> {
    return this.http.post<Colloquio>(`${this.base}/colloquio`, i);
  }
  aggiornaColloquio(id: number, i: ColloquioInput): Observable<Colloquio> {
    return this.http.put<Colloquio>(`${this.base}/colloquio/${id}`, i);
  }
  eliminaColloquio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/colloquio/${id}`);
  }

  contatti(): Observable<Contatto[]> {
    return this.http.get<Contatto[]>(`${this.base}/contatto`);
  }
  creaContatto(i: ContattoInput): Observable<Contatto> {
    return this.http.post<Contatto>(`${this.base}/contatto`, i);
  }
  aggiornaContatto(id: number, i: ContattoInput): Observable<Contatto> {
    return this.http.put<Contatto>(`${this.base}/contatto/${id}`, i);
  }
  eliminaContatto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/contatto/${id}`);
  }

  promemoria(azienda: string): Observable<Promemoria> {
    return this.http.get<Promemoria>(`${this.base}/azienda/${encodeURIComponent(azienda)}/promemoria`);
  }
  aggiornaPromemoria(azienda: string, p: Promemoria): Observable<Promemoria> {
    return this.http.put<Promemoria>(`${this.base}/azienda/${encodeURIComponent(azienda)}/promemoria`, p);
  }

  cv(): Observable<Cv[]> {
    return this.http.get<Cv[]>(`${this.base}/cv`);
  }
  creaCv(i: CvInput): Observable<Cv> {
    return this.http.post<Cv>(`${this.base}/cv`, i);
  }
  aggiornaCv(id: number, i: CvInput): Observable<Cv> {
    return this.http.put<Cv>(`${this.base}/cv/${id}`, i);
  }
  eliminaCv(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/cv/${id}`);
  }

  modelli(): Observable<Modello[]> {
    return this.http.get<Modello[]>(`${this.base}/modello`);
  }
  creaModello(i: ModelloInput): Observable<Modello> {
    return this.http.post<Modello>(`${this.base}/modello`, i);
  }
  aggiornaModello(id: number, i: ModelloInput): Observable<Modello> {
    return this.http.put<Modello>(`${this.base}/modello/${id}`, i);
  }
  eliminaModello(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/modello/${id}`);
  }

  offerte(): Observable<Offerta[]> {
    return this.http.get<Offerta[]>(`${this.base}/offerta`);
  }
  creaOfferta(i: OffertaInput): Observable<Offerta> {
    return this.http.post<Offerta>(`${this.base}/offerta`, i);
  }
  aggiornaOfferta(id: number, i: OffertaInput): Observable<Offerta> {
    return this.http.put<Offerta>(`${this.base}/offerta/${id}`, i);
  }
  eliminaOfferta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/offerta/${id}`);
  }
}
