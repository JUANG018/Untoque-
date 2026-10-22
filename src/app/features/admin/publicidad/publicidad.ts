import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { fechaISO, subirImagen } from '../../../core/firestore-utils';
import { Negocio, Publicidad } from '../../../core/models';
import { NegociosService } from '../../../core/services/negocios.service';
import { PublicidadService } from '../../../core/services/publicidad.service';

@Component({
  selector: 'app-publicidad-admin',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  template: `
    <h1>Publicidad</h1>
    <p class="ayuda">
      Cada emprendimiento podrá subir sus banners desde su panel; quedan pendientes hasta que tú los
      apruebes. También puedes subirlos tú aquí. Saldrán en la web del cliente en el orden indicado.
    </p>
    <div class="dos-columnas">
      <mat-card>
        @if (guardando()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-card-header><mat-card-title>Nuevo banner</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="crear()" class="col">
            <mat-form-field>
              <mat-label>Emprendimiento</mat-label>
              <mat-select formControlName="negocioId">
                @for (n of negocios(); track n.id) {
                  <mat-option [value]="n.id">{{ n.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Título / texto</mat-label>
              <input matInput formControlName="titulo" placeholder="2x1 en hamburguesas los martes" />
            </mat-form-field>
            <div class="fila">
              <mat-form-field>
                <mat-label>Desde</mat-label>
                <input matInput type="date" formControlName="fechaInicio" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Hasta</mat-label>
                <input matInput type="date" formControlName="fechaFin" />
              </mat-form-field>
            </div>
            <div class="fila centrado">
              @if (preview()) {
                <img [src]="preview()" alt="" class="banner-mini" />
              }
              <button mat-stroked-button type="button" (click)="archivo.click()">
                <mat-icon>image</mat-icon> Imagen
              </button>
              <input #archivo type="file" accept="image/*" hidden (change)="elegir($event)" />
            </div>
            <div class="acciones">
              <button mat-flat-button type="submit" [disabled]="form.invalid || !preview() || guardando()">
                Publicar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="lista">
        @for (p of anuncios(); track p.id) {
          <mat-card class="item" [class.inactivo]="!p.aprobada">
            <img [src]="p.imagenUrl" alt="" class="banner" />
            <div class="item-fila">
              <div>
                <strong>{{ p.titulo }}</strong>
                @if (!p.aprobada) {
                  <span class="chip estado-creado">Por aprobar</span>
                }
                <div class="sub">
                  {{ nombreNegocio(p.negocioId) }} · {{ p.fechaInicio }} a {{ p.fechaFin }}
                  @if (p.fechaFin < hoy) {
                    · <em>vencido</em>
                  }
                </div>
              </div>
              <span class="spacer"></span>
              <mat-slide-toggle [checked]="p.aprobada" (change)="srv.actualizar(p.id, { aprobada: $event.checked })">
                Aprobado
              </mat-slide-toggle>
              <button mat-icon-button (click)="mover(p, -1)" aria-label="Subir"><mat-icon>arrow_upward</mat-icon></button>
              <button mat-icon-button (click)="mover(p, 1)" aria-label="Bajar"><mat-icon>arrow_downward</mat-icon></button>
              <button mat-icon-button (click)="eliminar(p)" aria-label="Eliminar"><mat-icon>delete</mat-icon></button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no hay publicidad.</p>
        }
      </div>
    </div>
  `,
})
export class PublicidadAdmin {
  srv = inject(PublicidadService);
  private snack = inject(MatSnackBar);
  anuncios = toSignal(this.srv.todas$, { initialValue: [] as Publicidad[] });
  negocios = toSignal(inject(NegociosService).todos$, { initialValue: [] as Negocio[] });
  private nombres = computed(() => new Map(this.negocios().map((n) => [n.id, n.nombre])));
  hoy = fechaISO(new Date());
  preview = signal('');
  guardando = signal(false);
  private archivo: File | null = null;

  form = inject(FormBuilder).nonNullable.group({
    negocioId: ['', Validators.required],
    titulo: ['', Validators.required],
    fechaInicio: [this.hoy, Validators.required],
    fechaFin: [this.hoy, Validators.required],
  });

  nombreNegocio(id: string) {
    return this.nombres().get(id) ?? '—';
  }

  elegir(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.archivo = f;
    this.preview.set(URL.createObjectURL(f));
  }

  async crear() {
    if (!this.archivo) return;
    this.guardando.set(true);
    try {
      const imagenUrl = await subirImagen('publicidad', this.archivo);
      const orden = Math.max(0, ...this.anuncios().map((a) => a.orden)) + 1;
      await this.srv.crear({ ...this.form.getRawValue(), imagenUrl, aprobada: true, orden });
      this.form.reset();
      this.preview.set('');
      this.archivo = null;
      this.snack.open('Banner publicado', 'OK', { duration: 2500 });
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Intercambia el orden con el vecino de arriba/abajo. */
  async mover(p: Publicidad, dir: -1 | 1) {
    const lista = this.anuncios();
    const i = lista.findIndex((a) => a.id === p.id);
    const otro = lista[i + dir];
    if (!otro) return;
    await Promise.all([
      this.srv.actualizar(p.id, { orden: otro.orden }),
      this.srv.actualizar(otro.id, { orden: p.orden }),
    ]);
  }

  async eliminar(p: Publicidad) {
    if (confirm(`¿Eliminar el banner "${p.titulo}"?`)) await this.srv.eliminar(p.id);
  }
}
