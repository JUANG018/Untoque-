import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { switchMap } from 'rxjs';
import { resumir } from '../../../core/desglose';
import { fechaISO, inicioPeriodo, rangoFechas } from '../../../core/firestore-utils';
import { Liquidacion, Pedido } from '../../../core/models';
import { LiquidacionesService } from '../../../core/services/liquidaciones.service';
import { PedidosService } from '../../../core/services/pedidos.service';
import { CopPipe, FechaPipe } from '../../../shared/pipes';

type Periodo = 'hoy' | 'semana' | 'mes' | 'rango';

interface FilaEntidad {
  id: string;
  nombre: string;
  pedidos: number;
  monto: number;
  /** Pedidos aún no incluidos en una liquidación. */
  pendientes: Pedido[];
  montoPendiente: number;
}

function agrupar(
  pedidos: Pedido[],
  clave: (p: Pedido) => { id: string; nombre: string } | null,
  monto: (p: Pedido) => number,
  liquidado: (p: Pedido) => boolean,
): FilaEntidad[] {
  const filas = new Map<string, FilaEntidad>();
  for (const p of pedidos) {
    const k = clave(p);
    if (!k) continue;
    const f = filas.get(k.id) ?? {
      id: k.id,
      nombre: k.nombre,
      pedidos: 0,
      monto: 0,
      pendientes: [],
      montoPendiente: 0,
    };
    f.pedidos++;
    f.monto += monto(p);
    if (!liquidado(p)) {
      f.pendientes.push(p);
      f.montoPendiente += monto(p);
    }
    filas.set(k.id, f);
  }
  return [...filas.values()].sort((a, b) => b.monto - a.monto);
}

