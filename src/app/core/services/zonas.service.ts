import { Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { escucharColeccion, limpiar } from '../firestore-utils';
import { Zona } from '../models';

@Injectable({ providedIn: 'root' })
export class ZonasService {
  private col = collection(db, 'zonas');

  todas$ = escucharColeccion<Zona>(query(this.col, orderBy('nombre')));

  async guardar(z: Zona): Promise<void> {
    if (z.id) await updateDoc(doc(this.col, z.id), limpiar(z));
    else await addDoc(this.col, limpiar(z));
  }

  eliminar(id: string): Promise<void> {
    return deleteDoc(doc(this.col, id));
  }
}
