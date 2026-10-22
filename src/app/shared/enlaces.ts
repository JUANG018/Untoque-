import { Ubicacion } from '../core/models';

/** Enlace de WhatsApp; los números de 10 dígitos se asumen de Colombia (+57). */
export function whatsappUrl(tel: string, texto = ''): string {
  const num = tel.replace(/\D/g, '');
  const intl = num.length === 10 ? '57' + num : num;
  return `https://wa.me/${intl}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

/** Ruta en Google Maps hacia las coordenadas, o hacia la dirección si no hay coordenadas. */
export function mapsUrl(ubicacion: Ubicacion | null | undefined, direccion = ''): string {
  const destino = ubicacion ? `${ubicacion.lat},${ubicacion.lng}` : direccion;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
}

export function wazeUrl(ubicacion: Ubicacion | null | undefined, direccion = ''): string {
  return ubicacion
    ? `https://waze.com/ul?ll=${ubicacion.lat},${ubicacion.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(direccion)}&navigate=yes`;
}
