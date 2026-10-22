import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { calcularDesglose } from '../../core/desglose';
import { Ubicacion, Zona } from '../../core/models';
import { NegociosService } from '../../core/services/negocios.service';
import { PedidosService } from '../../core/services/pedidos.service';
import { ZonasService } from '../../core/services/zonas.service';
import { CopPipe } from '../../shared/pipes';
import { CarritoService } from './carrito.service';

@Component({
  selector: 'app-carrito',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    CopPipe,
  ],
  template: `
    <h1>Tu pedido</h1>
    @if (!carrito.items().length) {
      <p class="vacio">Tu carrito está vacío.</p>
      <div class="acciones centrado-h"><a mat-flat-button routerLink="/">Ver emprendimientos</a></div>
    } @else {
      <div class="dos-columnas ancho">
        <div class="col">
          <mat-card>
            <mat-card-header>
              <mat-card-title>{{ carrito.negocioNombre() }}</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @for (i of carrito.items(); track i.productoId) {
                <div class="producto-fila">
                  <div>
                    <strong>{{ i.nombre }}</strong>
                    <div class="sub">{{ i.precio | cop }}</div>
                  </div>
                  <span class="spacer"></span>
                  <button mat-icon-button (click)="carrito.cambiar(i.productoId, -1)" aria-label="Quitar">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span class="cantidad">{{ i.cantidad }}</span>
                  <button mat-icon-button (click)="carrito.cambiar(i.productoId, 1)" aria-label="Agregar">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
              }
              <div class="acciones">
                <a mat-button [routerLink]="['/tienda', carrito.negocioId()]">Agregar más productos</a>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>¿A dónde lo llevamos?</mat-card-title></mat-card-header>
            <mat-card-content>
              <form [formGroup]="form" class="col">
                <div class="fila">
                  <mat-form-field>
                    <mat-label>Tu nombre</mat-label>
                    <input matInput formControlName="nombre" autocomplete="name" />
                  </mat-form-field>
                  <mat-form-field>
                    <mat-label>Celular / WhatsApp</mat-label>
                    <input matInput type="tel" formControlName="telefono" autocomplete="tel" />
                  </mat-form-field>
                </div>
                <mat-form-field>
                  <mat-label>Barrio / zona</mat-label>
                  <mat-select [value]="zonaId()" (selectionChange)="zonaId.set($event.value)">
                    @for (z of zonas(); track z.id) {
                      <mat-option [value]="z.id">
                        {{ z.nombre }} — {{ z.tarifaCliente ? (z.tarifaCliente | cop) : 'Domicilio gratis' }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Dirección</mat-label>
                  <input matInput formControlName="direccion" autocomplete="street-address" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Referencia (casa, color, punto conocido)</mat-label>
                  <input matInput formControlName="referencia" />
                </mat-form-field>
                <div class="fila centrado">
                  <button mat-stroked-button type="button" (click)="usarUbicacion()" [disabled]="ubicando()">
                    <mat-icon>my_location</mat-icon>
                    {{ ubicacion() ? 'Ubicación guardada ✓' : 'Compartir mi ubicación' }}
                  </button>
                  <span class="sub">Opcional: ayuda al domiciliario a llegar.</span>
                </div>
                <label class="etiqueta">¿Cómo pagas?</label>
                <mat-button-toggle-group formControlName="metodoPago">
                  <mat-button-toggle value="efectivo">Efectivo</mat-button-toggle>
                  <mat-button-toggle value="transferencia">Transferencia</mat-button-toggle>
                </mat-button-toggle-group>
                <mat-form-field>
                  <mat-label>Notas (sin cebolla, cambio de $50.000…)</mat-label>
                  <textarea matInput formControlName="notas" rows="2"></textarea>
                </mat-form-field>
              </form>
            </mat-card-content>
          </mat-card>
        </div>

        <mat-card class="resumen">
          @if (enviando()) {
            <mat-progress-bar mode="indeterminate" />
          }
          <mat-card-header><mat-card-title>Resumen</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="linea"><span>Productos</span><span>{{ carrito.subtotal() | cop }}</span></div>
            <div class="linea">
              <span>Domicilio</span>
              <span>{{ zona() ? (zona()!.tarifaCliente ? (zona()!.tarifaCliente | cop) : 'Gratis') : 'Elige tu zona' }}</span>
            </div>
            <hr />
            <div class="linea total"><span>Total</span><span>{{ total() | cop }}</span></div>
            @if (negocio()?.abierto === false) {
              <p class="error">{{ negocio()?.nombre }} está cerrado en este momento.</p>
            }
          </mat-card-content>
          <mat-card-actions>
            <button mat-flat-button class="grande" (click)="pedir()" [disabled]="!puedePedir()">
              Hacer pedido
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
})
export class Carrito {
  carrito = inject(CarritoService);
  private auth = inject(AuthService);
  private pedidosSrv = inject(PedidosService);
  private negociosSrv = inject(NegociosService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  private todasZonas = toSignal(inject(ZonasService).todas$, { initialValue: [] as Zona[] });
  zonas = computed(() => this.todasZonas().filter((z) => z.activa));
  negocio = toSignal(
    toObservable(this.carrito.negocioId).pipe(
      switchMap((id) => (id ? this.negociosSrv.uno$(id) : of(null))),
    ),
  );

  private guardados = this.carrito.datosCliente();
  zonaId = signal(this.guardados?.zonaId ?? '');
  zona = computed(() => this.zonas().find((z) => z.id === this.zonaId()));
  ubicacion = signal<Ubicacion | null>(this.guardados?.ubicacion ?? null);
  ubicando = signal(false);
  enviando = signal(false);

  total = computed(() => this.carrito.subtotal() + (this.zona()?.tarifaCliente ?? 0));

  form = inject(FormBuilder).nonNullable.group({
    nombre: [this.guardados?.nombre ?? '', Validators.required],
    telefono: [this.guardados?.telefono ?? '', [Validators.required, Validators.pattern(/^[\d\s+]{7,15}$/)]],
    direccion: [this.guardados?.direccion ?? '', Validators.required],
    referencia: [this.guardados?.referencia ?? ''],
    metodoPago: ['efectivo' as 'efectivo' | 'transferencia'],
    notas: [''],
  });
  private estadoForm = toSignal(this.form.statusChanges, { initialValue: this.form.status });

  puedePedir = computed(
    () =>
      this.estadoForm() === 'VALID' &&
      !!this.zona() &&
      !!this.carrito.items().length &&
      this.negocio()?.abierto === true &&
      !this.enviando(),
  );

  usarUbicacion() {
    if (!('geolocation' in navigator)) {
      this.snack.open('Tu navegador no permite compartir la ubicación', 'OK');
      return;
    }
    this.ubicando.set(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.ubicacion.set({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        this.ubicando.set(false);
      },
      () => {
        this.snack.open('No pudimos obtener tu ubicación. Revisa el permiso del navegador.', 'OK');
        this.ubicando.set(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async pedir() {
    const n = this.negocio();
    const z = this.zona();
    if (!n || !z) return;
    this.enviando.set(true);
    try {
      const uid = await this.auth.sesionCliente();
      const v = this.form.getRawValue();
      const cliente = {
        nombre: v.nombre.trim(),
        telefono: v.telefono.trim(),
        direccion: v.direccion.trim(),
        referencia: v.referencia.trim(),
        ubicacion: this.ubicacion(),
      };
      // Precios y cuentas se vuelven a calcular en el panel del admin al confirmar el pedido.
      const { id } = await this.pedidosSrv.crear({
        cliente,
        zonaId: z.id,
        zonaNombre: z.nombre,
        negocioId: n.id,
        negocioNombre: n.nombre,
        domiciliarioId: null,
        domiciliarioNombre: null,
        items: this.carrito.items(),
        desglose: calcularDesglose(this.carrito.items(), n, z),
        metodoPago: v.metodoPago,
        notas: v.notas.trim(),
        origen: 'web',
        clienteUid: uid,
        liquidacionNegocioId: null,
        liquidacionDomiciliarioId: null,
      });
      this.carrito.guardarDatosCliente({ ...cliente, zonaId: z.id });
      this.carrito.vaciar();
      await this.router.navigate(['/pedido', id]);
    } catch (e) {
      this.snack.open('No pudimos enviar tu pedido: ' + (e as Error).message, 'OK');
    } finally {
      this.enviando.set(false);
    }
  }
}
