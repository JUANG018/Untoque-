import { Routes } from '@angular/router';
import { DomiLayout } from './domi-layout';

export const DOMI_ROUTES: Routes = [
  {
    path: '',
    component: DomiLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'entregas' },
      {
        path: 'entregas',
        loadComponent: () => import('./domi-entregas').then((m) => m.DomiEntregas),
      },
      {
        path: 'ganancias',
        loadComponent: () => import('./domi-ganancias').then((m) => m.DomiGanancias),
      },
    ],
  },
];
