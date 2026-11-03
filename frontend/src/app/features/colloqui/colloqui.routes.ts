import { Routes } from '@angular/router';

export const COLLOQUI_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./colloqui-pagina').then((m) => m.ColloquiPagina), title: 'Colloqui' },
];