@Component({
  selector: 'app-cuentas',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTabsModule,
    CopPipe,
    FechaPipe,
  ],
  template: `
    <div class="fila centrado envolver">
      <h1>Cuentas</h1>
      <span class="spacer"></span>
      <mat-button-toggle-group [value]="periodo()" (change)="elegirPeriodo($event.value)">
        <mat-button-toggle value="hoy">Hoy</mat-button-toggle>
        <mat-button-toggle value="semana">Semana</mat-button-toggle>
        <mat-button-toggle value="mes">Mes</mat-button-toggle>
        <mat-button-toggle value="rango">Rango</mat-button-toggle>
      </mat-button-toggle-group>
    </div>
    @if (periodo() === 'rango') {
      <div class="fila centrado">
        <label>Desde <input type="date" [value]="desde()" (change)="desde.set(valor($event))" /></label>
        <label>Hasta <input type="date" [value]="hasta()" (change)="hasta.set(valor($event))" /></label>
      </div>
    }
    <p class="ayuda">
      {{ desde() }} a {{ hasta() }} · Solo cuentan los pedidos entregados.
      @if (cancelados()) {
        ({{ cancelados() }} cancelados/rechazados no suman)
      }
    </p>

    <div class="tarjetas">
      <mat-card class="kpi destacado">
        <span>Tu ganancia</span><strong>{{ resumen().gananciaPlataforma | cop }}</strong>
      </mat-card>
      <mat-card class="kpi"><span>Pedidos entregados</span><strong>{{ resumen().pedidos }}</strong></mat-card>
      <mat-card class="kpi"><span>Ventas productos</span><strong>{{ resumen().ventas | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Comisiones</span><strong>{{ resumen().comisiones | cop }}</strong></mat-card>
      <mat-card class="kpi">
        <span>Domicilios cobrados</span><strong>{{ resumen().domicilios | cop }}</strong>
      </mat-card>
      <mat-card class="kpi" [class.negativo]="resumen().gananciaDomicilios < 0">
        <span>Tu parte de domicilios</span><strong>{{ resumen().gananciaDomicilios | cop }}</strong>
      </mat-card>
      <mat-card class="kpi">
        <span>A pagar a emprendimientos</span><strong>{{ resumen().totalNegocios | cop }}</strong>
      </mat-card>
      <mat-card class="kpi">
        <span>A pagar a domiciliarios</span><strong>{{ resumen().pagoDomiciliarios | cop }}</strong>
      </mat-card>
    </div>

    <mat-tab-group>
      <mat-tab label="Emprendimientos">
        <ng-template matTabContent>
          <table class="tabla">
            <thead>
              <tr><th>Emprendimiento</th><th>Pedidos</th><th>Total</th><th>Sin liquidar</th><th></th></tr>
            </thead>
            <tbody>
              @for (f of porNegocio(); track f.id) {
                <tr>
                  <td>{{ f.nombre }}</td>
                  <td>{{ f.pedidos }}</td>
                  <td>{{ f.monto | cop }}</td>
                  <td>{{ f.montoPendiente | cop }}</td>
                  <td>
                    @if (f.pendientes.length) {
                      <button mat-stroked-button (click)="liquidar('negocio', f)">Liquidar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="vacio">Sin pedidos entregados en este período.</td></tr>
              }
            </tbody>
          </table>
        </ng-template>
      </mat-tab>
      <mat-tab label="Domiciliarios">
        <ng-template matTabContent>
          <table class="tabla">
            <thead>
              <tr><th>Domiciliario</th><th>Entregas</th><th>Ganado</th><th>Sin liquidar</th><th></th></tr>
            </thead>
            <tbody>
              @for (f of porDomi(); track f.id) {
                <tr>
                  <td>{{ f.nombre }}</td>
                  <td>{{ f.pedidos }}</td>
                  <td>{{ f.monto | cop }}</td>
                  <td>{{ f.montoPendiente | cop }}</td>
                  <td>
                    @if (f.pendientes.length) {
                      <button mat-stroked-button (click)="liquidar('domiciliario', f)">Liquidar</button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="vacio">Sin entregas en este período.</td></tr>
              }
            </tbody>
          </table>
        </ng-template>
      </mat-tab>
      <mat-tab label="Pedidos">
        <ng-template matTabContent>
          <div class="acciones">
            <button mat-stroked-button (click)="exportar()" [disabled]="!entregados().length">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>
          <div class="tabla-scroll">
            <table class="tabla">
              <thead>
                <tr>
                  <th>#</th><th>Fecha</th><th>Emprendimiento</th><th>Zona</th><th>Subtotal</th>
                  <th>Domicilio</th><th>Comisión</th><th>Domi</th><th>Tu ganancia</th>
                </tr>
              </thead>
              <tbody>
                @for (p of entregados(); track p.id) {
                  <tr>
                    <td>{{ p.numero }}</td>
                    <td>{{ p.creadoEn | fecha }}</td>
                    <td>{{ p.negocioNombre }}</td>
                    <td>{{ p.zonaNombre }}</td>
                    <td>{{ p.desglose.subtotal | cop }}</td>
                    <td>{{ p.desglose.tarifaDomicilio | cop }}</td>
                    <td>{{ p.desglose.comisionPlataforma | cop }}</td>
                    <td>{{ p.desglose.pagoDomiciliario | cop }}</td>
                    <td>{{ p.desglose.gananciaPlataforma | cop }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </ng-template>
      </mat-tab>
      <mat-tab label="Liquidaciones">
        <ng-template matTabContent>
          <table class="tabla">
            <thead>
              <tr><th>Creada</th><th>A quién</th><th>Período</th><th>Pedidos</th><th>Monto</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody>
              @for (l of liquidaciones(); track l.id) {
                <tr>
                  <td>{{ l.creadoEn | fecha }}</td>
                  <td>{{ l.entidadNombre }} <span class="sub">({{ l.tipo }})</span></td>
                  <td>{{ l.desde }} a {{ l.hasta }}</td>
                  <td>{{ l.pedidoIds.length }}</td>
                  <td>{{ l.monto | cop }}</td>
                  <td>
                    <span class="chip" [class.chip-ok]="l.estado === 'pagada'">
                      {{ l.estado === 'pagada' ? 'Pagada ' + (l.pagadaEn | fecha) : 'Pendiente' }}
                    </span>
                  </td>
                  <td>
                    @if (l.estado === 'pendiente') {
                      <button mat-flat-button (click)="pagar(l)">Marcar pagada</button>
                      <button mat-icon-button (click)="anular(l)" aria-label="Anular">
                        <mat-icon>undo</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="vacio">Aún no hay liquidaciones.</td></tr>
              }
            </tbody>
          </table>
        </ng-template>
      </mat-tab>
    </mat-tab-group>
  `,
})
export class Cuentas {
  private pedidosSrv = inject(PedidosService);
  private liqSrv = inject(LiquidacionesService);
  private snack = inject(MatSnackBar);

