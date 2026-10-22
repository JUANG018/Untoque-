import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      { path: 'pedidos', loadComponent: () => import('./pedidos/pedidos').then((m) => m.Pedidos) },
      {
        path: 'pedidos/nuevo',
        loadComponent: () => import('./pedidos/pedido-nuevo').then((m) => m.PedidoNuevo),
      },
      {
        path: 'negocios',
        loadComponent: () => import('./negocios/negocios').then((m) => m.Negocios),
      },
      {
        path: 'negocios/:id',
        loadComponent: () => import('./negocios/negocio-detalle').then((m) => m.NegocioDetalle),
      },
      { path: 'zonas', loadComponent: () => import('./zonas/zonas').then((m) => m.Zonas) },
      {
        path: 'domiciliarios',
        loadComponent: () =>
          import('./domiciliarios/domiciliarios').then((m) => m.Domiciliarios),
      },
      {
        path: 'publicidad',
        loadComponent: () => import('./publicidad/publicidad').then((m) => m.PublicidadAdmin),
      },
      { path: 'cuentas', loadComponent: () => import('./cuentas/cuentas').then((m) => m.Cuentas) },
    ],
  },
];
