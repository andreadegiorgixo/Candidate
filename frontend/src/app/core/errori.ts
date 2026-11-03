import { HttpErrorResponse } from '@angular/common/http';

/** Corpo degli errori del backend (RFC 9457). */
interface Problema {
  detail?: string;
  errors?: Record<string, string>;
}

function problema(e: unknown): Problema | null {
  if (e instanceof HttpErrorResponse && e.error && typeof e.error === 'object') return e.error as Problema;
  return null;
}

export function statoHttp(e: unknown): number | null {
  return e instanceof HttpErrorResponse ? e.status : null;
}

export function eConflitto(e: unknown): boolean {
  return statoHttp(e) === 409;
}

export function eNonTrovato(e: unknown): boolean {
  return statoHttp(e) === 404;
}

/** Messaggio da mostrare all'utente: spiega cosa fare, senza scuse. */
export function messaggioErrore(e: unknown): string {
  const stato = statoHttp(e);
  if (stato === 0) return 'Il server non risponde. Controlla la connessione e riprova.';
  if (stato !== null && stato >= 500) return 'Il server ha avuto un problema. Riprova tra qualche istante.';
  const d = problema(e)?.detail;
  return d ?? 'Non sono riuscito a completare l’operazione. Riprova.';
}

/** Errori di validazione per campo (risposte 400). */
export function erroriCampo(e: unknown): Record<string, string> | null {
  return problema(e)?.errors ?? null;
}

/** Messaggio del backend per un conflitto (risposte 409), da mostrare sul campo. */
export function dettaglioConflitto(e: unknown): string | null {
  return eConflitto(e) ? (problema(e)?.detail ?? 'Questo valore esiste già') : null;
}
