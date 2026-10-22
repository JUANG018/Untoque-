import { Routes } from '@angular/router';
import { NegocioLayout } from './negocio-layout';

export const NEGOCIO_ROUTES: Routes = [
  {
    path: '',
    component: NegocioLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
      {
        path: 'pedidos',
        loadComponent: () => import('./negocio-pedidos').then((m) => m.NegocioPedidos),
      },
      { path: 'menu', loadComponent: () => import('./negocio-menu').then((m) => m.NegocioMenu) },
      {
        path: 'ventas',
        loadComponent: () => import('./negocio-ventas').then((m) => m.NegocioVentas),
      },
      {
        path: 'publicidad',
        loadComponent: () => import('./negocio-publicidad').then((m) => m.NegocioPublicidad),
      },
    ],
  },
];
