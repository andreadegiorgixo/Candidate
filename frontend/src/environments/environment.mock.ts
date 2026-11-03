import { mockInterceptor } from '../app/core/mock/mock.interceptor';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../app/core/mock/seed';
import { Environment } from './environment.model';

/** Sviluppo senza backend: il mock HTTP risponde al posto della rete (`npm run start:mock`). */
export const environment: Environment = {
  production: false,
  useMocks: true,
  apiUrl: '/api',
  interceptors: [mockInterceptor],
  demo: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  rotteSviluppo: [{ path: 'stile', loadChildren: () => import('../app/features/stile/stile.routes').then((m) => m.STILE_ROUTES) }],
};
