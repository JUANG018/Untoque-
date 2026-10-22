import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { EstadoPedido } from '../../core/models';
import { PedidosService } from '../../core/services/pedidos.service';
import { CopPipe, FechaPipe } from '../../shared/pipes';

/** Pasos que ve el cliente; varios estados internos se agrupan en uno. */
const PASOS: { texto: string; icono: string; estados: EstadoPedido[] }[] = [
  { texto: 'Recibimos tu pedido', icono: 'inbox', estados: ['creado'] },
  { texto: 'Confirmando con el emprendimiento', icono: 'storefront', estados: ['enviado_negocio'] },
  { texto: 'Preparando tu pedido', icono: 'soup_kitchen', estados: ['aceptado', 'en_preparacion', 'domiciliario_asignado'] },
  { texto: 'En camino', icono: 'two_wheeler', estados: ['recogido'] },
  { texto: 'Entregado', icono: 'check_circle', estados: ['entregado'] },
];

@Component({
  selector: 'app-seguimiento',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, CopPipe, FechaPipe],
  template: `
    @if (pedido(); as p) {
      <h1>Pedido #{{ p.numero }}</h1>
      <p class="sub">{{ p.negocioNombre }} · {{ p.creadoEn | fecha }}</p>

      @if (p.estado === 'cancelado' || p.estado === 'rechazado') {
        <mat-card class="aviso-activar cerrado">
          <mat-icon>cancel</mat-icon>
          <span>
            @if (p.estado === 'cancelado') {
              Este pedido fue cancelado.
            } @else {
              El emprendimiento no pudo tomar tu pedido. Te contactaremos para ofrecerte otra opción.
            }
          </span>
        </mat-card>
      } @else {
        <mat-card class="seguimiento">
          @if (p.estado !== 'entregado') {
            <mat-progress-bar mode="indeterminate" />
          }
          <ol class="pasos">
            @for (paso of pasos; track paso.texto; let i = $index) {
              <li [class.hecho]="i < pasoActual()" [class.actual]="i === pasoActual()">
                <mat-icon>{{ paso.icono }}</mat-icon>
                <span>{{ paso.texto }}</span>
              </li>
            }
          </ol>
          @if (p.domiciliarioNombre && p.estado !== 'entregado') {
            <p><mat-icon inline>two_wheeler</mat-icon> Tu domiciliario es <strong>{{ p.domiciliarioNombre }}</strong>.</p>
          }
        </mat-card>
      }

      <mat-card class="detalle-pedido">
        <mat-card-content>
          @for (i of p.items; track i.productoId) {
            <div class="linea"><span>{{ i.cantidad }} × {{ i.nombre }}</span><span>{{ i.precio * i.cantidad | cop }}</span></div>
          }
          <hr />
          <div class="linea"><span>Domicilio</span><span>{{ p.desglose.tarifaDomicilio ? (p.desglose.tarifaDomicilio | cop) : 'Gratis' }}</span></div>
          <div class="linea total"><span>Total ({{ p.metodoPago }})</span><span>{{ p.desglose.totalCliente | cop }}</span></div>
          <p class="sub">Entregar en: {{ p.cliente.direccion }} {{ p.cliente.referencia ? '· ' + p.cliente.referencia : '' }}</p>
        </mat-card-content>
        @if (p.estado === 'creado') {
          <mat-card-actions>
            <button mat-button (click)="cancelar(p.id)">Cancelar pedido</button>
          </mat-card-actions>
        }
      </mat-card>

      <div class="acciones">
        <a mat-button routerLink="/mis-pedidos">Mis pedidos</a>
        <a mat-flat-button routerLink="/">Volver al inicio</a>
      </div>
    } @else if (pedido() === null) {
      <p class="vacio">No encontramos este pedido.</p>
    } @else {
      <mat-progress-bar mode="indeterminate" />
    }
  `,
})
export class Seguimiento {
  private srv = inject(PedidosService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  pasos = PASOS;

  /** Viene de la ruta /pedido/:id */
  id = input.required<string>();
  // Espera a que se restaure la sesión anónima antes de escuchar (las reglas la exigen).
  pedido = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => from(this.auth.listo).pipe(switchMap(() => this.srv.uno$(id)))),
    ),
  );
  pasoActual = computed(() => {
    const e = this.pedido()?.estado;
    return e ? PASOS.findIndex((p) => p.estados.includes(e)) : -1;
  });

  async cancelar(id: string) {
    if (!confirm('¿Seguro que quieres cancelar tu pedido?')) return;
    try {
      await this.srv.cambiarEstado(id, 'cancelado');
    } catch {
      this.snack.open('Ya no se puede cancelar: el pedido fue enviado al emprendimiento.', 'OK');
    }
  }
}
