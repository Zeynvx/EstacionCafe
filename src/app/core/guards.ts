import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from './store';
export const customerGuard: CanActivateFn = () =>
  inject(Store).user()?.rol === 'Cliente' || inject(Router).createUrlTree(['/login']);
export const adminGuard: CanActivateFn = (route) =>
  inject(Store).allowed(route.data['section'] || 'dashboard') ||
  inject(Router).createUrlTree(['/login']);
