import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth.service';

export interface EnlacePanel {
  ruta: string;
  texto: string;
  icono: string;
  exacto?: boolean;
}

/** Menú lateral + barra superior comunes a los paneles. Lo extra de la barra se proyecta con [barra]. */
@Component({
  selector: 'app-panel-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <mat-sidenav-container class="shell">
      <mat-sidenav #nav [mode]="movil() ? 'over' : 'side'" [opened]="!movil()" class="shell-nav">
        <div class="marca nav-marca">Untoque</div>
        <mat-nav-list>
          @for (l of enlaces(); track l.ruta) {
            <a
              mat-list-item
              [routerLink]="l.ruta"
              routerLinkActive="activo"
              [routerLinkActiveOptions]="{ exact: !!l.exacto }"
              (click)="movil() && nav.close()"
            >
              <mat-icon matListItemIcon>{{ l.icono }}</mat-icon>
              <span matListItemTitle>{{ l.texto }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          @if (movil()) {
            <button mat-icon-button (click)="nav.toggle()" aria-label="Menú">
              <mat-icon>menu</mat-icon>
            </button>
          }
          <span class="titulo-panel">{{ titulo() }}</span>
          <span class="spacer"></span>
          <ng-content select="[barra]" />
          <span class="usuario">{{ authSrv.usuario()?.nombre }}</span>
          <button mat-icon-button (click)="authSrv.logout()" aria-label="Salir">
            <mat-icon>logout</mat-icon>
          </button>
        </mat-toolbar>
        <main class="page">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
})
export class PanelLayout {
  authSrv = inject(AuthService);
  titulo = input('');
  enlaces = input.required<EnlacePanel[]>();
  movil = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );
}
