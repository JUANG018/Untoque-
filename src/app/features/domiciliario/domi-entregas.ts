import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AvisosService } from '../../core/avisos.service';
import { EstadoPedido, Pedido } from '../../core/models';
import { PedidosService } from '../../core/services/pedidos.service';
import { mapsUrl, wazeUrl, whatsappUrl } from '../../shared/enlaces';
import { CopPipe } from '../../shared/pipes';
import { DomiActual } from './domi-actual';

@Component({
  selector: 'app-domi-entregas',
  imports: [MatCardModule, MatButtonModule, MatIconModule, CopPipe],
  template: `
    @if (!avisos.sonidoActivo()) {
      <mat-card class="aviso-activar">
        <mat-icon>notifications_off</mat-icon>
        <span>Activa los avisos para que suene cuando te asignen un pedido.</span>
        <span class="spacer"></span>
        <button mat-flat-button (click)="avisos.activar()">Activar avisos</button>
      </mat-card>
    }
    @if (actual.perfil()?.disponible === false) {
      <mat-card class="aviso-activar cerrado">
        <mat-icon>do_not_disturb_on</mat-icon>
        <span>Estás como <strong>no disponible</strong>: no te asignarán pedidos nuevos.</span>
      </mat-card>
    }

    <h1>Mis entregas</h1>
    <div class="grid-pedidos">
      @for (p of entregas(); track p.id) {
        @let n = actual.negocio(p.negocioId);
        <mat-card class="pedido entrega" [class.listo]="p.listo">
          <div class="item-fila">
            <strong class="numero">#{{ p.numero }}</strong>
            <span class="spacer"></span>
            @if (p.estado === 'recogido') {
              <span class="chip estado-recogido">En camino al cliente</span>
            } @else if (p.listo) {
              <span class="chip chip-ok">Listo para recoger</span>
            } @else {
              <span class="chip estado-aceptado">En preparación</span>
            }
          </div>

          <section class="paso" [class.hecho]="p.estado === 'recogido'">
            <h3><mat-icon inline>storefront</mat-icon> 1. Recoger en {{ p.negocioNombre }}</h3>
            <div>{{ n?.direccion }}</div>
            <ul class="items">
              @for (i of p.items; track i.productoId) {
                <li>{{ i.cantidad }} × {{ i.nombre }}</li>
              }
            </ul>
            @if (p.estado === 'domiciliario_asignado') {
              <div class="botones-ruta">
                <a mat-stroked-button [href]="maps(n?.ubicacion, n?.direccion)" target="_blank">
                  <mat-icon>map</mat-icon> Maps
                </a>
                <a mat-stroked-button [href]="waze(n?.ubicacion, n?.direccion)" target="_blank">
                  <mat-icon>navigation</mat-icon> Waze
                </a>
                @if (n?.telefono) {
                  <a mat-stroked-button [href]="'tel:' + n?.telefono"><mat-icon>call</mat-icon> Llamar</a>
                }
              </div>
            }
          </section>

          <section class="paso">
            <h3><mat-icon inline>person_pin_circle</mat-icon> 2. Entregar a {{ p.cliente.nombre }}</h3>
            <div>{{ p.cliente.direccion }}</div>
            @if (p.cliente.referencia) {
              <div class="sub">{{ p.cliente.referencia }}</div>
            }
            @if (p.notas) {
              <div class="notas">📝 {{ p.notas }}</div>
            }
            <div class="botones-ruta">
              <a mat-stroked-button [href]="maps(p.cliente.ubicacion, p.cliente.direccion)" target="_blank">
                <mat-icon>map</mat-icon> Maps
              </a>
              <a mat-stroked-button [href]="waze(p.cliente.ubicacion, p.cliente.direccion)" target="_blank">
                <mat-icon>navigation</mat-icon> Waze
              </a>
              <a mat-stroked-button [href]="'tel:' + p.cliente.telefono"><mat-icon>call</mat-icon> Llamar</a>
              <a mat-stroked-button [href]="whatsapp(p.cliente.telefono, 'Hola, soy el domiciliario de Untoque con tu pedido #' + p.numero)" target="_blank">
                <mat-icon>chat</mat-icon> WhatsApp
              </a>
            </div>
          </section>

          @if (p.metodoPago === 'efectivo') {
            <div class="cobro">Cobra en efectivo <strong>{{ p.desglose.totalCliente | cop }}</strong></div>
          } @else {
            <div class="cobro pagado">Pagado por transferencia: <strong>no cobres</strong></div>
          }
          <div class="linea"><span>Tu ganancia por esta entrega</span><strong>{{ p.desglose.pagoDomiciliario | cop }}</strong></div>

          <div class="acciones">
            @if (p.estado === 'domiciliario_asignado') {
              <button mat-flat-button class="grande" (click)="cambiar(p, 'recogido')">
                <mat-icon>inventory_2</mat-icon> Ya lo recogí
              </button>
            } @else {
              <button mat-flat-button class="grande" (click)="entregar(p)">
                <mat-icon>check_circle</mat-icon> Entregado
              </button>
            }
          </div>
        </mat-card>
      } @empty {
        <p class="vacio">No tienes entregas asignadas. Te avisaremos cuando te asignen una.</p>
      }
    </div>
  `,
})
export class DomiEntregas {
  actual = inject(DomiActual);
  avisos = inject(AvisosService);
  private srv = inject(PedidosService);
  private snack = inject(MatSnackBar);

  maps = mapsUrl;
  waze = wazeUrl;
  whatsapp = whatsappUrl;

  /** Primero lo que ya va en camino, luego por número. */
  entregas = computed(() =>
    [...this.actual.pedidos()].sort(
      (a, b) =>
        Number(b.estado === 'recogido') - Number(a.estado === 'recogido') || a.numero - b.numero,
    ),
  );

  async cambiar(p: Pedido, estado: EstadoPedido) {
    try {
      await this.srv.cambiarEstado(p.id, estado);
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }

  entregar(p: Pedido) {
    const cobro =
      p.metodoPago === 'efectivo'
        ? `¿Entregaste el pedido #${p.numero} y cobraste ${new CopPipe().transform(p.desglose.totalCliente)}?`
        : `¿Entregaste el pedido #${p.numero}?`;
    if (confirm(cobro)) return this.cambiar(p, 'entregado');
    return undefined;
  }
}
