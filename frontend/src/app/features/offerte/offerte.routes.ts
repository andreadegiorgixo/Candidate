import { Routes } from '@angular/router';

export const OFFERTE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./offerte-pagina').then((m) => m.OffertePagina), title: 'Offerte' },
];
