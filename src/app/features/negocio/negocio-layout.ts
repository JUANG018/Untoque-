import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AvisosService } from '../../core/avisos.service';
import { EnlacePanel, PanelLayout } from '../../shared/panel-layout';
import { NegocioActual } from './negocio-actual';

@Component({
  selector: 'app-negocio-layout',
  imports: [PanelLayout, MatSlideToggleModule, MatButtonModule, MatIconModule, MatBadgeModule, MatTooltipModule],
  providers: [NegocioActual],
  template: `
    <app-panel-layout [titulo]="actual.negocio()?.nombre ?? 'Mi emprendimiento'" [enlaces]="enlaces">
      <ng-container barra>
        <button
          mat-icon-button
          (click)="avisos.activar()"
          [matTooltip]="avisos.sonidoActivo() ? 'Avisos activos (probar sonido)' : 'Activar avisos de pedidos'"
          [class.apagado]="!avisos.sonidoActivo()"
        >
          <mat-icon
            [matBadge]="actual.nuevos().length || null"
            matBadgeColor="warn"
            aria-hidden="false"
            aria-label="Avisos"
          >
            {{ avisos.sonidoActivo() ? 'notifications_active' : 'notifications_off' }}
          </mat-icon>
        </button>
        @if (actual.negocio(); as n) {
          <mat-slide-toggle [checked]="n.abierto" (change)="actual.cambiarAbierto($event.checked)">
            {{ n.abierto ? 'Abierto' : 'Cerrado' }}
          </mat-slide-toggle>
        }
      </ng-container>
    </app-panel-layout>
  `,
})
export class NegocioLayout {
  actual = inject(NegocioActual);
  avisos = inject(AvisosService);
  enlaces: EnlacePanel[] = [
    { ruta: '/negocio/pedidos', texto: 'Pedidos', icono: 'receipt_long' },
    { ruta: '/negocio/menu', texto: 'Mi menú', icono: 'restaurant_menu' },
    { ruta: '/negocio/ventas', texto: 'Mis ventas', icono: 'payments' },
    { ruta: '/negocio/publicidad', texto: 'Mi publicidad', icono: 'campaign' },
  ];
}
