import { calcularDesglose, resumir } from './desglose';
import { ItemPedido } from './models';

const items: ItemPedido[] = [
  { productoId: 'a', nombre: 'Hamburguesa', precio: 15000, cantidad: 2 },
  { productoId: 'b', nombre: 'Gaseosa', precio: 3500, cantidad: 1 },
];
const zonaNormal = { tarifaCliente: 4000, porcentajeDomiciliario: 80, pagoMinimoDomiciliario: 2500 };
const zonaGratis = { tarifaCliente: 0, porcentajeDomiciliario: 80, pagoMinimoDomiciliario: 2500 };

describe('calcularDesglose', () => {
  it('comisión por porcentaje en zona con tarifa', () => {
    const d = calcularDesglose(items, { tipoComision: 'porcentaje', valorComision: 10 }, zonaNormal);
    expect(d.subtotal).toBe(33500);
    expect(d.comisionPlataforma).toBe(3350);
    expect(d.totalNegocio).toBe(30150);
    expect(d.tarifaDomicilio).toBe(4000);
    expect(d.pagoDomiciliario).toBe(3200);
    expect(d.gananciaDomicilioPlataforma).toBe(800);
    expect(d.totalCliente).toBe(37500);
    expect(d.gananciaPlataforma).toBe(4150);
  });

  it('comisión fija', () => {
    const d = calcularDesglose(items, { tipoComision: 'fijo', valorComision: 2000 }, zonaNormal);
    expect(d.comisionPlataforma).toBe(2000);
    expect(d.totalNegocio).toBe(31500);
    expect(d.gananciaPlataforma).toBe(2800);
  });

  it('zona gratis: el cliente no paga domicilio y la plataforma asume el pago al domiciliario', () => {
    const d = calcularDesglose(items, { tipoComision: 'porcentaje', valorComision: 10 }, zonaGratis);
    expect(d.tarifaDomicilio).toBe(0);
    expect(d.totalCliente).toBe(33500);
    expect(d.pagoDomiciliario).toBe(2500);
    expect(d.gananciaDomicilioPlataforma).toBe(-2500);
    expect(d.gananciaPlataforma).toBe(850);
  });

  it('redondea a pesos enteros', () => {
    const d = calcularDesglose(
      [{ productoId: 'x', nombre: 'X', precio: 9999, cantidad: 1 }],
      { tipoComision: 'porcentaje', valorComision: 7.5 },
      { tarifaCliente: 3333, porcentajeDomiciliario: 75, pagoMinimoDomiciliario: 0 },
    );
    expect(d.comisionPlataforma).toBe(750);
    expect(d.pagoDomiciliario).toBe(2500);
    expect(Number.isInteger(d.gananciaDomicilioPlataforma)).toBe(true);
  });

  it('pedido vacío no cobra comisión', () => {
    const d = calcularDesglose([], { tipoComision: 'fijo', valorComision: 2000 }, zonaNormal);
    expect(d.comisionPlataforma).toBe(0);
  });
});

describe('resumir', () => {
  it('suma los desgloses', () => {
    const a = calcularDesglose(items, { tipoComision: 'porcentaje', valorComision: 10 }, zonaNormal);
    const b = calcularDesglose(items, { tipoComision: 'fijo', valorComision: 2000 }, zonaGratis);
    const r = resumir([a, b]);
    expect(r.pedidos).toBe(2);
    expect(r.ventas).toBe(67000);
    expect(r.comisiones).toBe(5350);
    expect(r.gananciaPlataforma).toBe(a.gananciaPlataforma + b.gananciaPlataforma);
  });
});
