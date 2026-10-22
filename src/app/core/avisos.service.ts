import { Injectable, signal } from '@angular/core';

/**
 * Avisos mientras el panel está abierto: sonido + notificación del navegador.
 * (Las notificaciones push con la app cerrada llegarán con FCM en la fase de app.)
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  readonly permiso = signal<NotificationPermission | 'no-soportado'>(
    typeof Notification === 'undefined' ? 'no-soportado' : Notification.permission,
  );
  readonly sonidoActivo = signal(false);
  private audio: AudioContext | null = null;

  /** Debe llamarse desde un clic: el navegador exige un gesto del usuario para sonido y permisos. */
  async activar(): Promise<void> {
    this.audio ??= new AudioContext();
    await this.audio.resume();
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      this.permiso.set(await Notification.requestPermission());
    }
    this.sonidoActivo.set(this.audio.state === 'running');
    this.sonar();
  }

  /** Tres pitidos cortos. */
  sonar(): void {
    const ctx = this.audio;
    if (!ctx || ctx.state !== 'running') return;
    [0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator();
      const gan = ctx.createGain();
      osc.frequency.value = 880;
      gan.gain.setValueAtTime(0.25, ctx.currentTime + t);
      gan.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.connect(gan).connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  }

  avisar(titulo: string, cuerpo: string): void {
    this.sonar();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo, icon: '/favicon.ico', tag: titulo });
    }
    if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
  }
}
