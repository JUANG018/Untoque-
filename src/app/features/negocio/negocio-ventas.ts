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
import { NegocioActual } from './negocio-actual';

@Component({
  selector: 'app-negocio-ventas',
  imports: [MatCardModule, MatButtonToggleModule, CopPipe, FechaPipe],
  template: `
    <div class="fila centrado envolver">
      <h1>Mis ventas</h1>
      <span class="spacer"></span>
      <mat-button-toggle-group [value]="periodo()" (change)="periodo.set($event.value)">
        <mat-button-toggle value="hoy">Hoy</mat-button-toggle>
        <mat-button-toggle value="semana">Semana</mat-button-toggle>
        <mat-button-toggle value="mes">Mes</mat-button-toggle>
      </mat-button-toggle-group>
    </div>
    <p class="ayuda">Pedidos entregados desde {{ desde() }}.</p>

    <div class="tarjetas">
      <mat-card class="kpi destacado"><span>Te corresponde</span><strong>{{ totales().recibes | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Pedidos entregados</span><strong>{{ entregados().length }}</strong></mat-card>
      <mat-card class="kpi"><span>Ventas</span><strong>{{ totales().ventas | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Comisión Untoque</span><strong>{{ totales().comision | cop }}</strong></mat-card>
      <mat-card class="kpi"><span>Pendiente por liquidar</span><strong>{{ totales().sinLiquidar | cop }}</strong></mat-card>
    </div>

    <h2>Pedidos</h2>
    <div class="tabla-scroll">
      <table class="tabla">
        <thead>
          <tr><th>#</th><th>Fecha</th><th>Productos</th><th>Venta</th><th>Comisión</th><th>Recibes</th></tr>
        </thead>
        <tbody>
          @for (p of entregados(); track p.id) {
            <tr>
              <td>{{ p.numero }}</td>
              <td>{{ p.creadoEn | fecha }}</td>
              <td>{{ p.items.length }}</td>
              <td>{{ p.desglose.subtotal | cop }}</td>
              <td>{{ p.desglose.comisionPlataforma | cop }}</td>
              <td>{{ p.desglose.totalNegocio | cop }}</td>
            </tr>
          } @empty {
            <tr><td colspan="6" class="vacio">Sin pedidos entregados en este período.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <h2>Mis liquidaciones</h2>
    <table class="tabla">
      <thead><tr><th>Período</th><th>Pedidos</th><th>Monto</th><th>Estado</th></tr></thead>
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
export class NegocioVentas {
  private actual = inject(NegocioActual);
  private pedidosSrv = inject(PedidosService);
  private liqSrv = inject(LiquidacionesService);

  periodo = signal<Periodo>('hoy');
  desde = computed(() => inicioPeriodo(this.periodo()));
  private consulta = computed(() => ({ id: this.actual.id(), ...rangoFechas(this.desde(), fechaISO(new Date())) }));

  private pedidos = toSignal(
    toObservable(this.consulta).pipe(
      switchMap(({ id, d, h }) => (id ? this.pedidosSrv.delNegocioRango$(id, d, h) : of([]))),
    ),
    { initialValue: [] as Pedido[] },
  );
  entregados = computed(() =>
    this.pedidos()
      .filter((p) => p.estado === 'entregado')
      .sort((a, b) => b.numero - a.numero),
  );
  totales = computed(() => {
    const t = { ventas: 0, comision: 0, recibes: 0, sinLiquidar: 0 };
    for (const p of this.entregados()) {
      t.ventas += p.desglose.subtotal;
      t.comision += p.desglose.comisionPlataforma;
      t.recibes += p.desglose.totalNegocio;
      if (!p.liquidacionNegocioId) t.sinLiquidar += p.desglose.totalNegocio;
    }
    return t;
  });

  private liqs = toSignal(
    toObservable(this.actual.id).pipe(
      switchMap((id) => (id ? this.liqSrv.de$('negocio', id) : of([]))),
    ),
    { initialValue: [] as Liquidacion[] },
  );
  liquidaciones = computed(() =>
    [...this.liqs()].sort((a, b) => b.creadoEn.toMillis() - a.creadoEn.toMillis()),
  );
}
