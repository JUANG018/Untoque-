import { Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase';
import { escucharColeccion, escucharDoc, limpiar } from '../firestore-utils';
import { Negocio, Producto } from '../models';

@Injectable({ providedIn: 'root' })
export class NegociosService {
  private col = collection(db, 'negocios');

  todos$ = escucharColeccion<Negocio>(query(this.col, orderBy('nombre')));

  uno$(id: string): Observable<Negocio | null> {
    return escucharDoc<Negocio>(doc(this.col, id));
  }

  /** Crea o actualiza; devuelve el id. */
  async guardar(n: Negocio): Promise<string> {
    if (n.id) {
      await updateDoc(doc(this.col, n.id), limpiar(n));
      return n.id;
    }
    const r = await addDoc(this.col, limpiar(n));
    return r.id;
  }

  actualizar(id: string, cambios: Partial<Negocio>): Promise<void> {
    return updateDoc(doc(this.col, id), cambios);
  }

  productos$(negocioId: string): Observable<Producto[]> {
    return escucharColeccion<Producto>(
      query(collection(db, 'negocios', negocioId, 'productos'), orderBy('nombre')),
    );
  }

  /** Lectura puntual (sin escuchar cambios) del menú. */
  async productosUnaVez(negocioId: string): Promise<Producto[]> {
    const snap = await getDocs(collection(db, 'negocios', negocioId, 'productos'));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Producto);
  }

  async guardarProducto(negocioId: string, p: Producto): Promise<void> {
    const col = collection(db, 'negocios', negocioId, 'productos');
    if (p.id) await setDoc(doc(col, p.id), limpiar(p));
    else await addDoc(col, limpiar(p));
  }

  eliminarProducto(negocioId: string, id: string): Promise<void> {
    return deleteDoc(doc(db, 'negocios', negocioId, 'productos', id));
  }
}
