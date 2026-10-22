import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AvisosService } from '../../core/avisos.service';
import { EnlacePanel, PanelLayout } from '../../shared/panel-layout';
import { DomiActual } from './domi-actual';

@Component({
  selector: 'app-domi-layout',
  imports: [PanelLayout, MatSlideToggleModule, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  providers: [DomiActual],
  template: `
    <app-panel-layout titulo="Domiciliario" [enlaces]="enlaces">
      <ng-container barra>
        <button
          mat-icon-button
          (click)="avisos.activar()"
          [matTooltip]="avisos.sonidoActivo() ? 'Avisos activos (probar sonido)' : 'Activar avisos'"
        >
          <mat-icon
            [matBadge]="actual.pedidos().length || null"
            matBadgeColor="warn"
            aria-hidden="false"
            aria-label="Avisos"
          >
            {{ avisos.sonidoActivo() ? 'notifications_active' : 'notifications_off' }}
          </mat-icon>
        </button>
        @if (actual.perfil(); as p) {
          <mat-slide-toggle [checked]="!!p.disponible" (change)="actual.cambiarDisponible($event.checked)">
            {{ p.disponible ? 'Disponible' : 'No disponible' }}
          </mat-slide-toggle>
        }
      </ng-container>
    </app-panel-layout>
  `,
})
export class DomiLayout {
  actual = inject(DomiActual);
  avisos = inject(AvisosService);
  enlaces: EnlacePanel[] = [
    { ruta: '/domi/entregas', texto: 'Mis entregas', icono: 'two_wheeler' },
    { ruta: '/domi/ganancias', texto: 'Mis ganancias', icono: 'payments' },
  ];
}
