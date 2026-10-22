import { Desglose, ItemPedido, Negocio, Zona } from './models';

type ComisionNegocio = Pick<Negocio, 'tipoComision' | 'valorComision'>;
type TarifaZona = Pick<Zona, 'tarifaCliente' | 'porcentajeDomiciliario' | 'pagoMinimoDomiciliario'>;

export function calcularSubtotal(items: ItemPedido[]): number {
  return Math.round(items.reduce((s, i) => s + i.precio * i.cantidad, 0));
}

/** Calcula cómo se reparte el dinero de un pedido (pesos enteros). */
export function calcularDesglose(
  items: ItemPedido[],
  negocio: ComisionNegocio,
  zona: TarifaZona,
): Desglose {
  const subtotal = calcularSubtotal(items);

  const comisionPlataforma =
    subtotal === 0
      ? 0
      : negocio.tipoComision === 'porcentaje'
        ? Math.round((subtotal * negocio.valorComision) / 100)
        : Math.round(negocio.valorComision);

  const tarifaDomicilio = Math.round(zona.tarifaCliente);
  const pagoDomiciliario =
    tarifaDomicilio > 0
      ? Math.round((tarifaDomicilio * zona.porcentajeDomiciliario) / 100)
      : Math.round(zona.pagoMinimoDomiciliario);
  const gananciaDomicilioPlataforma = tarifaDomicilio - pagoDomiciliario;

  return {
    subtotal,
    tarifaDomicilio,
    comisionPlataforma,
    pagoDomiciliario,
    gananciaDomicilioPlataforma,
    totalNegocio: subtotal - comisionPlataforma,
    totalCliente: subtotal + tarifaDomicilio,
    gananciaPlataforma: comisionPlataforma + gananciaDomicilioPlataforma,
  };
}

export interface ResumenCuentas {
  pedidos: number;
  ventas: number;
  domicilios: number;
  comisiones: number;
  pagoDomiciliarios: number;
  gananciaDomicilios: number;
  totalNegocios: number;
  gananciaPlataforma: number;
}

export function resumir(desgloses: Desglose[]): ResumenCuentas {
  const r: ResumenCuentas = {
    pedidos: desgloses.length,
    ventas: 0,
    domicilios: 0,
    comisiones: 0,
    pagoDomiciliarios: 0,
    gananciaDomicilios: 0,
    totalNegocios: 0,
    gananciaPlataforma: 0,
  };
  for (const d of desgloses) {
    r.ventas += d.subtotal;
    r.domicilios += d.tarifaDomicilio;
    r.comisiones += d.comisionPlataforma;
    r.pagoDomiciliarios += d.pagoDomiciliario;
    r.gananciaDomicilios += d.gananciaDomicilioPlataforma;
    r.totalNegocios += d.totalNegocio;
    r.gananciaPlataforma += d.gananciaPlataforma;
  }
  return r;
}
