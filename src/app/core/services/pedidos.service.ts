import { Injectable } from '@angular/core';
import {
  Timestamp,
  arrayUnion,
  collection,
  doc,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { auth, db } from '../firebase';
import { escucharColeccion, escucharDoc } from '../firestore-utils';
import { ESTADOS_ACTIVOS, EstadoPedido, Pedido } from '../models';

export type NuevoPedido = Omit<Pedido, 'id' | 'numero' | 'historial' | 'creadoEn' | 'estado'>;

@Injectable({ providedIn: 'root' })
export class PedidosService {
  private col = collection(db, 'pedidos');

  /** Pedidos en curso, más los rechazados para que el admin decida qué hacer. */
  activos$ = escucharColeccion<Pedido>(
    query(this.col, where('estado', 'in', [...ESTADOS_ACTIVOS, 'rechazado'])),
  );

  /** Pedidos creados en [desde, hasta). */
  rango$(desde: Date, hasta: Date): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(
      query(
        this.col,
        where('creadoEn', '>=', Timestamp.fromDate(desde)),
        where('creadoEn', '<', Timestamp.fromDate(hasta)),
      ),
    );
  }

  /** Pedidos de un emprendimiento en ciertos estados (panel del negocio). */
  delNegocio$(negocioId: string, estados: EstadoPedido[]): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(
      query(this.col, where('negocioId', '==', negocioId), where('estado', 'in', estados)),
    );
  }

  /** Pedidos de un emprendimiento creados en [desde, hasta). Usa índice compuesto. */
  delNegocioRango$(negocioId: string, desde: Date, hasta: Date): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(
      query(
        this.col,
        where('negocioId', '==', negocioId),
        where('creadoEn', '>=', Timestamp.fromDate(desde)),
        where('creadoEn', '<', Timestamp.fromDate(hasta)),
      ),
    );
  }

  /** Pedidos asignados a un domiciliario en ciertos estados (panel del domiciliario). */
  delDomiciliario$(domiciliarioId: string, estados: EstadoPedido[]): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(
      query(
        this.col,
        where('domiciliarioId', '==', domiciliarioId),
        where('estado', 'in', estados),
      ),
    );
  }

  /** Pedidos de un domiciliario creados en [desde, hasta). Usa índice compuesto. */
  delDomiciliarioRango$(domiciliarioId: string, desde: Date, hasta: Date): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(
      query(
        this.col,
        where('domiciliarioId', '==', domiciliarioId),
        where('creadoEn', '>=', Timestamp.fromDate(desde)),
        where('creadoEn', '<', Timestamp.fromDate(hasta)),
      ),
    );
  }

  uno$(id: string): Observable<Pedido | null> {
    return escucharDoc<Pedido>(doc(this.col, id));
  }

  /** Pedidos hechos desde la web por un cliente (su sesión anónima). */
  delCliente$(clienteUid: string): Observable<Pedido[]> {
    return escucharColeccion<Pedido>(query(this.col, where('clienteUid', '==', clienteUid)));
  }

  /** Crea el pedido con número consecutivo. */
  async crear(
    p: NuevoPedido,
    estado: EstadoPedido = 'creado',
  ): Promise<{ id: string; numero: number }> {
    const contador = doc(db, 'contadores', 'pedidos');
    const nuevo = doc(this.col);
    const ahora = Timestamp.now();
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(contador);
      const numero = ((snap.data()?.['ultimo'] as number | undefined) ?? 0) + 1;
      tx.set(contador, { ultimo: numero });
      tx.set(nuevo, {
        ...p,
        numero,
        estado,
        creadoEn: ahora,
        historial: [{ estado, fecha: ahora, por: auth.currentUser?.uid ?? '' }],
      });
      return { id: nuevo.id, numero };
    });
  }

  cambiarEstado(id: string, estado: EstadoPedido, extra: Partial<Pedido> = {}): Promise<void> {
    return updateDoc(doc(this.col, id), {
      ...extra,
      estado,
      historial: arrayUnion({ estado, fecha: Timestamp.now(), por: auth.currentUser?.uid ?? '' }),
    });
  }

  actualizar(id: string, cambios: Partial<Pedido>): Promise<void> {
    return updateDoc(doc(this.col, id), cambios);
  }

  asignarDomiciliario(id: string, domiciliarioId: string, domiciliarioNombre: string): Promise<void> {
    return this.cambiarEstado(id, 'domiciliario_asignado', { domiciliarioId, domiciliarioNombre });
  }
}
