import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { delay, mergeMap } from 'rxjs/operators';
import { ErroreMock, MockDb } from './mock-db';

/**
 * Interceptor HTTP attivo solo in sviluppo (vedi `environment.development.ts`).
 * Simula il contratto descritto nel brief: i componenti non sanno che esiste.
 *
 * Per provare gli stati di errore e di caricamento, da console del browser:
 *   sessionStorage.setItem('candidate.mock.errore', '1')   -> ogni GET risponde 500
 *   sessionStorage.setItem('candidate.mock.lento', '4000') -> ogni risposta arriva dopo 4 secondi
 */

let db = new MockDb();

/** Riporta i dati al seme iniziale (usato nei test). */
export function reimpostaMock(oggi?: string): void {
  db = new MockDb(oggi);
}

function ritardo(): number {
  const forzato = Number(sessionStorage.getItem('candidate.mock.lento'));
  return forzato > 0 ? forzato : 90 + Math.floor(Math.random() * 110);
}

function ok<T>(req: HttpRequest<unknown>, body: T, stato = 200): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status: stato, body, url: req.url })).pipe(delay(ritardo()));
}

function errore(req: HttpRequest<unknown>, e: ErroreMock): Observable<never> {
  const problema = { type: 'about:blank', title: 'Errore', status: e.stato, detail: e.dettaglio, ...(e.errori ? { errors: e.errori } : {}) };
  return timer(ritardo()).pipe(
    mergeMap(() => throwError(() => new HttpErrorResponse({ status: e.stato, error: problema, url: req.url, statusText: e.dettaglio }))),
  );
}

type Corpo = Record<string, unknown>;

function campiCv(corpo: unknown): [string | null, File | null] {
  const form = corpo as FormData;
  const file = form.get('file');
  return [form.get('nome') as string | null, file instanceof File ? file : null];
}

export const mockInterceptor: HttpInterceptorFn = (req, next) => {
  const m = /^\/api(\/[^?]*)/.exec(req.url);
  if (!m) return next(req);
  const percorso = m[1].replace(/\/$/, '');
  const metodo = req.method;
  const corpo = req.body as never;

  try {
    // Autenticazione: nessun token richiesto.
    if (metodo === 'POST' && percorso === '/auth/login') {
      const { email, password } = corpo as { email: string; password: string };
      return ok(req, db.login(email, password));
    }
    if (metodo === 'POST' && percorso === '/auth/register') return ok(req, db.registra(corpo), 201);

    const id = db.idDaToken((req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/, '') || null);

    if (metodo === 'GET' && sessionStorage.getItem('candidate.mock.errore') === '1') {
      return errore(req, new ErroreMock(500, 'Errore interno del server'));
    }

    if (percorso === '/account/me') {
      if (metodo === 'GET') return ok(req, db.account(id));
      if (metodo === 'PUT') return ok(req, db.aggiornaAccount(id, corpo));
      if (metodo === 'DELETE') {
        db.eliminaAccount(id);
        return ok(req, null, 204);
      }
    }

    if (percorso === '/candidatura') {
      if (metodo === 'GET') return ok(req, db.candidature(id));
      if (metodo === 'POST') return ok(req, db.creaCandidatura(id, corpo), 201);
    }
    let r = /^\/candidatura\/(\d+)$/.exec(percorso);
    if (r) {
      if (metodo === 'GET') return ok(req, db.candidatura(id, Number(r[1])));
      if (metodo === 'PUT') return ok(req, db.aggiornaCandidatura(id, Number(r[1]), corpo));
    }
    r = /^\/candidatura\/delete\/(\d+)$/.exec(percorso);
    if (r && metodo === 'DELETE') {
      db.eliminaCandidatura(id, Number(r[1]));
      return ok(req, null, 204);
    }
    r = /^\/candidatura\/(\d+)\/storico$/.exec(percorso);
    if (r && metodo === 'GET') return ok(req, db.storico(id, Number(r[1])));

    if (percorso === '/citta') {
      if (metodo === 'GET') return ok(req, db.elencoCitta());
      if (metodo === 'POST') return ok(req, db.creaCitta(corpo), 201);
    }

    // CV: multipart con `nome` e `file`, come il backend vero.
    if (percorso === '/cv') {
      if (metodo === 'GET') return ok(req, db.cv(id));
      if (metodo === 'POST') return ok(req, db.creaCv(id, ...campiCv(corpo)), 201);
    }
    r = /^\/cv\/(\d+)(\/file)?$/.exec(percorso);
    if (r) {
      const idCv = Number(r[1]);
      if (r[2] && metodo === 'GET') return ok(req, db.scaricaCv(id, idCv));
      if (!r[2] && metodo === 'PUT') return ok(req, db.aggiornaCv(id, idCv, ...campiCv(corpo)));
      if (!r[2] && metodo === 'DELETE') {
        db.eliminaCv(id, idCv);
        return ok(req, null, 204);
      }
    }

    const risorse: Record<string, Record<'elenco' | 'crea' | 'aggiorna' | 'elimina', (...a: never[]) => unknown>> = {
      colloquio: { elenco: db.colloqui, crea: db.creaColloquio, aggiorna: db.aggiornaColloquio, elimina: db.eliminaColloquio },
      contatto: { elenco: db.contatti, crea: db.creaContatto, aggiorna: db.aggiornaContatto, elimina: db.eliminaContatto },
      modello: { elenco: db.modelli, crea: db.creaModello, aggiorna: db.aggiornaModello, elimina: db.eliminaModello },
      offerta: { elenco: db.offerte, crea: db.creaOfferta, aggiorna: db.aggiornaOfferta, elimina: db.eliminaOfferta },
    };
    r = /^\/(colloquio|contatto|modello|offerta)(?:\/(\d+))?$/.exec(percorso);
    if (r) {
      const ris = risorse[r[1]];
      const idR = r[2] ? Number(r[2]) : null;
      const chiama = (f: (...a: never[]) => unknown, ...args: unknown[]) => f.apply(db, args as never[]);
      if (idR === null && metodo === 'GET') return ok(req, chiama(ris['elenco'], id));
      if (idR === null && metodo === 'POST') return ok(req, chiama(ris['crea'], id, corpo), 201);
      if (idR !== null && metodo === 'PUT') return ok(req, chiama(ris['aggiorna'], id, idR, corpo));
      if (idR !== null && metodo === 'DELETE') {
        chiama(ris['elimina'], id, idR);
        return ok(req, null, 204);
      }
    }

    r = /^\/azienda\/([^/]+)\/promemoria$/.exec(percorso);
    if (r) {
      const nome = decodeURIComponent(r[1]);
      if (metodo === 'GET') return ok(req, db.promemoria(id, nome));
      if (metodo === 'PUT') return ok(req, db.aggiornaPromemoria(id, nome, corpo as Corpo as never));
    }

    return errore(req, new ErroreMock(404, 'Risorsa non trovata'));
  } catch (e) {
    if (e instanceof ErroreMock) return errore(req, e);
    throw e;
  }
};
