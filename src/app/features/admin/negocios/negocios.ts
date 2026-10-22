import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { subirImagen } from '../../../core/firestore-utils';
import { Negocio, TipoComision } from '../../../core/models';
import { NegociosService } from '../../../core/services/negocios.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { CopPipe } from '../../../shared/pipes';

@Component({
  selector: 'app-negocios',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    CopPipe,
  ],
  template: `
    <h1>Emprendimientos</h1>
    <div class="dos-columnas">
      <mat-card>
        @if (guardando()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-card-header>
          <mat-card-title>{{ editando() ? 'Editar emprendimiento' : 'Nuevo emprendimiento' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="col">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="nombre" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Categoría</mat-label>
              <input matInput formControlName="categoria" placeholder="Comidas rápidas, panadería…" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Teléfono / WhatsApp</mat-label>
              <input matInput formControlName="telefono" type="tel" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Dirección</mat-label>
              <input matInput formControlName="direccion" />
            </mat-form-field>
            <div class="fila">
              <mat-form-field>
                <mat-label>Latitud</mat-label>
                <input matInput type="number" formControlName="lat" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Longitud</mat-label>
                <input matInput type="number" formControlName="lng" />
              </mat-form-field>
            </div>
            <p class="ayuda">
              Opcional: en Google Maps mantén presionado el local y copia las coordenadas. Sirven para
              que el domiciliario abra la ruta.
            </p>

            <label class="etiqueta">Tu comisión</label>
            <mat-button-toggle-group formControlName="tipoComision">
              <mat-button-toggle value="porcentaje">Porcentaje</mat-button-toggle>
              <mat-button-toggle value="fijo">Valor fijo por pedido</mat-button-toggle>
            </mat-button-toggle-group>
            <mat-form-field>
              <mat-label>{{ form.value.tipoComision === 'porcentaje' ? 'Porcentaje' : 'Valor por pedido' }}</mat-label>
              @if (form.value.tipoComision === 'fijo') {
                <span matTextPrefix>$&nbsp;</span>
              }
              <input matInput type="number" formControlName="valorComision" min="0" />
              @if (form.value.tipoComision === 'porcentaje') {
                <span matTextSuffix>%</span>
              }
            </mat-form-field>

            <div class="fila centrado">
              @if (logoUrl()) {
                <img [src]="logoUrl()" alt="logo" class="mini" />
              }
              <button mat-stroked-button type="button" (click)="archivo.click()">
                <mat-icon>image</mat-icon> Logo
              </button>
              <input #archivo type="file" accept="image/*" hidden (change)="elegirLogo($event)" />
            </div>

            <mat-slide-toggle formControlName="activo">Activo en la plataforma</mat-slide-toggle>

            @if (!editando()) {
              <label class="etiqueta">Cuenta de acceso del emprendimiento (opcional)</label>
              <mat-form-field>
                <mat-label>Correo</mat-label>
                <input matInput type="email" formControlName="email" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Contraseña (mín. 6)</mat-label>
                <input matInput formControlName="password" />
              </mat-form-field>
            }

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
        @for (n of negocios(); track n.id) {
          <mat-card class="item" [class.inactivo]="!n.activo">
            <div class="item-fila">
              @if (n.logoUrl) {
                <img [src]="n.logoUrl" alt="" class="mini" />
              } @else {
                <mat-icon class="mini-icono">storefront</mat-icon>
              }
              <div>
                <strong>{{ n.nombre }}</strong>
                <span class="chip" [class.chip-ok]="n.abierto">{{ n.abierto ? 'Abierto' : 'Cerrado' }}</span>
                <div class="sub">
                  {{ n.categoria }} · Comisión
                  {{ n.tipoComision === 'porcentaje' ? n.valorComision + '%' : (n.valorComision | cop) }}
                  @if (!n.usuarioId) {
                    · <em>sin cuenta de acceso</em>
                  }
                </div>
              </div>
              <span class="spacer"></span>
              <a mat-icon-button [routerLink]="['/admin/negocios', n.id]" aria-label="Productos">
                <mat-icon>restaurant_menu</mat-icon>
              </a>
              <button mat-icon-button (click)="editar(n)" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no hay emprendimientos.</p>
        }
      </div>
    </div>
  `,
})
export class Negocios {
  private srv = inject(NegociosService);
  private usuarios = inject(UsuariosService);
  private snack = inject(MatSnackBar);

  negocios = toSignal(this.srv.todos$, { initialValue: [] as Negocio[] });
  editando = signal<Negocio | null>(null);
  logoUrl = signal('');
  guardando = signal(false);
  private logoArchivo: File | null = null;

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', Validators.required],
    categoria: [''],
    telefono: [''],
    direccion: [''],
    lat: [null as number | null],
    lng: [null as number | null],
    tipoComision: ['porcentaje' as TipoComision],
    valorComision: [10, [Validators.required, Validators.min(0)]],
    activo: [true],
    email: ['', Validators.email],
    password: ['', Validators.minLength(6)],
  });

  editar(n: Negocio) {
    this.editando.set(n);
    this.logoUrl.set(n.logoUrl ?? '');
    this.logoArchivo = null;
    this.form.reset({
      nombre: n.nombre,
      categoria: n.categoria,
      telefono: n.telefono,
      direccion: n.direccion,
      lat: n.ubicacion?.lat ?? null,
      lng: n.ubicacion?.lng ?? null,
      tipoComision: n.tipoComision,
      valorComision: n.valorComision,
      activo: n.activo,
    });
  }

  nuevo() {
    this.editando.set(null);
    this.logoUrl.set('');
    this.logoArchivo = null;
    this.form.reset();
  }

  elegirLogo(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.logoArchivo = f;
    this.logoUrl.set(URL.createObjectURL(f));
  }

  async guardar() {
    const v = this.form.getRawValue();
    if (!this.editando() && (v.email || v.password) && !(v.email && v.password)) {
      this.snack.open('Para crear la cuenta llena correo y contraseña', 'OK');
      return;
    }
    this.guardando.set(true);
    try {
      const actual = this.editando();
      let logoUrl = actual?.logoUrl ?? '';
      if (this.logoArchivo) logoUrl = await subirImagen('negocios', this.logoArchivo);

      const negocio: Negocio = {
        id: actual?.id ?? '',
        nombre: v.nombre,
        categoria: v.categoria,
        telefono: v.telefono,
        direccion: v.direccion,
        ubicacion: v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null,
        logoUrl,
        tipoComision: v.tipoComision,
        valorComision: v.valorComision,
        activo: v.activo,
        abierto: actual?.abierto ?? true,
        usuarioId: actual?.usuarioId,
      };
      const id = await this.srv.guardar(negocio);

      if (!actual && v.email && v.password) {
        const uid = await this.usuarios.crear(
          {
            nombre: v.nombre,
            email: v.email,
            telefono: v.telefono,
            rol: 'negocio',
            negocioId: id,
            activo: true,
          },
          v.password,
        );
        await this.srv.actualizar(id, { usuarioId: uid });
      }
      this.snack.open('Emprendimiento guardado', 'OK', { duration: 2500 });
      this.nuevo();
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }
}
