import { Injectable } from '@angular/core';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Observable } from 'rxjs';
import { db } from '../firebase';
import { escucharColeccion } from '../firestore-utils';
import { Publicidad } from '../models';

@Injectable({ providedIn: 'root' })
export class PublicidadService {
  private col = collection(db, 'publicidad');

  todas$ = escucharColeccion<Publicidad>(query(this.col, orderBy('orden')));

  /** Lo que pueden ver los clientes (las reglas solo dejan leer las aprobadas). */
  aprobadas$ = escucharColeccion<Publicidad>(query(this.col, where('aprobada', '==', true)));

  delNegocio$(negocioId: string): Observable<Publicidad[]> {
    return escucharColeccion<Publicidad>(query(this.col, where('negocioId', '==', negocioId)));
  }

  async crear(p: Omit<Publicidad, 'id' | 'creadoEn'>): Promise<void> {
    await addDoc(this.col, { ...p, creadoEn: Timestamp.now() });
  }

  actualizar(id: string, cambios: Partial<Publicidad>): Promise<void> {
    return updateDoc(doc(this.col, id), cambios);
  }

  eliminar(id: string): Promise<void> {
    return deleteDoc(doc(this.col, id));
  }
}
