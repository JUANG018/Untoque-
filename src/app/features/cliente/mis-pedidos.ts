import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { Pedido } from '../../core/models';
import { PedidosService } from '../../core/services/pedidos.service';
import { CopPipe, EstadoPipe, FechaPipe } from '../../shared/pipes';

@Component({
  selector: 'app-mis-pedidos',
  imports: [RouterLink, MatCardModule, CopPipe, EstadoPipe, FechaPipe],
  template: `
    <h1>Mis pedidos</h1>
    <div class="lista">
      @for (p of pedidos(); track p.id) {
        <a class="item-link" [routerLink]="['/pedido', p.id]">
          <mat-card class="item">
            <div class="item-fila">
              <div>
                <strong>#{{ p.numero }} · {{ p.negocioNombre }}</strong>
                <div class="sub">{{ p.creadoEn | fecha }} · {{ p.desglose.totalCliente | cop }}</div>
              </div>
              <span class="spacer"></span>
              <span class="chip estado-{{ p.estado }}">{{ p.estado | estado }}</span>
            </div>
          </mat-card>
        </a>
      } @empty {
        <p class="vacio">Aún no has hecho pedidos desde este celular.</p>
      }
    </div>
  `,
})
export class MisPedidos {
  private srv = inject(PedidosService);
  private lista = toSignal(
    toObservable(inject(AuthService).uid).pipe(
      switchMap((uid) => (uid ? this.srv.delCliente$(uid) : of([]))),
    ),
    { initialValue: [] as Pedido[] },
  );
  pedidos = computed(() => [...this.lista()].sort((a, b) => b.numero - a.numero));
}
