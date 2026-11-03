import { Routes } from '@angular/router';

export const CANDIDATURE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./candidature-pagina').then((m) => m.CandidaturePagina), title: 'Candidature' },
  { path: ':id', loadComponent: () => import('./candidatura-dettaglio').then((m) => m.CandidaturaDettaglio), title: 'Dettaglio candidatura' },
];
