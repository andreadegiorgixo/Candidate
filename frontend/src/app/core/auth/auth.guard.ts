import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  if (auth.autenticato()) return true;
  return inject(Router).createUrlTree(['/accedi'], { queryParams: { ritorno: state.url } });
};

/** Le pagine di accesso non servono a chi è già dentro. */
export const ospiteGuard: CanActivateFn = () => {
  return inject(Auth).autenticato() ? inject(Router).createUrlTree(['/oggi']) : true;
};