  periodo = signal<Periodo>('hoy');
  desde = signal(fechaISO(new Date()));
  hasta = signal(fechaISO(new Date()));

  private rango = computed(() => rangoFechas(this.desde(), this.hasta()));
  private pedidos = toSignal(
    toObservable(this.rango).pipe(switchMap(({ d, h }) => this.pedidosSrv.rango$(d, h))),
    { initialValue: [] as Pedido[] },
  );
  entregados = computed(() =>
    this.pedidos()
      .filter((p) => p.estado === 'entregado')
      .sort((a, b) => a.numero - b.numero),
  );
  cancelados = computed(
    () => this.pedidos().filter((p) => p.estado === 'cancelado' || p.estado === 'rechazado').length,
  );
  resumen = computed(() => resumir(this.entregados().map((p) => p.desglose)));

  porNegocio = computed(() =>
    agrupar(
      this.entregados(),
      (p) => ({ id: p.negocioId, nombre: p.negocioNombre }),
      (p) => p.desglose.totalNegocio,
      (p) => !!p.liquidacionNegocioId,
    ),
  );
  porDomi = computed(() =>
    agrupar(
      this.entregados(),
      (p) =>
        p.domiciliarioId ? { id: p.domiciliarioId, nombre: p.domiciliarioNombre ?? '' } : null,
      (p) => p.desglose.pagoDomiciliario,
      (p) => !!p.liquidacionDomiciliarioId,
    ),
  );

  liquidaciones = toSignal(this.liqSrv.todas$, { initialValue: [] as Liquidacion[] });

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }

  elegirPeriodo(p: Periodo) {
    this.periodo.set(p);
    if (p === 'rango') return;
    this.desde.set(inicioPeriodo(p));
    this.hasta.set(fechaISO(new Date()));
  }

  async liquidar(tipo: Liquidacion['tipo'], f: FilaEntidad) {
    const ok = confirm(
      `¿Liquidar ${f.pendientes.length} pedido(s) de ${f.nombre} por ${new CopPipe().transform(f.montoPendiente)}?`,
    );
    if (!ok) return;
    try {
      await this.liqSrv.generar(tipo, f.id, f.nombre, this.desde(), this.hasta(), f.pendientes);
      this.snack.open('Liquidación creada (pendiente de pago)', 'OK', { duration: 3000 });
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }

  pagar(l: Liquidacion) {
    return this.liqSrv.marcarPagada(l.id);
  }

  async anular(l: Liquidacion) {
    if (confirm('¿Anular esta liquidación? Sus pedidos quedarán sin liquidar.')) {
      await this.liqSrv.anular(l);
    }
  }

  exportar() {
    const cab = [
      'numero', 'fecha', 'emprendimiento', 'zona', 'domiciliario', 'metodo_pago', 'subtotal',
      'domicilio', 'total_cliente', 'comision', 'pago_domiciliario', 'total_emprendimiento',
      'ganancia_plataforma',
    ];
    const filas = this.entregados().map((p) => [
      p.numero,
      p.creadoEn.toDate().toISOString(),
      p.negocioNombre,
      p.zonaNombre,
      p.domiciliarioNombre ?? '',
      p.metodoPago,
      p.desglose.subtotal,
      p.desglose.tarifaDomicilio,
      p.desglose.totalCliente,
      p.desglose.comisionPlataforma,
      p.desglose.pagoDomiciliario,
      p.desglose.totalNegocio,
      p.desglose.gananciaPlataforma,
    ]);
    const csv = [cab, ...filas]
      .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `untoque-${this.desde()}_${this.hasta()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
