import { Timestamp } from 'firebase/firestore';

export type Rol = 'admin' | 'negocio' | 'domiciliario' | 'cliente';

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  negocioId?: string;
  activo: boolean;
  /** Solo domiciliarios: si está disponible para recibir pedidos. */
  disponible?: boolean;
}

export interface Zona {
  id: string;
  nombre: string;
  /** Lo que paga el cliente por el domicilio. 0 = zona gratis. */
  tarifaCliente: number;
  /** % de la tarifa que recibe el domiciliario. */
  porcentajeDomiciliario: number;
  /** Lo que se le paga al domiciliario cuando la tarifa es 0 (lo asume la plataforma). */
  pagoMinimoDomiciliario: number;
  activa: boolean;
}

export type TipoComision = 'porcentaje' | 'fijo';

export interface Ubicacion {
  lat: number;
  lng: number;
}

export interface Negocio {
  id: string;
  nombre: string;
  categoria: string;
  telefono: string;
  direccion: string;
  ubicacion?: Ubicacion | null;
  logoUrl?: string;
  tipoComision: TipoComision;
  valorComision: number;
  abierto: boolean;
  activo: boolean;
  usuarioId?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  fotoUrl?: string;
  disponible: boolean;
}

export interface Publicidad {
  id: string;
  negocioId: string;
  titulo: string;
  imagenUrl: string;
  fechaInicio: string; // yyyy-mm-dd
  fechaFin: string; // yyyy-mm-dd
  aprobada: boolean;
  orden: number;
  creadoEn?: Timestamp;
}

export type EstadoPedido =
  | 'creado'
  | 'enviado_negocio'
  | 'aceptado'
  | 'rechazado'
  | 'en_preparacion'
  | 'domiciliario_asignado'
  | 'recogido'
  | 'entregado'
  | 'cancelado';

export const ESTADOS_ACTIVOS: EstadoPedido[] = [
  'creado',
  'enviado_negocio',
  'aceptado',
  'en_preparacion',
  'domiciliario_asignado',
  'recogido',
];

export const ESTADO_LABEL: Record<EstadoPedido, string> = {
  creado: 'Creado',
  enviado_negocio: 'Enviado al negocio',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  en_preparacion: 'En preparación',
  domiciliario_asignado: 'Domiciliario asignado',
  recogido: 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

export interface ItemPedido {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface DatosCliente {
  nombre: string;
  telefono: string;
  direccion: string;
  referencia: string;
  ubicacion?: Ubicacion | null;
}

export interface Desglose {
  subtotal: number;
  tarifaDomicilio: number;
  comisionPlataforma: number;
  pagoDomiciliario: number;
  /** tarifa - pago al domiciliario. Negativo en zona gratis (lo asume la plataforma). */
  gananciaDomicilioPlataforma: number;
  /** Lo que se le debe al negocio: subtotal - comisión. */
  totalNegocio: number;
  /** Lo que paga el cliente: subtotal + tarifa. */
  totalCliente: number;
  /** comisión + ganancia de domicilio. */
  gananciaPlataforma: number;
}

export interface CambioEstado {
  estado: EstadoPedido;
  fecha: Timestamp;
  por: string;
}

export interface Pedido {
  id: string;
  numero: number;
  cliente: DatosCliente;
  zonaId: string;
  zonaNombre: string;
  negocioId: string;
  negocioNombre: string;
  domiciliarioId?: string | null;
  domiciliarioNombre?: string | null;
  items: ItemPedido[];
  desglose: Desglose;
  metodoPago: 'efectivo' | 'transferencia';
  notas: string;
  estado: EstadoPedido;
  historial: CambioEstado[];
  origen: 'admin' | 'web';
  /** Pedidos web: uid (anónimo) del navegador del cliente, para que pueda seguirlo. */
  clienteUid?: string | null;
  creadoEn: Timestamp;
  /** El emprendimiento avisa que ya se puede recoger. */
  listo?: boolean;
  motivoRechazo?: string;
  liquidacionNegocioId?: string | null;
  liquidacionDomiciliarioId?: string | null;
}

export interface Liquidacion {
  id: string;
  tipo: 'negocio' | 'domiciliario';
  entidadId: string;
  entidadNombre: string;
  desde: string;
  hasta: string;
  pedidoIds: string[];
  monto: number;
  estado: 'pendiente' | 'pagada';
  creadoEn: Timestamp;
  pagadaEn?: Timestamp | null;
}
