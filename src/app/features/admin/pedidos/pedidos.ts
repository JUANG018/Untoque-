import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { calcularDesglose } from '../../../core/desglose';
import { EstadoPedido, Negocio, Pedido, Usuario, Zona } from '../../../core/models';
import { NegociosService } from '../../../core/services/negocios.service';
import { PedidosService } from '../../../core/services/pedidos.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { ZonasService } from '../../../core/services/zonas.service';
import { mapsUrl, whatsappUrl } from '../../../shared/enlaces';
import { CopPipe, EstadoPipe, FechaPipe } from '../../../shared/pipes';

const COLUMNAS: { titulo: string; estados: EstadoPedido[] }[] = [
  { titulo: 'Por enviar', estados: ['creado', 'rechazado'] },
  { titulo: 'Esperando al emprendimiento', estados: ['enviado_negocio'] },
  { titulo: 'Preparando · asignar domiciliario', estados: ['aceptado', 'en_preparacion'] },
  { titulo: 'En ruta', estados: ['domiciliario_asignado', 'recogido'] },
];

@Component({
  selector: 'app-pedidos',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    CopPipe,
    EstadoPipe,
    FechaPipe,
  ],
  template: `
    <div class="fila centrado">
      <h1>Pedidos en curso</h1>
      <span class="spacer"></span>
      <a mat-flat-button routerLink="/admin/pedidos/nuevo"><mat-icon>add</mat-icon> Nuevo pedido</a>
    </div>

    <div class="tablero">
      @for (col of columnas(); track col.titulo) {
        <section class="columna">
          <h2>{{ col.titulo }} <span class="contador">{{ col.pedidos.length }}</span></h2>
          @for (p of col.pedidos; track p.id) {
            <mat-card class="pedido" [class.alerta]="p.estado === 'rechazado'">
              <div class="item-fila">
                <strong>#{{ p.numero }} · {{ p.negocioNombre }}</strong>
                @if (p.origen === 'web') {
                  <span class="chip estado-enviado_negocio">Web</span>
                }
                <span class="spacer"></span>
                <span class="chip estado-{{ p.estado }}">{{ p.estado | estado }}</span>
                @if (p.listo) {
                  <span class="chip chip-ok">Listo</span>
                }
              </div>
              @if (p.estado === 'rechazado' && p.motivoRechazo) {
                <div class="notas motivo">Motivo: {{ p.motivoRechazo }}</div>
              }
              <div class="sub">{{ p.creadoEn | fecha }} · {{ p.zonaNombre }} · {{ p.metodoPago }}</div>
              <div class="cliente">
                <mat-icon inline>person</mat-icon> {{ p.cliente.nombre }} ·
                <a [href]="whatsapp(p.cliente.telefono)" target="_blank">{{ p.cliente.telefono }}</a>
                <br />
                <mat-icon inline>place</mat-icon> {{ p.cliente.direccion }}
                @if (p.cliente.referencia) {
                  ({{ p.cliente.referencia }})
                }
              </div>
              <ul class="items">
                @for (i of p.items; track i.productoId) {
                  <li>{{ i.cantidad }} × {{ i.nombre }}</li>
                }
              </ul>
              @if (p.notas) {
                <div class="notas">📝 {{ p.notas }}</div>
              }
              <div class="linea total"><span>Cobrar</span><span>{{ p.desglose.totalCliente | cop }}</span></div>
              @if (p.domiciliarioNombre) {
                <div class="sub"><mat-icon inline>two_wheeler</mat-icon> {{ p.domiciliarioNombre }}</div>
              }

              <div class="acciones">
                @switch (p.estado) {
                  @case ('creado') {
                    <button mat-flat-button (click)="enviar(p)">Enviar</button>
                  }
                  @case ('rechazado') {
                    <button mat-flat-button (click)="reenviar(p)">Reenviar</button>
                  }
                  @case ('enviado_negocio') {
                    <a mat-stroked-button [href]="whatsappNegocio(p)" target="_blank">Avisar</a>
                    <button mat-flat-button (click)="estado(p, 'aceptado')">Aceptado</button>
                  }
                  @case ('recogido') {
                    <button mat-flat-button (click)="estado(p, 'entregado')">Entregado</button>
                  }
                  @case ('domiciliario_asignado') {
                    <button mat-flat-button (click)="estado(p, 'recogido')">Recogido</button>
                  }
                }
                @if (puedeAsignar(p)) {
                  <button mat-stroked-button [matMenuTriggerFor]="menuDomi">
                    {{ p.domiciliarioId ? 'Reasignar' : 'Asignar domi' }}
                  </button>
                  <mat-menu #menuDomi>
                    @for (d of domisDisponibles(); track d.id) {
                      <button mat-menu-item (click)="asignar(p, d)">{{ d.nombre }}</button>
                    } @empty {
                      <span mat-menu-item disabled>No hay domiciliarios disponibles</span>
                    }
                  </mat-menu>
                }
                <button mat-icon-button [matMenuTriggerFor]="mas" aria-label="Más">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #mas>
                  @if (p.cliente.ubicacion) {
                    <a mat-menu-item [href]="mapa(p)" target="_blank">Ver ubicación del cliente</a>
                  }
                  <button mat-menu-item (click)="estado(p, 'cancelado')">Cancelar pedido</button>
                </mat-menu>
              </div>
            </mat-card>
          } @empty {
            <p class="vacio">—</p>
          }
        </section>
      }
    </div>
  `,
})
export class Pedidos {
  private srv = inject(PedidosService);
  private snack = inject(MatSnackBar);
  private pedidos = toSignal(this.srv.activos$, { initialValue: [] as Pedido[] });
  private negociosSrv = inject(NegociosService);
  private negocios = toSignal(this.negociosSrv.todos$, { initialValue: [] as Negocio[] });
  private zonas = toSignal(inject(ZonasService).todas$, { initialValue: [] as Zona[] });
  private cop = new CopPipe();
  private domis = toSignal(inject(UsuariosService).domiciliarios$, {
    initialValue: [] as Usuario[],
  });
  domisDisponibles = computed(() => this.domis().filter((d) => d.activo && d.disponible));

