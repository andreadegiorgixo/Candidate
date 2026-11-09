import { Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { authGuard, ospiteGuard } from './core/auth/auth.guard';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'accedi', canActivate: [ospiteGuard], loadComponent: () => import('./features/auth/accedi').then((m) => m.Accedi), title: 'Accedi' },
  { path: 'registrati', canActivate: [ospiteGuard], loadComponent: () => import('./features/auth/registrati').then((m) => m.Registrati), title: 'Registrati' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'oggi' },
      { path: 'oggi', loadComponent: () => import('./features/oggi/oggi-pagina').then((m) => m.OggiPagina), title: 'Oggi' },
      // Andamento è confluito in Oggi: i vecchi link portano lì.
      { path: 'andamento', redirectTo: 'oggi' },
      { path: 'colloqui', loadChildren: () => import('./features/colloqui/colloqui.routes').then((m) => m.COLLOQUI_ROUTES) },
      { path: 'aziende', loadChildren: () => import('./features/aziende/aziende.routes').then((m) => m.AZIENDE_ROUTES) },
      { path: 'materiali', loadChildren: () => import('./features/materiali/materiali.routes').then((m) => m.MATERIALI_ROUTES) },
      { path: 'offerte', loadChildren: () => import('./features/offerte/offerte.routes').then((m) => m.OFFERTE_ROUTES) },
      { path: 'profilo', loadChildren: () => import('./features/profilo/profilo.routes').then((m) => m.PROFILO_ROUTES) },
      { path: 'candidature', loadChildren: () => import('./features/candidature/candidature.routes').then((m) => m.CANDIDATURE_ROUTES) },
      // Pagina `/stile` e altre rotte di sviluppo: nella build di produzione l'elenco è vuoto e il codice non entra nel bundle.
      ...environment.rotteSviluppo,
      { path: '**', loadComponent: () => import('./features/non-trovata/non-trovata').then((m) => m.NonTrovata), title: 'Pagina non trovata' },
    ],
  },
];
