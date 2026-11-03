import { Routes } from '@angular/router';

export const AZIENDE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./aziende-pagina').then((m) => m.AziendePagina), title: 'Aziende' },
  { path: ':chiave', loadComponent: () => import('./azienda-dettaglio').then((m) => m.AziendaDettaglio), title: 'Azienda' },
];
