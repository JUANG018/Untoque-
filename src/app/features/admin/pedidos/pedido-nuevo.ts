import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { calcularDesglose } from '../../../core/desglose';
import { EstadoPedido, ItemPedido, Negocio, Producto, Zona } from '../../../core/models';
import { NegociosService } from '../../../core/services/negocios.service';
import { PedidosService } from '../../../core/services/pedidos.service';
import { ZonasService } from '../../../core/services/zonas.service';
import { CopPipe } from '../../../shared/pipes';

@Component({
  selector: 'app-pedido-nuevo',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    CopPipe,
  ],
  template: `
    <h1>Nuevo pedido</h1>
    <div class="dos-columnas ancho">
      <div class="col">
        <mat-card>
          <mat-card-header><mat-card-title>1. Emprendimiento y productos</mat-card-title></mat-card-header>
          <mat-card-content class="col">
            <mat-form-field>
              <mat-label>Emprendimiento</mat-label>
              <mat-select [value]="negocioId()" (selectionChange)="cambiarNegocio($event.value)">
                @for (n of negociosActivos(); track n.id) {
                  <mat-option [value]="n.id">{{ n.nombre }}{{ n.abierto ? '' : ' (cerrado)' }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @for (p of productosDisponibles(); track p.id) {
              <div class="producto-fila">
                <div>
                  <strong>{{ p.nombre }}</strong>
                  <div class="sub">{{ p.precio | cop }}</div>
                </div>
                <span class="spacer"></span>
                <button mat-icon-button (click)="sumar(p, -1)" [disabled]="!cantidad(p.id)" aria-label="Quitar">
                  <mat-icon>remove</mat-icon>
                </button>
                <span class="cantidad">{{ cantidad(p.id) }}</span>
                <button mat-icon-button (click)="sumar(p, 1)" aria-label="Agregar">
                  <mat-icon>add</mat-icon>
                </button>
              </div>
            } @empty {
              @if (negocioId()) {
                <p class="vacio">Este emprendimiento no tiene productos disponibles.</p>
              }
            }
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>2. Cliente y entrega</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" class="col">
              <div class="fila">
                <mat-form-field>
                  <mat-label>Nombre del cliente</mat-label>
                  <input matInput formControlName="nombre" />
                </mat-form-field>
                <mat-form-field>
                  <mat-label>Teléfono</mat-label>
                  <input matInput type="tel" formControlName="telefono" />
                </mat-form-field>
              </div>
              <mat-form-field>
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="direccion" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Referencia (barrio, casa, color…)</mat-label>
                <input matInput formControlName="referencia" />
              </mat-form-field>
              <mat-form-field>
                <mat-label>Ubicación (link de Google Maps o "lat,lng")</mat-label>
                <input matInput formControlName="ubicacion" />
                <mat-hint>Opcional: el cliente te la puede enviar por WhatsApp</mat-hint>
              </mat-form-field>
              <mat-form-field>
                <mat-label>Zona</mat-label>
                <mat-select [value]="zonaId()" (selectionChange)="zonaId.set($event.value)">
                  @for (z of zonasActivas(); track z.id) {
                    <mat-option [value]="z.id">
                      {{ z.nombre }} — {{ z.tarifaCliente ? (z.tarifaCliente | cop) : 'Gratis' }}
                    </mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-button-toggle-group formControlName="metodoPago">
                <mat-button-toggle value="efectivo">Efectivo</mat-button-toggle>
                <mat-button-toggle value="transferencia">Transferencia</mat-button-toggle>
              </mat-button-toggle-group>
              <mat-form-field>
                <mat-label>Notas del pedido</mat-label>
                <textarea matInput formControlName="notas" rows="2"></textarea>
              </mat-form-field>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="resumen">
        <mat-card-header><mat-card-title>3. Resumen y cuentas</mat-card-title></mat-card-header>
        <mat-card-content>
          @for (i of items(); track i.productoId) {
            <div class="linea">
              <span>{{ i.cantidad }} × {{ i.nombre }}</span>
              <span>{{ i.precio * i.cantidad | cop }}</span>
            </div>
          } @empty {
            <p class="vacio">Agrega productos.</p>
          }
          @if (desglose(); as d) {
            <hr />
            <div class="linea"><span>Subtotal</span><span>{{ d.subtotal | cop }}</span></div>
            <div class="linea"><span>Domicilio</span><span>{{ d.tarifaDomicilio | cop }}</span></div>
            <div class="linea total"><span>Cobrar al cliente</span><span>{{ d.totalCliente | cop }}</span></div>
            <hr />
            <div class="linea"><span>Para el emprendimiento</span><span>{{ d.totalNegocio | cop }}</span></div>
            <div class="linea"><span>Para el domiciliario</span><span>{{ d.pagoDomiciliario | cop }}</span></div>
            <div class="linea"><span>Tu comisión</span><span>{{ d.comisionPlataforma | cop }}</span></div>
            <div class="linea" [class.negativo]="d.gananciaDomicilioPlataforma < 0">
              <span>Tu parte del domicilio</span><span>{{ d.gananciaDomicilioPlataforma | cop }}</span>
            </div>
            <div class="linea total ganancia"><span>Tu ganancia</span><span>{{ d.gananciaPlataforma | cop }}</span></div>
          }
        </mat-card-content>
        <mat-card-actions class="acciones">
          <button mat-stroked-button (click)="guardar('creado')" [disabled]="!valido() || guardando()">
            Guardar
          </button>
          <button mat-flat-button (click)="guardar('enviado_negocio')" [disabled]="!valido() || guardando()">
            <mat-icon>send</mat-icon> Enviar al emprendimiento
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
})
export class PedidoNuevo {
  private negociosSrv = inject(NegociosService);
  private pedidosSrv = inject(PedidosService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  private negocios = toSignal(this.negociosSrv.todos$, { initialValue: [] as Negocio[] });
  private zonas = toSignal(inject(ZonasService).todas$, { initialValue: [] as Zona[] });
  negociosActivos = computed(() => this.negocios().filter((n) => n.activo));
  zonasActivas = computed(() => this.zonas().filter((z) => z.activa));

  negocioId = signal('');
  zonaId = signal('');
  private carrito = signal<Record<string, ItemPedido>>({});
  guardando = signal(false);

  private productos = toSignal(
    toObservable(this.negocioId).pipe(
      switchMap((id) => (id ? this.negociosSrv.productos$(id) : of([] as Producto[]))),
    ),
    { initialValue: [] as Producto[] },
  );
  productosDisponibles = computed(() => this.productos().filter((p) => p.disponible));
  items = computed(() => Object.values(this.carrito()).filter((i) => i.cantidad > 0));

  private negocio = computed(() => this.negocios().find((n) => n.id === this.negocioId()));
  private zona = computed(() => this.zonas().find((z) => z.id === this.zonaId()));
  desglose = computed(() => {
    const n = this.negocio();
    const z = this.zona();
    return n && z && this.items().length ? calcularDesglose(this.items(), n, z) : null;
  });

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', Validators.required],
    telefono: ['', Validators.required],
    direccion: ['', Validators.required],
    referencia: [''],
    ubicacion: [''],
    metodoPago: ['efectivo' as 'efectivo' | 'transferencia'],
    notas: [''],
  });
  private formValido = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  valido = computed(() => this.formValido() === 'VALID' && !!this.desglose());

  cantidad(productoId: string): number {
    return this.carrito()[productoId]?.cantidad ?? 0;
  }

  sumar(p: Producto, delta: number) {
    this.carrito.update((c) => {
      const cantidad = Math.max(0, (c[p.id]?.cantidad ?? 0) + delta);
      return { ...c, [p.id]: { productoId: p.id, nombre: p.nombre, precio: p.precio, cantidad } };
    });
  }

  cambiarNegocio(id: string) {
    this.negocioId.set(id);
    this.carrito.set({});
  }

  async guardar(estado: EstadoPedido) {
    const n = this.negocio();
    const z = this.zona();
    const d = this.desglose();
    if (!n || !z || !d) return;
    this.guardando.set(true);
    try {
      const v = this.form.getRawValue();
      const { numero } = await this.pedidosSrv.crear(
        {
          cliente: {
            nombre: v.nombre,
            telefono: v.telefono,
            direccion: v.direccion,
            referencia: v.referencia,
            ubicacion: leerUbicacion(v.ubicacion),
          },
          zonaId: z.id,
          zonaNombre: z.nombre,
          negocioId: n.id,
          negocioNombre: n.nombre,
          domiciliarioId: null,
          domiciliarioNombre: null,
          items: this.items(),
          desglose: d,
          metodoPago: v.metodoPago,
          notas: v.notas,
          origen: 'admin',
          liquidacionNegocioId: null,
          liquidacionDomiciliarioId: null,
        },
        estado,
      );
      this.snack.open(`Pedido #${numero} creado`, 'OK', { duration: 3000 });
      await this.router.navigateByUrl('/admin/pedidos');
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    } finally {
      this.guardando.set(false);
    }
  }
}

/** Acepta "4.123,-74.456" o un link de Google Maps con coordenadas. */
export function leerUbicacion(texto: string): { lat: number; lng: number } | null {
  const m = texto.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}
