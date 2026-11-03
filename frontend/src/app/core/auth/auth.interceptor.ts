import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Auth } from './auth.service';

/** Aggiunge il token alle richieste verso `/api` e gestisce la risposta 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);
  const auth = inject(Auth);
  const eAccesso = req.url.startsWith('/api/auth/');
  const token = auth.token();
  const conToken = token && !eAccesso ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(conToken).pipe(
    catchError((e: unknown) => {
      if (e instanceof HttpErrorResponse && e.status === 401 && !eAccesso) {
        // L'URL del browser è affidabile anche durante la prima navigazione, quando `router.url` è ancora '/'.
        const pagina = location.pathname + location.search;
        auth.esci(pagina.startsWith('/accedi') ? undefined : pagina);
      }
      return throwError(() => e);
    }),
  );
};
