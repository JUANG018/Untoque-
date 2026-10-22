import { Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AvisosService } from '../../core/avisos.service';
import { Pedido } from '../../core/models';
import { PedidosService } from '../../core/services/pedidos.service';
import { EnlacePanel, PanelLayout } from '../../shared/panel-layout';

@Component({
  selector: 'app-admin-layout',
  imports: [PanelLayout, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <app-panel-layout titulo="Administrador" [enlaces]="enlaces">
      <button
        barra
        mat-icon-button
        (click)="avisos.activar()"
        [matTooltip]="avisos.sonidoActivo() ? 'Avisos activos (probar sonido)' : 'Activar avisos'"
      >
        <mat-icon>{{ avisos.sonidoActivo() ? 'notifications_active' : 'notifications_off' }}</mat-icon>
      </button>
    </app-panel-layout>
  `,
})
export class AdminLayout {
  avisos = inject(AvisosService);
  private pedidos = toSignal(inject(PedidosService).activos$, { initialValue: [] as Pedido[] });

  enlaces: EnlacePanel[] = [
    { ruta: '/admin/pedidos', texto: 'Pedidos', icono: 'receipt_long', exacto: true },
    { ruta: '/admin/pedidos/nuevo', texto: 'Nuevo pedido', icono: 'add_shopping_cart', exacto: true },
    { ruta: '/admin/cuentas', texto: 'Cuentas', icono: 'account_balance_wallet' },
    { ruta: '/admin/negocios', texto: 'Emprendimientos', icono: 'storefront' },
    { ruta: '/admin/domiciliarios', texto: 'Domiciliarios', icono: 'two_wheeler' },
    { ruta: '/admin/zonas', texto: 'Zonas', icono: 'map' },
    { ruta: '/admin/publicidad', texto: 'Publicidad', icono: 'campaign' },
  ];

  constructor() {
    // Avisa cuando un emprendimiento responde (acepta, rechaza o marca listo) o llega un pedido web.
    let previo: Map<string, string> | null = null;
    effect(() => {
      const actual = new Map(this.pedidos().map((p) => [p.id, `${p.estado}|${!!p.listo}`]));
      if (previo) {
        for (const p of this.pedidos()) {
          const antes = previo.get(p.id);
          if (antes === actual.get(p.id)) continue;
          const aviso = mensaje(p, antes);
          if (aviso) this.avisos.avisar(aviso, `${p.negocioNombre} · ${p.cliente.nombre}`);
        }
      }
      previo = actual;
    });
  }
}

function mensaje(p: Pedido, antes: string | undefined): string | null {
  if (!antes) return p.origen === 'web' ? `Nuevo pedido web #${p.numero}` : null;
  const [estadoAntes, listoAntes] = antes.split('|');
  if (p.estado !== estadoAntes) {
    if (p.estado === 'aceptado') return `#${p.numero} aceptado: asigna domiciliario`;
    if (p.estado === 'rechazado') return `#${p.numero} fue RECHAZADO`;
  }
  if (p.listo && listoAntes === 'false') return `#${p.numero} listo para recoger`;
  return null;
}
