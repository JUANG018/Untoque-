import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, RUTA_POR_ROL } from './auth.service';
import { Rol } from './models';

export function rolGuard(...roles: Rol[]): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.listo;
    const rol = auth.rol();
    if (!rol) return router.parseUrl('/login');
    return roles.includes(rol) ? true : router.parseUrl(RUTA_POR_ROL[rol]);
  };
}
