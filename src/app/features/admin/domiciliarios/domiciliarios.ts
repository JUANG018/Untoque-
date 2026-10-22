import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Usuario } from '../../../core/models';
import { UsuariosService } from '../../../core/services/usuarios.service';

@Component({
  selector: 'app-domiciliarios',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
  ],
  template: `
    <h1>Domiciliarios</h1>
    <div class="dos-columnas">
      <mat-card>
        @if (guardando()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-card-header>
          <mat-card-title>{{ editando() ? 'Editar domiciliario' : 'Nuevo domiciliario' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="col">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="nombre" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Teléfono / WhatsApp</mat-label>
              <input matInput type="tel" formControlName="telefono" />
            </mat-form-field>
            @if (!editando()) {
              <mat-form-field>
                <mat-label>Correo (para ingresar)</mat-label>
                <input matInput type="email" formControlName="email" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Contraseña (mín. 6)</mat-label>
                <input matInput formControlName="password" />
              </mat-form-field>
            }
            <mat-slide-toggle formControlName="activo">Activo</mat-slide-toggle>
            <div class="acciones">
              @if (editando()) {
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
        @for (d of domis(); track d.id) {
          <mat-card class="item" [class.inactivo]="!d.activo">
            <div class="item-fila">
              <mat-icon class="mini-icono">two_wheeler</mat-icon>
              <div>
                <strong>{{ d.nombre }}</strong>
                <span class="chip" [class.chip-ok]="d.disponible">
                  {{ d.disponible ? 'Disponible' : 'No disponible' }}
                </span>
                <div class="sub">{{ d.telefono }} · {{ d.email }}</div>
              </div>
              <span class="spacer"></span>
              <button mat-icon-button (click)="editar(d)" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no hay domiciliarios.</p>
        }
      </div>
    </div>
  `,
})
export class Domiciliarios {
  private srv = inject(UsuariosService);
  private snack = inject(MatSnackBar);

  domis = toSignal(this.srv.domiciliarios$, { initialValue: [] as Usuario[] });
  editando = signal<Usuario | null>(null);
  guardando = signal(false);

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', Validators.required],
    telefono: ['', Validators.required],
    email: ['', Validators.email],
    password: ['', Validators.minLength(6)],
    activo: [true],
  });

  editar(d: Usuario) {
    this.editando.set(d);
    this.form.reset({ nombre: d.nombre, telefono: d.telefono, activo: d.activo });
  }

  nuevo() {
    this.editando.set(null);
    this.form.reset();
  }

  async guardar() {
    const v = this.form.getRawValue();
    const actual = this.editando();
    if (!actual && !(v.email && v.password)) {
      this.snack.open('Correo y contraseña son obligatorios para un domiciliario nuevo', 'OK');
      return;
    }
    this.guardando.set(true);
    try {
      if (actual) {
        await this.srv.actualizar(actual.id, {
          nombre: v.nombre,
          telefono: v.telefono,
          activo: v.activo,
        });
      } else {
        await this.srv.crear(
          {
            nombre: v.nombre,
            telefono: v.telefono,
            email: v.email,
            rol: 'domiciliario',
            activo: v.activo,
            disponible: true,
          },
          v.password,
        );
      }
      this.snack.open('Domiciliario guardado', 'OK', { duration: 2500 });
      this.nuevo();
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }
}
