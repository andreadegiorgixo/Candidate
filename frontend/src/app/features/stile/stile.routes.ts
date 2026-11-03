import { Routes } from '@angular/router';
import { provideGrafici } from '../../shared/grafico/echarts-setup';

export const STILE_ROUTES: Routes = [
  {
    path: '',
    providers: [provideGrafici()],
    loadComponent: () => import('./stile').then((m) => m.Stile),
    title: 'Stile',
  },
];
