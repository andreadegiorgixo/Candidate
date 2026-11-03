import { Routes } from '@angular/router';

export const PROFILO_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./profilo-pagina').then((m) => m.ProfiloPagina), title: 'Profilo' },
];
