import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="login-wrap">
      <mat-card class="login-card">
        @if (cargando()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-card-header>
          <mat-card-title class="marca">Untoque</mat-card-title>
          <mat-card-subtitle>Ingresa a tu panel</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="entrar()" class="col">
            <mat-form-field>
              <mat-label>Correo</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
            </mat-form-field>
            <mat-form-field>
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="current-password"
              />
            </mat-form-field>
            @if (error()) {
              <p class="error">{{ error() }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="form.invalid || cargando()">
              Entrar
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class Login {
  private authSrv = inject(AuthService);
  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  cargando = signal(false);
  error = signal('');

  async entrar() {
    this.cargando.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.authSrv.login(email, password);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      this.error.set(
        code.startsWith('auth/')
          ? 'Correo o contraseña incorrectos.'
          : (e as Error).message || 'No se pudo iniciar sesión.',
      );
    } finally {
      this.cargando.set(false);
    }
  }
}
