import { DocumentReference, Query, onSnapshot } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Observable } from 'rxjs';
import { storage } from './firebase';

/** Escucha una consulta en tiempo real; cada documento incluye su `id`. */
export function escucharColeccion<T extends { id: string }>(q: Query): Observable<T[]> {
  return new Observable<T[]>((sub) =>
    onSnapshot(
      q,
      (snap) => sub.next(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T)),
      (err) => sub.error(err),
    ),
  );
}

export function escucharDoc<T extends { id: string }>(r: DocumentReference): Observable<T | null> {
  return new Observable<T | null>((sub) =>
    onSnapshot(
      r,
      (snap) => sub.next(snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null),
      (err) => sub.error(err),
    ),
  );
}

/** Quita `id` y los campos undefined antes de guardar en Firestore. */
export function limpiar<T extends object>(data: T): Omit<T, 'id'> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'id' && v !== undefined) out[k] = v;
  }
  return out as Omit<T, 'id'>;
}

export async function subirImagen(carpeta: string, archivo: File): Promise<string> {
  const ext = archivo.name.split('.').pop() ?? 'jpg';
  const r = ref(storage, `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
  await uploadBytes(r, archivo, { contentType: archivo.type });
  return getDownloadURL(r);
}

export type Periodo = 'hoy' | 'semana' | 'mes';

/** Fecha de inicio (yyyy-mm-dd) del período que contiene a `hoy`. La semana empieza el lunes. */
export function inicioPeriodo(p: Periodo, hoy = new Date()): string {
  const inicio = new Date(hoy);
  if (p === 'semana') inicio.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  if (p === 'mes') inicio.setDate(1);
  return fechaISO(inicio);
}

/** [desde, hasta) como Date a partir de dos fechas yyyy-mm-dd inclusivas. */
export function rangoFechas(desde: string, hasta: string): { d: Date; h: Date } {
  const d = new Date(desde + 'T00:00:00');
  const h = new Date(hasta + 'T00:00:00');
  h.setDate(h.getDate() + 1);
  return { d, h };
}

/** yyyy-mm-dd en hora local. */
export function fechaISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
