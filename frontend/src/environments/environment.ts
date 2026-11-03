import { backendInterceptor } from '../app/core/backend/backend.interceptor';
import { Environment } from './environment.model';

export const environment: Environment = {
  production: true,
  useMocks: false,
  apiUrl: '/api',
  interceptors: [backendInterceptor],
  rotteSviluppo: [],
  demo: null,
};
