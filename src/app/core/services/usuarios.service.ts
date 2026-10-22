import { Injectable } from '@angular/core';
import { collection, doc, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { crearCuenta, db } from '../firebase';
import { Observable } from 'rxjs';
import { escucharColeccion, escucharDoc, limpiar } from '../firestore-utils';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private col = collection(db, 'usuarios');

  domiciliarios$ = escucharColeccion<Usuario>(query(this.col, where('rol', '==', 'domiciliario')));

  uno$(id: string): Observable<Usuario | null> {
    return escucharDoc<Usuario>(doc(this.col, id));
  }

  /** Crea la cuenta de acceso y su perfil. Devuelve el uid. */
  async crear(datos: Omit<Usuario, 'id'>, password: string): Promise<string> {
    const uid = await crearCuenta(datos.email, password);
    await setDoc(doc(this.col, uid), limpiar(datos));
    return uid;
  }

  actualizar(id: string, cambios: Partial<Usuario>): Promise<void> {
    return updateDoc(doc(this.col, id), limpiar(cambios));
  }
}
