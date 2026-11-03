import { backendInterceptor } from '../app/core/backend/backend.interceptor';
import { Environment } from './environment.model';

/** Sviluppo contro il backend reale: `/api` passa dal proxy verso `localhost:8080` (vedi `proxy.conf.json`). */
export const environment: Environment = {
  production: false,
  useMocks: false,
  apiUrl: '/api',
  interceptors: [backendInterceptor],
  demo: null,
  rotteSviluppo: [{ path: 'stile', loadChildren: () => import('../app/features/stile/stile.routes').then((m) => m.STILE_ROUTES) }],
};
