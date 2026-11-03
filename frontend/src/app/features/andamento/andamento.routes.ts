import { Routes } from '@angular/router';
import { provideGrafici } from '../../shared/grafico/echarts-setup';

/** ECharts si carica solo qui: le altre pagine non pagano il suo peso. */
export const ANDAMENTO_ROUTES: Routes = [
  {
    path: '',
    providers: [provideGrafici()],
    loadComponent: () => import('./andamento-pagina').then((m) => m.AndamentoPagina),
    title: 'Andamento',
  },
];
