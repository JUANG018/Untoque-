import { Routes } from '@angular/router';
import { ClienteLayout } from './cliente-layout';

export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    component: ClienteLayout,
    children: [
      { path: '', loadComponent: () => import('./inicio').then((m) => m.Inicio) },
      { path: 'tienda/:id', loadComponent: () => import('./tienda').then((m) => m.Tienda) },
      { path: 'carrito', loadComponent: () => import('./carrito').then((m) => m.Carrito) },
      {
        path: 'pedido/:id',
        loadComponent: () => import('./seguimiento').then((m) => m.Seguimiento),
      },
      {
        path: 'mis-pedidos',
        loadComponent: () => import('./mis-pedidos').then((m) => m.MisPedidos),
      },
    ],
  },
];
