import { Injectable, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AvisosService } from '../../core/avisos.service';
import { EstadoPedido, Pedido } from '../../core/models';
import { NegociosService } from '../../core/services/negocios.service';
import { PedidosService } from '../../core/services/pedidos.service';

const ESTADOS_NEGOCIO: EstadoPedido[] = [
  'enviado_negocio',
  'aceptado',
  'en_preparacion',
  'domiciliario_asignado',
];

/**
 * Estado del emprendimiento con sesión iniciada. Lo provee el layout del negocio para que
 * los avisos de pedidos nuevos suenen en cualquier pestaña del panel.
 */
@Injectable()
export class NegocioActual {
  private avisos = inject(AvisosService);
  private negociosSrv = inject(NegociosService);
  private auth = inject(AuthService);

  readonly id = computed(() => this.auth.usuario()?.negocioId ?? '');
  private id$ = toObservable(this.id);

  readonly negocio = toSignal(
    this.id$.pipe(switchMap((id) => (id ? this.negociosSrv.uno$(id) : of(null)))),
  );

  private pedidosSrv = inject(PedidosService);
  readonly pedidos = toSignal(
    this.id$.pipe(
      switchMap((id) => (id ? this.pedidosSrv.delNegocio$(id, ESTADOS_NEGOCIO) : of([]))),
    ),
    { initialValue: [] as Pedido[] },
  );
  readonly nuevos = computed(() => this.pedidos().filter((p) => p.estado === 'enviado_negocio'));

  constructor() {
    let conocidos: Set<string> | null = null;
    effect(() => {
      const nuevos = this.nuevos();
      const ids = new Set(nuevos.map((p) => p.id));
      // La primera carga no avisa: solo los que lleguen después.
      if (conocidos) {
        for (const p of nuevos) {
          if (!conocidos.has(p.id)) {
            this.avisos.avisar(`Nuevo pedido #${p.numero}`, resumenItems(p));
          }
        }
      }
      conocidos = ids;
      document.title = nuevos.length ? `(${nuevos.length}) Pedidos nuevos · Untoque` : 'Untoque';
    });
  }

  cambiarAbierto(abierto: boolean): Promise<void> {
    return this.negociosSrv.actualizar(this.id(), { abierto });
  }
}

export function resumenItems(p: Pedido): string {
  return p.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ');
}
