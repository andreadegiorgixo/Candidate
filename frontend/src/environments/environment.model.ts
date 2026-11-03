import { HttpInterceptorFn } from '@angular/common/http';
import { Routes } from '@angular/router';

/** Configurazione pubblica: qui non vanno mai segreti. */
export interface Environment {
  production: boolean;
  useMocks: boolean;
  apiUrl: string;
  /** Interceptor aggiuntivi, caricati solo in sviluppo (il mock HTTP). */
  interceptors: HttpInterceptorFn[];
  /** Rotte presenti solo in sviluppo, per esempio la pagina `/stile`. */
  rotteSviluppo: Routes;
  /** Credenziali dell'utente di prova del mock: solo in sviluppo, in produzione `null`. */
  demo: { email: string; password: string } | null;
}
