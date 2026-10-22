import { Injectable, computed, effect, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { AvisosService } from '../../core/avisos.service';
import { Negocio, Pedido } from '../../core/models';
import { NegociosService } from '../../core/services/negocios.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { UsuariosService } from '../../core/services/usuarios.service';

/**
 * Estado del domiciliario con sesión iniciada. Lo provee el layout para que los avisos
 * suenen en cualquier pestaña del panel.
 */
@Injectable()
export class DomiActual {
  private auth = inject(AuthService);
  private avisos = inject(AvisosService);
  private usuarios = inject(UsuariosService);
  private pedidosSrv = inject(PedidosService);

  readonly id = computed(() => this.auth.usuario()?.id ?? '');
  private id$ = toObservable(this.id);

  /** Perfil en vivo (para el interruptor de disponible). */
  readonly perfil = toSignal(
    this.id$.pipe(switchMap((id) => (id ? this.usuarios.uno$(id) : of(null)))),
  );

  readonly pedidos = toSignal(
    this.id$.pipe(
      switchMap((id) =>
        id ? this.pedidosSrv.delDomiciliario$(id, ['domiciliario_asignado', 'recogido']) : of([]),
      ),
    ),
    { initialValue: [] as Pedido[] },
  );

  private negocios = toSignal(inject(NegociosService).todos$, { initialValue: [] as Negocio[] });
  private negociosPorId = computed(() => new Map(this.negocios().map((n) => [n.id, n])));

  constructor() {
    let previo: Map<string, boolean> | null = null;
    effect(() => {
      const actual = new Map(this.pedidos().map((p) => [p.id, !!p.listo]));
      if (previo) {
        for (const p of this.pedidos()) {
          if (!previo.has(p.id)) {
            this.avisos.avisar(`Te asignaron el pedido #${p.numero}`, `Recoger en ${p.negocioNombre}`);
          } else if (p.listo && !previo.get(p.id)) {
            this.avisos.avisar(`#${p.numero} está listo`, `Ya puedes recogerlo en ${p.negocioNombre}`);
          }
        }
      }
      previo = actual;
      const n = this.pedidos().length;
      document.title = n ? `(${n}) Entregas · Untoque` : 'Untoque';
    });
  }

  negocio(id: string): Negocio | undefined {
    return this.negociosPorId().get(id);
  }

  cambiarDisponible(disponible: boolean): Promise<void> {
    return this.usuarios.actualizar(this.id(), { disponible });
  }
}
