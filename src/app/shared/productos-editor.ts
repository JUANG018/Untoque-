import { Component, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs';
import { subirImagen } from '../core/firestore-utils';
import { Producto } from '../core/models';
import { NegociosService } from '../core/services/negocios.service';
import { CopPipe } from './pipes';

/** Formulario + lista de productos de un emprendimiento (lo usan el admin y el propio negocio). */
@Component({
  selector: 'app-productos-editor',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    CopPipe,
  ],
  template: `
    <div class="dos-columnas">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ editandoId() ? 'Editar producto' : 'Nuevo producto' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="col">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="nombre" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Descripción</mat-label>
              <textarea matInput formControlName="descripcion" rows="2"></textarea>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Precio</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="precio" min="0" />
            </mat-form-field>
            <div class="fila centrado">
              @if (fotoUrl()) {
                <img [src]="fotoUrl()" alt="" class="mini" />
              }
              <button mat-stroked-button type="button" (click)="archivo.click()">
                <mat-icon>photo_camera</mat-icon> Foto
              </button>
              <input #archivo type="file" accept="image/*" hidden (change)="elegirFoto($event)" />
            </div>
            <mat-slide-toggle formControlName="disponible">Disponible</mat-slide-toggle>
            <div class="acciones">
              @if (editandoId()) {
                <button mat-button type="button" (click)="nuevo()">Cancelar</button>
              }
              <button mat-flat-button type="submit" [disabled]="form.invalid || guardando()">
                Guardar
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="lista">
        @for (p of productos(); track p.id) {
          <mat-card class="item" [class.inactivo]="!p.disponible">
            <div class="item-fila">
              @if (p.fotoUrl) {
                <img [src]="p.fotoUrl" alt="" class="mini" />
              }
              <div>
                <strong>{{ p.nombre }}</strong> — {{ p.precio | cop }}
                <div class="sub">{{ p.descripcion }}</div>
              </div>
              <span class="spacer"></span>
              <mat-slide-toggle
                [checked]="p.disponible"
                (change)="cambiarDisponible(p, $event.checked)"
                aria-label="Disponible"
              />
              <button mat-icon-button (click)="editar(p)" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button (click)="eliminar(p)" aria-label="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no hay productos.</p>
        }
      </div>
    </div>
  `,
})
export class ProductosEditor {
  private srv = inject(NegociosService);
  private snack = inject(MatSnackBar);

  negocioId = input.required<string>();
  productos = toSignal(
    toObservable(this.negocioId).pipe(switchMap((id) => this.srv.productos$(id))),
    { initialValue: [] as Producto[] },
  );

  editandoId = signal('');
  fotoUrl = signal('');
  guardando = signal(false);
  private fotoArchivo: File | null = null;

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    disponible: [true],
  });

  editar(p: Producto) {
    this.editandoId.set(p.id);
    this.fotoUrl.set(p.fotoUrl ?? '');
    this.fotoArchivo = null;
    this.form.setValue({
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      disponible: p.disponible,
    });
  }

  nuevo() {
    this.editandoId.set('');
    this.fotoUrl.set('');
    this.fotoArchivo = null;
    this.form.reset();
  }

  elegirFoto(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.fotoArchivo = f;
    this.fotoUrl.set(URL.createObjectURL(f));
  }

  async guardar() {
    this.guardando.set(true);
    try {
      const actual = this.productos().find((p) => p.id === this.editandoId());
      let fotoUrl = actual?.fotoUrl ?? '';
      if (this.fotoArchivo) {
        fotoUrl = await subirImagen(`productos/${this.negocioId()}`, this.fotoArchivo);
      }
      await this.srv.guardarProducto(this.negocioId(), {
        id: this.editandoId(),
        ...this.form.getRawValue(),
        fotoUrl,
      });
      this.snack.open('Producto guardado', 'OK', { duration: 2000 });
      this.nuevo();
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }

  async cambiarDisponible(p: Producto, disponible: boolean) {
    await this.srv.guardarProducto(this.negocioId(), { ...p, disponible });
  }

  async eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    await this.srv.eliminarProducto(this.negocioId(), p.id);
  }
}
