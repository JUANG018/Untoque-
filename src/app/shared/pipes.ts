import { Pipe, PipeTransform } from '@angular/core';
import { Timestamp } from 'firebase/firestore';
import { ESTADO_LABEL, EstadoPedido } from '../core/models';

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** 12500 -> "$ 12.500" */
@Pipe({ name: 'cop' })
export class CopPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return cop.format(v ?? 0);
  }
}

@Pipe({ name: 'estado' })
export class EstadoPipe implements PipeTransform {
  transform(e: EstadoPedido): string {
    return ESTADO_LABEL[e] ?? e;
  }
}

const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' });

@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(t: Timestamp | null | undefined): string {
    return t ? fechaHora.format(t.toDate()) : '';
  }
}
