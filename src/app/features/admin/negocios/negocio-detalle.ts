import { Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { NegociosService } from '../../../core/services/negocios.service';
import { ProductosEditor } from '../../../shared/productos-editor';

@Component({
  selector: 'app-negocio-detalle',
  imports: [RouterLink, MatButtonModule, MatIconModule, ProductosEditor],
  template: `
    <a mat-button routerLink="/admin/negocios"><mat-icon>arrow_back</mat-icon> Emprendimientos</a>
    <h1>Menú de {{ negocio()?.nombre }}</h1>
    <app-productos-editor [negocioId]="id()" />
  `,
})
export class NegocioDetalle {
  private srv = inject(NegociosService);
  /** Viene de la ruta /admin/negocios/:id */
  id = input.required<string>();
  negocio = toSignal(toObservable(this.id).pipe(switchMap((id) => this.srv.uno$(id))));
}
