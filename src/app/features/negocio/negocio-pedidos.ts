import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AvisosService } from '../../core/avisos.service';
import { EstadoPedido, Pedido } from '../../core/models';
import { PedidosService } from '../../core/services/pedidos.service';
import { CopPipe, EstadoPipe, FechaPipe } from '../../shared/pipes';
import { NegocioActual } from './negocio-actual';

@Component({
  selector: 'app-negocio-pedidos',
  imports: [
    NgTemplateOutlet,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    CopPipe,
    EstadoPipe,
    FechaPipe,
  ],
  template: `
    @if (!avisos.sonidoActivo()) {
      <mat-card class="aviso-activar">
        <mat-icon>notifications_off</mat-icon>
        <span>Activa los avisos para que suene cuando te llegue un pedido.</span>
        <span class="spacer"></span>
        <button mat-flat-button (click)="avisos.activar()">Activar avisos</button>
      </mat-card>
    }
    @if (actual.negocio()?.abierto === false) {
      <mat-card class="aviso-activar cerrado">
        <mat-icon>store</mat-icon>
        <span>Tu emprendimiento aparece como <strong>cerrado</strong>. Ábrelo arriba para recibir pedidos.</span>
      </mat-card>
    }

    <h1>Pedidos nuevos</h1>
    <div class="grid-pedidos">
      @for (p of actual.nuevos(); track p.id) {
        <mat-card class="pedido nuevo">
          <ng-container *ngTemplateOutlet="detalle; context: { $implicit: p }" />
          <div class="acciones">
            <button mat-stroked-button (click)="rechazar(p)">Rechazar</button>
            <button mat-flat-button (click)="cambiar(p, 'aceptado')">
              <mat-icon>check</mat-icon> Aceptar
            </button>
          </div>
        </mat-card>
      } @empty {
        <p class="vacio">No tienes pedidos nuevos. Te avisaremos cuando llegue uno.</p>
      }
    </div>

    <h1>En curso</h1>
    <div class="grid-pedidos">
      @for (p of enCurso(); track p.id) {
        <mat-card class="pedido" [class.listo]="p.listo">
          <ng-container *ngTemplateOutlet="detalle; context: { $implicit: p }" />
          @if (p.domiciliarioNombre) {
            <div class="sub"><mat-icon inline>two_wheeler</mat-icon> {{ p.domiciliarioNombre }} va por el pedido</div>
          }
          <div class="acciones">
            @if (p.estado === 'aceptado') {
              <button mat-stroked-button (click)="cambiar(p, 'en_preparacion')">Empezar a preparar</button>
            }
            @if (p.listo) {
              <button mat-button (click)="marcarListo(p, false)">Deshacer listo</button>
            } @else {
              <button mat-flat-button (click)="marcarListo(p, true)">
                <mat-icon>takeout_dining</mat-icon> Listo para recoger
              </button>
            }
          </div>
        </mat-card>
      } @empty {
        <p class="vacio">Sin pedidos en curso.</p>
      }
    </div>

    <ng-template #detalle let-p>
      <div class="item-fila">
        <strong>Pedido #{{ p.numero }}</strong>
        <span class="spacer"></span>
        <span class="chip estado-{{ p.estado }}">{{ p.listo ? 'Listo para recoger' : (p.estado | estado) }}</span>
      </div>
      <div class="sub">{{ p.creadoEn | fecha }} · Cliente: {{ p.cliente.nombre }} · {{ p.zonaNombre }}</div>
      <ul class="items grande">
        @for (i of p.items; track i.productoId) {
          <li><strong>{{ i.cantidad }}</strong> × {{ i.nombre }}</li>
        }
      </ul>
      @if (p.notas) {
        <div class="notas">📝 {{ p.notas }}</div>
      }
      <div class="linea"><span>Valor productos</span><span>{{ p.desglose.subtotal | cop }}</span></div>
      <div class="linea total"><span>Recibes</span><span>{{ p.desglose.totalNegocio | cop }}</span></div>
    </ng-template>
  `,
})
export class NegocioPedidos {
  actual = inject(NegocioActual);
  avisos = inject(AvisosService);
  private srv = inject(PedidosService);
  private snack = inject(MatSnackBar);

  enCurso = computed(() =>
    this.actual
      .pedidos()
      .filter((p) => p.estado !== 'enviado_negocio')
      .sort((a, b) => a.numero - b.numero),
  );

  async cambiar(p: Pedido, estado: EstadoPedido) {
    try {
      await this.srv.cambiarEstado(p.id, estado);
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }

  async rechazar(p: Pedido) {
    const motivo = prompt(`¿Por qué rechazas el pedido #${p.numero}? (ej: se acabó un producto)`);
    if (motivo === null) return;
    try {
      await this.srv.cambiarEstado(p.id, 'rechazado', { motivoRechazo: motivo });
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }

  async marcarListo(p: Pedido, listo: boolean) {
    try {
      await this.srv.actualizar(p.id, { listo });
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }
}
