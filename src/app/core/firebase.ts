import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { environment } from '../../environments/environment';

export const firebaseApp = initializeApp(environment.firebase);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

if (environment.useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

/**
 * Crea una cuenta de acceso (para un negocio o domiciliario) sin cerrar la
 * sesión del administrador, usando una instancia secundaria de Firebase.
 */
export async function crearCuenta(email: string, password: string): Promise<string> {
  const secundaria = initializeApp(environment.firebase, `secundaria-${Date.now()}`);
  const authSec = getAuth(secundaria);
  if (environment.useEmulators) {
    connectAuthEmulator(authSec, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  try {
    const cred = await createUserWithEmailAndPassword(authSec, email, password);
    return cred.user.uid;
  } finally {
    await signOut(authSec).catch(() => undefined);
    await deleteApp(secundaria);
  }
}
