import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { Producto } from '../../core/models';
import { NegociosService } from '../../core/services/negocios.service';
import { CopPipe } from '../../shared/pipes';
import { CarritoService } from './carrito.service';

@Component({
  selector: 'app-tienda',
  imports: [RouterLink, MatButtonModule, MatIconModule, CopPipe],
  template: `
    <a mat-button routerLink="/"><mat-icon>arrow_back</mat-icon> Inicio</a>
    @if (negocio(); as n) {
      <header class="tienda-cabecera">
        @if (n.logoUrl) {
          <img [src]="n.logoUrl" alt="" />
        }
        <div>
          <h1>{{ n.nombre }}</h1>
          <span class="sub">{{ n.categoria }}</span>
          @if (!n.abierto) {
            <span class="chip">Cerrado ahora</span>
          }
        </div>
      </header>

      <div class="grid-productos">
        @for (p of productos(); track p.id) {
          <div class="producto-card">
            @if (p.fotoUrl) {
              <img [src]="p.fotoUrl" alt="" />
            }
            <div class="producto-info">
              <strong>{{ p.nombre }}</strong>
              @if (p.descripcion) {
                <span class="sub">{{ p.descripcion }}</span>
              }
              <span class="precio">{{ p.precio | cop }}</span>
            </div>
            @if (n.abierto) {
              @if (carrito.negocioId() === n.id && carrito.cantidad(p.id)) {
                <div class="contador-producto">
                  <button mat-icon-button (click)="carrito.cambiar(p.id, -1)" aria-label="Quitar">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="cantidad">{{ carrito.cantidad(p.id) }}</span>
                  <button mat-icon-button (click)="carrito.agregar(n, p)" aria-label="Agregar">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              } @else {
                <button mat-flat-button (click)="carrito.agregar(n, p)">Agregar</button>
              }
            }
          </div>
        } @empty {
          <p class="vacio">Este emprendimiento aún no tiene productos disponibles.</p>
        }
      </div>

      @if (carrito.negocioId() === n.id && carrito.unidades()) {
        <a mat-flat-button class="barra-carrito" routerLink="/carrito">
          Ver carrito ({{ carrito.unidades() }}) · {{ carrito.subtotal() | cop }}
        </a>
      }
    }
  `,
})
export class Tienda {
  private srv = inject(NegociosService);
  carrito = inject(CarritoService);

  /** Viene de la ruta /tienda/:id */
  id = input.required<string>();
  negocio = toSignal(toObservable(this.id).pipe(switchMap((id) => this.srv.uno$(id))));
  private todos = toSignal(toObservable(this.id).pipe(switchMap((id) => this.srv.productos$(id))), {
    initialValue: [] as Producto[],
  });
  productos = computed(() => this.todos().filter((p) => p.disponible));
}
