import { Routes } from '@angular/router';
import { rolGuard } from './core/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'admin',
    canActivate: [rolGuard('admin')],
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'negocio',
    canActivate: [rolGuard('negocio')],
    loadChildren: () => import('./features/negocio/negocio.routes').then((m) => m.NEGOCIO_ROUTES),
  },
  {
    path: 'domi',
    canActivate: [rolGuard('domiciliario')],
    loadChildren: () => import('./features/domiciliario/domi.routes').then((m) => m.DOMI_ROUTES),
  },
  // Web pública del cliente.
  {
    path: '',
    loadChildren: () => import('./features/cliente/cliente.routes').then((m) => m.CLIENTE_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
