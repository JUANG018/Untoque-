import { Component, DestroyRef, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { fechaISO } from '../../core/firestore-utils';
import { Negocio, Publicidad } from '../../core/models';
import { NegociosService } from '../../core/services/negocios.service';
import { PublicidadService } from '../../core/services/publicidad.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatChipsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  template: `
    @if (banners().length) {
      <div class="carrusel" #carrusel>
        @for (b of banners(); track b.id) {
          <a class="slide" [routerLink]="['/tienda', b.negocioId]">
            <img [src]="b.imagenUrl" [alt]="b.titulo" />
            <span class="slide-texto">{{ b.titulo }}</span>
          </a>
        }
      </div>
    }

    <h1 class="saludo">¿Qué se te antoja hoy?</h1>
    <mat-form-field class="buscador" subscriptSizing="dynamic">
      <mat-icon matPrefix>search</mat-icon>
      <input matInput placeholder="Buscar emprendimiento o categoría" (input)="busqueda.set(valor($event))" />
    </mat-form-field>

    @if (categorias().length > 1) {
      <mat-chip-listbox class="categorias" [value]="categoria()" (change)="categoria.set($event.value ?? '')">
        @for (c of categorias(); track c) {
          <mat-chip-option [value]="c">{{ c }}</mat-chip-option>
        }
      </mat-chip-listbox>
    }

    <div class="grid-tiendas">
      @for (n of visibles(); track n.id) {
        <a class="tienda-card" [routerLink]="['/tienda', n.id]" [class.cerrada]="!n.abierto">
          @if (n.logoUrl) {
            <img [src]="n.logoUrl" alt="" />
          } @else {
            <div class="sin-logo"><mat-icon>storefront</mat-icon></div>
          }
          <div class="tienda-info">
            <strong>{{ n.nombre }}</strong>
            <span class="sub">{{ n.categoria }}</span>
            <span class="chip" [class.chip-ok]="n.abierto">{{ n.abierto ? 'Abierto' : 'Cerrado' }}</span>
          </div>
        </a>
      } @empty {
        <p class="vacio">No encontramos emprendimientos con esa búsqueda.</p>
      }
    </div>
  `,
})
export class Inicio {
  private negocios = toSignal(inject(NegociosService).todos$, { initialValue: [] as Negocio[] });
  private anuncios = toSignal(inject(PublicidadService).aprobadas$, {
    initialValue: [] as Publicidad[],
  });
  private carrusel = viewChild<ElementRef<HTMLElement>>('carrusel');

  busqueda = signal('');
  categoria = signal('');

  banners = computed(() => {
    const hoy = fechaISO(new Date());
    return this.anuncios()
      .filter((a) => a.fechaInicio <= hoy && hoy <= a.fechaFin)
      .sort((a, b) => a.orden - b.orden);
  });

  private activos = computed(() => this.negocios().filter((n) => n.activo));
  categorias = computed(() =>
    [...new Set(this.activos().map((n) => n.categoria).filter(Boolean))].sort(),
  );
  /** Abiertos primero; filtra por búsqueda y categoría. */
  visibles = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const cat = this.categoria();
    return this.activos()
      .filter((n) => !cat || n.categoria === cat)
      .filter((n) => !q || `${n.nombre} ${n.categoria}`.toLowerCase().includes(q))
      .sort((a, b) => Number(b.abierto) - Number(a.abierto) || a.nombre.localeCompare(b.nombre));
  });

  constructor() {
    // Avanza el carrusel cada 5 segundos.
    const timer = setInterval(() => {
      const el = this.carrusel()?.nativeElement;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: fin ? 0 : el.scrollLeft + el.clientWidth, behavior: 'smooth' });
    }, 5000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  valor(ev: Event): string {
    return (ev.target as HTMLInputElement).value;
  }
}
