import { Injectable } from '@angular/core';
import {
  Timestamp,
  collection,
  doc,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase';
import { escucharColeccion } from '../firestore-utils';
import { Liquidacion, Pedido } from '../models';

@Injectable({ providedIn: 'root' })
export class LiquidacionesService {
  private col = collection(db, 'liquidaciones');

  todas$ = escucharColeccion<Liquidacion>(query(this.col, orderBy('creadoEn', 'desc')));

  /** Liquidaciones de un emprendimiento o domiciliario (sus propios paneles). */
  de$(tipo: Liquidacion['tipo'], entidadId: string): Observable<Liquidacion[]> {
    return escucharColeccion<Liquidacion>(
      query(this.col, where('tipo', '==', tipo), where('entidadId', '==', entidadId)),
    );
  }

  /** Agrupa pedidos entregados en una liquidación y los marca para no pagarlos dos veces. */
  async generar(
    tipo: Liquidacion['tipo'],
    entidadId: string,
    entidadNombre: string,
    desde: string,
    hasta: string,
    pedidos: Pedido[],
  ): Promise<void> {
    const campo = tipo === 'negocio' ? 'liquidacionNegocioId' : 'liquidacionDomiciliarioId';
    const monto = pedidos.reduce(
      (s, p) => s + (tipo === 'negocio' ? p.desglose.totalNegocio : p.desglose.pagoDomiciliario),
      0,
    );
    const batch = writeBatch(db);
    const liq = doc(this.col);
    batch.set(liq, {
      tipo,
      entidadId,
      entidadNombre,
      desde,
      hasta,
      pedidoIds: pedidos.map((p) => p.id),
      monto,
      estado: 'pendiente',
      creadoEn: Timestamp.now(),
      pagadaEn: null,
    });
    for (const p of pedidos) batch.update(doc(db, 'pedidos', p.id), { [campo]: liq.id });
    await batch.commit();
  }

  marcarPagada(id: string): Promise<void> {
    return updateDoc(doc(this.col, id), { estado: 'pagada', pagadaEn: Timestamp.now() });
  }

  /** Anula una liquidación pendiente y libera sus pedidos. */
  async anular(l: Liquidacion): Promise<void> {
    const campo = l.tipo === 'negocio' ? 'liquidacionNegocioId' : 'liquidacionDomiciliarioId';
    const batch = writeBatch(db);
    for (const id of l.pedidoIds) batch.update(doc(db, 'pedidos', id), { [campo]: null });
    batch.delete(doc(this.col, l.id));
    await batch.commit();
  }
}