  columnas = computed(() => {
    const ordenados = [...this.pedidos()].sort((a, b) => a.numero - b.numero);
    return COLUMNAS.map((c) => ({
      titulo: c.titulo,
      pedidos: ordenados.filter((p) => c.estados.includes(p.estado)),
    }));
  });

  puedeAsignar(p: Pedido): boolean {
    return ['aceptado', 'en_preparacion', 'domiciliario_asignado'].includes(p.estado);
  }

  async estado(p: Pedido, e: EstadoPedido) {
    if (e === 'cancelado' && !confirm(`¿Cancelar el pedido #${p.numero}?`)) return;
    try {
      await this.srv.cambiarEstado(p.id, e);
    } catch (err) {
      this.snack.open('Error: ' + (err as Error).message, 'OK');
    }
  }

  /**
   * Envía el pedido al emprendimiento. Los pedidos web se recalculan antes con los precios,
   * la comisión y la tarifa reales, porque lo que manda el navegador del cliente no es confiable.
   */
  async enviar(p: Pedido) {
    if (p.origen !== 'web') return this.estado(p, 'enviado_negocio');
    try {
      const negocio = this.negocios().find((n) => n.id === p.negocioId);
      const zona = this.zonas().find((z) => z.id === p.zonaId);
      if (!negocio || !zona) throw new Error('El emprendimiento o la zona ya no existen');
      const productos = new Map(
        (await this.negociosSrv.productosUnaVez(p.negocioId)).map((x) => [x.id, x]),
      );
      const faltan = p.items.filter((i) => !productos.get(i.productoId)?.disponible);
      if (faltan.length) {
        this.snack.open(
          `No disponible: ${faltan.map((i) => i.nombre).join(', ')}. Contacta al cliente o cancela.`,
          'OK',
        );
        return;
      }
      const items = p.items.map((i) => {
        const real = productos.get(i.productoId)!;
        return { ...i, nombre: real.nombre, precio: real.precio };
      });
      const desglose = calcularDesglose(items, negocio, zona);
      if (desglose.totalCliente !== p.desglose.totalCliente) {
        const ok = confirm(
          `El total del pedido #${p.numero} cambió de ${this.cop.transform(p.desglose.totalCliente)} ` +
            `a ${this.cop.transform(desglose.totalCliente)} (precios actualizados). ¿Enviar igual? ` +
            'Recuerda avisarle al cliente.',
        );
        if (!ok) return;
      }
      await this.srv.cambiarEstado(p.id, 'enviado_negocio', { items, desglose });
    } catch (err) {
      this.snack.open('Error: ' + (err as Error).message, 'OK');
    }
  }

  async reenviar(p: Pedido) {
    await this.srv.cambiarEstado(p.id, 'enviado_negocio', { motivoRechazo: '', listo: false });
  }

  async asignar(p: Pedido, d: Usuario) {
    await this.srv.asignarDomiciliario(p.id, d.id, d.nombre);
    this.snack.open(`Pedido #${p.numero} asignado a ${d.nombre}`, 'OK', { duration: 2500 });
  }

  whatsapp = whatsappUrl;

  whatsappNegocio(p: Pedido): string {
    const n = this.negocios().find((x) => x.id === p.negocioId);
    const detalle = p.items.map((i) => `${i.cantidad} x ${i.nombre}`).join('\n');
    return whatsappUrl(n?.telefono ?? '', `Nuevo pedido #${p.numero} de Untoque:\n${detalle}`);
  }

  mapa(p: Pedido): string {
    return mapsUrl(p.cliente.ubicacion, p.cliente.direccion);
  }
}
