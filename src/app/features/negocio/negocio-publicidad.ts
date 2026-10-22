import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, switchMap } from 'rxjs';
import { fechaISO, subirImagen } from '../../core/firestore-utils';
import { Publicidad } from '../../core/models';
import { PublicidadService } from '../../core/services/publicidad.service';
import { NegocioActual } from './negocio-actual';

@Component({
  selector: 'app-negocio-publicidad',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  template: `
    <h1>Mi publicidad</h1>
    <p class="ayuda">
      Sube un banner de tus promociones. Lo revisa el administrador de Untoque y, cuando lo apruebe,
      aparecerá en la página principal durante las fechas que elijas. Tamaño recomendado: 1200 × 400.
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
              <mat-label>Título / promoción</mat-label>
              <input matInput formControlName="titulo" placeholder="2x1 los martes" />
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
                Enviar para aprobación
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="lista">
        @for (p of anuncios(); track p.id) {
          <mat-card class="item">
            <img [src]="p.imagenUrl" alt="" class="banner" />
            <div class="item-fila">
              <div>
                <strong>{{ p.titulo }}</strong>
                <span class="chip" [class.chip-ok]="p.aprobada">
                  {{ p.aprobada ? 'Publicado' : 'En revisión' }}
                </span>
                <div class="sub">{{ p.fechaInicio }} a {{ p.fechaFin }}</div>
              </div>
              <span class="spacer"></span>
              <button mat-icon-button (click)="eliminar(p)" aria-label="Eliminar">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no has subido publicidad.</p>
        }
      </div>
    </div>
  `,
})
export class NegocioPublicidad {
  private actual = inject(NegocioActual);
  private srv = inject(PublicidadService);
  private snack = inject(MatSnackBar);

  private lista = toSignal(
    toObservable(this.actual.id).pipe(switchMap((id) => (id ? this.srv.delNegocio$(id) : of([])))),
    { initialValue: [] as Publicidad[] },
  );
  anuncios = computed(() => [...this.lista()].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)));
  preview = signal('');
  guardando = signal(false);
  private archivo: File | null = null;
  private hoy = fechaISO(new Date());

  form = inject(FormBuilder).nonNullable.group({
    titulo: ['', Validators.required],
    fechaInicio: [this.hoy, Validators.required],
    fechaFin: [this.hoy, Validators.required],
  });

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
      // El orden final lo decide el administrador al aprobar.
      await this.srv.crear({
        ...this.form.getRawValue(),
        negocioId: this.actual.id(),
        imagenUrl,
        aprobada: false,
        orden: Date.now(),
      });
      this.form.reset();
      this.preview.set('');
      this.archivo = null;
      this.snack.open('Banner enviado. Te avisaremos cuando sea aprobado.', 'OK', { duration: 3500 });
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminar(p: Publicidad) {
    if (confirm(`¿Eliminar el banner "${p.titulo}"?`)) await this.srv.eliminar(p.id);
  }
}
