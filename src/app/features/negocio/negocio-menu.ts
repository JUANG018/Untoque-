import { Component, inject } from '@angular/core';
import { ProductosEditor } from '../../shared/productos-editor';
import { NegocioActual } from './negocio-actual';

@Component({
  selector: 'app-negocio-menu',
  imports: [ProductosEditor],
  template: `
    <h1>Mi menú</h1>
    <p class="ayuda">Apaga "Disponible" cuando se te acabe un producto para que no lo pidan.</p>
    @if (actual.id()) {
      <app-productos-editor [negocioId]="actual.id()" />
    }
  `,
})
export class NegocioMenu {
  actual = inject(NegocioActual);
}
