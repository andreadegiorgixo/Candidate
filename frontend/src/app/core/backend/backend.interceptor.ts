import { HttpErrorResponse, HttpEvent, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { map, Observable, of, OperatorFunction, tap, throwError } from 'rxjs';
import { Account, AccountInput, AuthResponse, Candidatura, CandidaturaInput, Cv, Promemoria } from '../api/models';
import { oggiISO } from '../date';
import {
  aAccountDTO,
  daAccountDTO,
  daAuthDTO,
  dividiCandidatura,
  idDaToken,
  impostazioniDa,
} from './adattatore';
import { components } from './api.generated';
import { ArchivioLocale, ChiaveRisorsa } from './archivio-locale';

type AccountDTO = components['schemas']['AccountDTO'];
type AuthResponseDTO = Required<components['schemas']['AuthResponseDTO']>;
type CandidatureDTO = components['schemas']['CandidatureDTO'];

/**
 * Collega il frontend al backend reale. Fa tre cose, senza che i componenti lo sappiano:
 *  1. traduce richieste e risposte quando il contratto del backend è diverso (`adattatore.ts`);
 *  2. riscrive gli URL che nel backend hanno un'altra forma (`/account/me` → `/account/{id}`);
 *  3. risponde da solo alle risorse che il backend non ha ancora, salvandole nel browser (`archivio-locale.ts`).
 * I CV (file) e il link LinkedIn dell'account sono ormai sul server: le richieste passano così come sono.
 * Quando il backend avrà un endpoint nuovo, basta togliere il ramo corrispondente.
 */

let archivioCondiviso: ArchivioLocale | null = null;

function archivio(): ArchivioLocale {
  return (archivioCondiviso ??= new ArchivioLocale());
}

/** Usato dai test per sostituire il deposito. */
export function impostaArchivioLocale(a: ArchivioLocale | null): void {
  archivioCondiviso = a;
}

const RISORSE: Record<string, ChiaveRisorsa> = {
  colloquio: 'colloqui',
  contatto: 'contatti',
  modello: 'modelli',
  offerta: 'offerte',
};

/** Trasforma il corpo delle risposte riuscite, lasciando passare tutti gli altri eventi. */
function conCorpo<T, U>(f: (corpo: T) => U): OperatorFunction<HttpEvent<unknown>, HttpEvent<unknown>> {
  return map((ev) => (ev instanceof HttpResponse ? ev.clone({ body: f(ev.body as T) }) : ev));
}

function dopoSuccesso(f: () => void): OperatorFunction<HttpEvent<unknown>, HttpEvent<unknown>> {
  return tap((ev) => {
    if (ev instanceof HttpResponse) f();
  });
}

function risposta(req: HttpRequest<unknown>, body: unknown, status = 200): Observable<HttpEvent<unknown>> {
  return of(new HttpResponse({ status, body, url: req.url }));
}

/** Errore nello stesso formato (RFC 9457) che manda il backend. */
function errore(req: HttpRequest<unknown>, status: number, detail: string): Observable<never> {
  const error = { type: 'about:blank', title: 'Errore', status, detail };
  return throwError(() => new HttpErrorResponse({ status, error, url: req.url, statusText: detail }));
}

export const backendInterceptor: HttpInterceptorFn = (req, next) => {
  const m = /^\/api(\/[^?]*)/.exec(req.url);
  if (!m) return next(req);
  const percorso = m[1].replace(/\/$/, '');
  const metodo = req.method;
  const arch = archivio();
  const id = idDaToken(req.headers.get('Authorization'));
  const oggi = oggiISO();

  // ---- accesso: nessun token ----
  if (metodo === 'POST' && (percorso === '/auth/login' || percorso === '/auth/register')) {
    return next(req).pipe(conCorpo<AuthResponseDTO, AuthResponse>((b) => daAuthDTO(b, arch.impostazioni(b.account.id!))));
  }

  // Senza un token valido il backend risponde 401 da solo; le risorse locali lo imitano.
  if (id === null) {
    const locale = /^\/(colloquio|contatto|modello|offerta|azienda)(\/|$)/.test(percorso);
    return locale ? errore(req, 401, 'Sessione scaduta') : next(req);
  }

  // ---- account ----
  if (percorso === '/account/me') {
    if (metodo === 'GET') {
      return next(req).pipe(conCorpo<AccountDTO, Account>((b) => daAccountDTO(b, arch.impostazioni(id))));
    }
    if (metodo === 'PUT') {
      const input = req.body as AccountInput;
      return next(req.clone({ url: `/api/account/${id}`, body: aAccountDTO(input) })).pipe(
        conCorpo<AccountDTO, Account>((b) => {
          arch.salvaImpostazioni(id, impostazioniDa(input));
          return daAccountDTO(b, impostazioniDa(input));
        }),
      );
    }
    if (metodo === 'DELETE') {
      return next(req.clone({ url: `/api/account/delete/${id}` })).pipe(dopoSuccesso(() => arch.elimina(id)));
    }
  }

  // ---- candidature ----
  if (percorso === '/candidatura') {
    if (metodo === 'GET') {
      return next(req).pipe(conCorpo<CandidatureDTO[], Candidatura[]>((l) => arch.arricchisci(id, l, oggi, true)));
    }
    if (metodo === 'POST') {
      const { dto, extra } = dividiCandidatura(req.body as CandidaturaInput);
      return next(req.clone({ body: dto })).pipe(
        conCorpo<CandidatureDTO, Candidatura>((b) => arch.salvaCandidatura(id, b, extra, oggi)),
      );
    }
  }

  let r = /^\/candidatura\/(\d+)$/.exec(percorso);
  if (r) {
    if (metodo === 'GET') {
      return next(req).pipe(conCorpo<CandidatureDTO, Candidatura>((b) => arch.arricchisci(id, [b], oggi, false)[0]));
    }
    if (metodo === 'PUT') {
      const { dto, extra } = dividiCandidatura(req.body as CandidaturaInput);
      return next(req.clone({ body: dto })).pipe(
        conCorpo<CandidatureDTO, Candidatura>((b) => arch.salvaCandidatura(id, b, extra, oggi)),
      );
    }
  }

  r = /^\/candidatura\/delete\/(\d+)$/.exec(percorso);
  if (r && metodo === 'DELETE') {
    const idC = Number(r[1]);
    return next(req).pipe(dopoSuccesso(() => arch.rimuoviCandidatura(id, idC)));
  }

  r = /^\/candidatura\/(\d+)\/storico$/.exec(percorso);
  if (r && metodo === 'GET') {
    const idC = Number(r[1]);
    const noto = arch.storico(id, idC);
    if (noto) return risposta(req, noto);
    // Storico non ancora ricostruito: si legge la candidatura, che lo crea.
    return next(req.clone({ url: `/api/candidatura/${idC}` })).pipe(
      conCorpo<CandidatureDTO, unknown>((b) => {
        arch.arricchisci(id, [b], oggi, false);
        return arch.storico(id, idC) ?? [];
      }),
    );
  }

  // ---- CV: file sul server; qui si tengono allineati gli `idCv` salvati nel browser ----
  if (percorso === '/cv' && metodo === 'GET') {
    return next(req).pipe(
      conCorpo<Cv[], Cv[]>((lista) => {
        const presenti = new Set(lista.map((c) => c.id));
        arch.scollegaCv(id, (idCv) => !presenti.has(idCv));
        return lista;
      }),
    );
  }
  r = /^\/cv\/(\d+)$/.exec(percorso);
  if (r && metodo === 'DELETE') {
    const idCv = Number(r[1]);
    return next(req).pipe(dopoSuccesso(() => arch.scollegaCv(id, (x) => x === idCv)));
  }

  // ---- risorse che il backend non ha: restano nel browser ----
  r = /^\/(colloquio|contatto|modello|offerta)(?:\/(\d+))?$/.exec(percorso);
  if (r) {
    const chiave = RISORSE[r[1]];
    const idR = r[2] ? Number(r[2]) : null;
    if (idR === null && metodo === 'GET') return risposta(req, arch.elenco(id, chiave));
    if (idR === null && metodo === 'POST') return risposta(req, arch.crea(id, chiave, req.body as object), 201);
    if (idR !== null && metodo === 'PUT') {
      const aggiornato = arch.aggiorna(id, chiave, idR, req.body as object);
      return aggiornato ? risposta(req, aggiornato) : errore(req, 404, 'Elemento non trovato');
    }
    if (idR !== null && metodo === 'DELETE') {
      return arch.eliminaRisorsa(id, chiave, idR) ? risposta(req, null, 204) : errore(req, 404, 'Elemento non trovato');
    }
  }

  r = /^\/azienda\/([^/]+)\/promemoria$/.exec(percorso);
  if (r) {
    const azienda = decodeURIComponent(r[1]);
    if (metodo === 'GET') return risposta(req, arch.promemoria(id, azienda));
    if (metodo === 'PUT') return risposta(req, arch.salvaPromemoria(id, azienda, req.body as Promemoria));
  }

  // Tutto il resto (per esempio le città) va al backend così com'è.
  return next(req);
};
