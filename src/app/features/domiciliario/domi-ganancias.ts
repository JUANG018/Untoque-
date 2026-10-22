import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { of, switchMap } from 'rxjs';
import { Periodo, fechaISO, inicioPeriodo, rangoFechas } from '../../core/firestore-utils';
import { Liquidacion, Pedido } from '../../core/models';
import { LiquidacionesService } from '../../core/services/liquidaciones.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { CopPipe, FechaPipe } from '../../shared/pipes';
import { DomiActual } from './domi-actual';

@Component({
  selector: 'app-domi-ganancias',
  imports: [MatCardModule, MatButtonToggleModule, CopPipe, FechaPipe],
  template: `
    <div class="fila centrado envolver">
      <h1>Mis ganancias</h1>
      <span class="spacer"></span>
      <mat-button-toggle-group [value]="periodo()" (change)="periodo.set($event.value)">
        <mat-button-toggle value="hoy">Hoy</mat-button-toggle>
        <mat-button-toggle value="semana">Semana</mat-button-toggle>
        <mat-button-toggle value="mes">Mes</mat-button-toggle>
      </mat-button-toggle-group>
    </div>
    <p class="ayuda">Entregas realizadas desde {{ desde() }}.</p>

    <div class="tarjetas">
      <mat-card class="kpi destacado"><span>Ganaste</span><strong>{{ totales().ganado | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Entregas</span><strong>{{ entregados().length }}</strong></mat-card>
      <mat-card class="kpi"><span>Efectivo recaudado</span><strong>{{ totales().efectivo | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Pendiente por liquidar</span><strong>{{ totales().sinLiquidar | cop }}</strong></mat-card>
    </div>

    <h2>Entregas</h2>
    <div class="tabla-scroll">
      <table class="tabla">
        <thead>
          <tr><th>#</th><th>Fecha</th><th>Emprendimiento</th><th>Zona</th><th>Cobrado</th><th>Ganaste</th></tr>
        </thead>
        <tbody>
          @for (p of entregados(); track p.id) {
            <tr>
              <td>{{ p.numero }}</td>
              <td>{{ p.creadoEn | fecha }}</td>
              <td>{{ p.negocioNombre }}</td>
              <td>{{ p.zonaNombre }}</td>
              <td>{{ p.metodoPago === 'efectivo' ? (p.desglose.totalCliente | cop) : 'Transferencia' }}</td>
              <td>{{ p.desglose.pagoDomiciliario | cop }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="vacio">Sin entregas en este período.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <h2>Mis liquidaciones</h2>
    <table class="tabla">
      <thead><tr><th>Período</th><th>Entregas</th><th>Monto</th><th>Estado</th></tr></thead>
      <tbody>
        @for (l of liquidaciones(); track l.id) {
          <tr>
            <td>{{ l.desde }} a {{ l.hasta }}</td>
            <td>{{ l.pedidoIds.length }}</td>
            <td>{{ l.monto | cop }}</td>
            <td>
              <span class="chip" [class.chip-ok]="l.estado === 'pagada'">
                {{ l.estado === 'pagada' ? 'Pagada ' + (l.pagadaEn | fecha) : 'Pendiente de pago' }}
              </span>
            </td>
          </tr>
        } @empty {
          <tr><td colspan="4" class="vacio">Aún no tienes liquidaciones.</td></tr>
        }
      </tbody>
    </table>
  `,
})
export class DomiGanancias {
  private actual = inject(DomiActual);
  private pedidosSrv = inject(PedidosService);
  private liqSrv = inject(LiquidacionesService);

  periodo = signal<Periodo>('hoy');
  desde = computed(() => inicioPeriodo(this.periodo()));
  private consulta = computed(() => ({
    id: this.actual.id(),
    ...rangoFechas(this.desde(), fechaISO(new Date())),
  }));

  private pedidos = toSignal(
    toObservable(this.consulta).pipe(
      switchMap(({ id, d, h }) => (id ? this.pedidosSrv.delDomiciliarioRango$(id, d, h) : of([]))),
    ),
    { initialValue: [] as Pedido[] },
  );
  entregados = computed(() =>
    this.pedidos()
      .filter((p) => p.estado === 'entregado')
      .sort((a, b) => b.numero - a.numero),
  );
  totales = computed(() => {
    const t = { ganado: 0, efectivo: 0, sinLiquidar: 0 };
    for (const p of this.entregados()) {
      t.ganado += p.desglose.pagoDomiciliario;
      if (p.metodoPago === 'efectivo') t.efectivo += p.desglose.totalCliente;
      if (!p.liquidacionDomiciliarioId) t.sinLiquidar += p.desglose.pagoDomiciliario;
    }
    return t;
  });

  private liqs = toSignal(
    toObservable(this.actual.id).pipe(
      switchMap((id) => (id ? this.liqSrv.de$('domiciliario', id) : of([]))),
    ),
    { initialValue: [] as Liquidacion[] },
  );
  liquidaciones = computed(() =>
    [...this.liqs()].sort((a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis()),
  );
}
