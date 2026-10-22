import { Injectable, computed, effect, signal } from '@angular/core';
import { DatosCliente, ItemPedido, Negocio, Producto } from '../../core/models';

interface EstadoCarrito {
  negocioId: string;
  negocioNombre: string;
  items: ItemPedido[];
}

export interface DatosGuardados extends DatosCliente {
  zonaId: string;
}

const CLAVE_CARRITO = 'untoque.carrito';
const CLAVE_CLIENTE = 'untoque.cliente';

function leer<T>(clave: string): T | null {
  try {
    const v = localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Modo privado o almacenamiento bloqueado: el carrito vive solo en memoria.
  }
}

/** Carrito de la web. Solo admite productos de un emprendimiento a la vez. */
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private estado = signal<EstadoCarrito>(
    leer<EstadoCarrito>(CLAVE_CARRITO) ?? { negocioId: '', negocioNombre: '', items: [] },
  );

  readonly negocioId = computed(() => this.estado().negocioId);
  readonly negocioNombre = computed(() => this.estado().negocioNombre);
  readonly items = computed(() => this.estado().items);
  readonly unidades = computed(() => this.items().reduce((s, i) => s + i.cantidad, 0));
  readonly subtotal = computed(() => this.items().reduce((s, i) => s + i.precio * i.cantidad, 0));

  constructor() {
    effect(() => escribir(CLAVE_CARRITO, this.estado()));
  }

  cantidad(productoId: string): number {
    return this.items().find((i) => i.productoId === productoId)?.cantidad ?? 0;
  }

  /** Devuelve false si el usuario no quiso cambiar de emprendimiento. */
  agregar(negocio: Negocio, p: Producto): boolean {
    const e = this.estado();
    if (e.negocioId && e.negocioId !== negocio.id && e.items.length) {
      const ok = confirm(
        `Tu carrito tiene productos de ${e.negocioNombre}. ¿Vaciarlo para pedir en ${negocio.nombre}?`,
      );
      if (!ok) return false;
      this.vaciar();
    }
    this.estado.update((s) => {
      const existe = s.items.some((i) => i.productoId === p.id);
      return {
        negocioId: negocio.id,
        negocioNombre: negocio.nombre,
        items: existe
          ? s.items.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
          : [...s.items, { productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }],
      };
    });
    return true;
  }

  cambiar(productoId: string, delta: number): void {
    this.estado.update((s) => ({
      ...s,
      items: s.items
        .map((i) => (i.productoId === productoId ? { ...i, cantidad: i.cantidad + delta } : i))
        .filter((i) => i.cantidad > 0),
    }));
  }

  vaciar(): void {
    this.estado.set({ negocioId: '', negocioNombre: '', items: [] });
  }

  /** Datos de entrega recordados para el próximo pedido. */
  datosCliente(): DatosGuardados | null {
    return leer<DatosGuardados>(CLAVE_CLIENTE);
  }

  guardarDatosCliente(d: DatosGuardados): void {
    escribir(CLAVE_CLIENTE, d);
  }
}
