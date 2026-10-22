import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CarritoService } from './carrito.service';

@Component({
  selector: 'app-cliente-layout',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule, MatBadgeModule],
  template: `
    <mat-toolbar class="topbar cliente-barra">
      <a routerLink="/" class="marca logo">Untoque</a>
      <span class="spacer"></span>
      @if (auth.uid()) {
        <a mat-button routerLink="/mis-pedidos"><mat-icon>receipt_long</mat-icon> Mis pedidos</a>
      }
      <a mat-icon-button routerLink="/carrito" aria-label="Carrito">
        <mat-icon [matBadge]="carrito.unidades() || null" matBadgeColor="warn" aria-hidden="false">
          shopping_bag
        </mat-icon>
      </a>
    </mat-toolbar>
    <main class="tienda-page">
      <router-outlet />
    </main>
    <footer class="pie">
      <span>Untoque · Domicilios de tu pueblo</span>
      <a routerLink="/login">Ingreso emprendimientos y domiciliarios</a>
    </footer>
  `,
})
export class ClienteLayout {
  auth = inject(AuthService);
  carrito = inject(CarritoService);
}
