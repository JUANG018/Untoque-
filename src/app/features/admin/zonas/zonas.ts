import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Zona } from '../../../core/models';
import { ZonasService } from '../../../core/services/zonas.service';
import { CopPipe } from '../../../shared/pipes';

@Component({
  selector: 'app-zonas',
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
    <h1>Zonas de domicilio</h1>
    <p class="ayuda">
      Cada zona tiene la tarifa que paga el cliente y el % que se lleva el domiciliario. Para la
      zona sin cobro de domicilio pon tarifa 0 y define cuánto le pagas tú al domiciliario.
    </p>
    <div class="dos-columnas">
      <mat-card>
        <mat-card-header>
          <mat-card-title>{{ editandoId() ? 'Editar zona' : 'Nueva zona' }}</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="guardar()" class="col">
            <mat-form-field>
              <mat-label>Nombre</mat-label>
              <input matInput formControlName="nombre" placeholder="Ej: Centro" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Tarifa al cliente</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="tarifaCliente" min="0" />
              <mat-hint>0 = zona gratis</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>% para el domiciliario</mat-label>
              <input matInput type="number" formControlName="porcentajeDomiciliario" min="0" max="100" />
              <span matTextSuffix>%</span>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Pago al domiciliario si la tarifa es 0</mat-label>
              <span matTextPrefix>$&nbsp;</span>
              <input matInput type="number" formControlName="pagoMinimoDomiciliario" min="0" />
              <mat-hint>Lo asumes tú en la zona gratis</mat-hint>
            </mat-form-field>
            <mat-slide-toggle formControlName="activa">Activa</mat-slide-toggle>
            <div class="acciones">
              @if (editandoId()) {
                <button mat-button type="button" (click)="nueva()">Cancelar</button>
              }
              <button mat-flat-button type="submit" [disabled]="form.invalid">Guardar</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="lista">
        @for (z of zonas(); track z.id) {
          <mat-card class="item" [class.inactivo]="!z.activa">
            <div class="item-fila">
              <div>
                <strong>{{ z.nombre }}</strong>
                @if (z.tarifaCliente === 0) {
                  <span class="chip chip-ok">Gratis</span>
                }
                <div class="sub">
                  Cliente paga {{ z.tarifaCliente | cop }} · Domiciliario recibe
                  @if (z.tarifaCliente > 0) {
                    {{ z.porcentajeDomiciliario }}% ({{
                      (z.tarifaCliente * z.porcentajeDomiciliario) / 100 | cop
                    }})
                  } @else {
                    {{ z.pagoMinimoDomiciliario | cop }}
                  }
                </div>
              </div>
              <span class="spacer"></span>
              <button mat-icon-button (click)="editar(z)" aria-label="Editar">
                <mat-icon>edit</mat-icon>
              </button>
            </div>
          </mat-card>
        } @empty {
          <p class="vacio">Aún no hay zonas. Crea la primera.</p>
        }
      </div>
    </div>
  `,
})
export class Zonas {
  private srv = inject(ZonasService);
  private snack = inject(MatSnackBar);
  zonas = toSignal(this.srv.todas$, { initialValue: [] as Zona[] });
  editandoId = signal('');

  form = inject(FormBuilder).nonNullable.group({
    nombre: ['', Validators.required],
    tarifaCliente: [0, [Validators.required, Validators.min(0)]],
    porcentajeDomiciliario: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
    pagoMinimoDomiciliario: [0, [Validators.required, Validators.min(0)]],
    activa: [true],
  });

  editar(z: Zona) {
    this.editandoId.set(z.id);
    this.form.setValue({
      nombre: z.nombre,
      tarifaCliente: z.tarifaCliente,
      porcentajeDomiciliario: z.porcentajeDomiciliario,
      pagoMinimoDomiciliario: z.pagoMinimoDomiciliario,
      activa: z.activa,
    });
  }

  nueva() {
    this.editandoId.set('');
    this.form.reset();
  }

  async guardar() {
    try {
      await this.srv.guardar({ id: this.editandoId(), ...this.form.getRawValue() });
      this.snack.open('Zona guardada', 'OK', { duration: 2500 });
      this.nueva();
    } catch (e) {
      this.snack.open('Error: ' + (e as Error).message, 'OK');
    }
  }
}
