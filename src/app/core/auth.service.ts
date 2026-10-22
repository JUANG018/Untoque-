import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Rol, Usuario } from './models';

export const RUTA_POR_ROL: Record<Rol, string> = {
  admin: '/admin',
  negocio: '/negocio',
  domiciliario: '/domi',
  cliente: '/',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(null);
  readonly rol = computed(() => this.usuario()?.rol ?? null);
  /** uid de cualquier sesión, incluida la anónima de los clientes de la web. */
  readonly uid = signal<string | null>(null);
  /** Se resuelve cuando Firebase termina de restaurar la sesión. */
  readonly listo: Promise<void>;

  constructor() {
    this.listo = new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        this.uid.set(user?.uid ?? null);
        if (!user || user.isAnonymous) {
          this.usuario.set(null);
        } else {
          const snap = await getDoc(doc(db, 'usuarios', user.uid)).catch(() => null);
          const data = snap?.exists() ? ({ ...snap.data(), id: snap.id } as Usuario) : null;
          this.usuario.set(data?.activo ? data : null);
        }
        resolve();
      });
    });
  }

  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'usuarios', cred.user.uid));
    const data = snap.exists() ? ({ ...snap.data(), id: snap.id } as Usuario) : null;
    if (!data || !data.activo) {
      await signOut(auth);
      throw new Error('Tu cuenta no tiene acceso o está desactivada.');
    }
    this.usuario.set(data);
    await this.router.navigateByUrl(RUTA_POR_ROL[data.rol]);
  }

  /** Los clientes de la web no crean cuenta: se les da una sesión anónima al pedir. */
  async sesionCliente(): Promise<string> {
    await this.listo;
    const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
    this.uid.set(uid);
    return uid;
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.usuario.set(null);
    await this.router.navigateByUrl('/login');
  }
}
