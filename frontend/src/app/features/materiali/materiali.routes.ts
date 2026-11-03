import { Routes } from '@angular/router';

export const MATERIALI_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./materiali-pagina').then((m) => m.MaterialiPagina), title: 'Materiali' },
];
