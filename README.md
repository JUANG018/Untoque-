# Untoque — domicilios locales

Plataforma de domicilios para el municipio: el administrador recibe los pedidos, los envía a cada
emprendimiento y asigna domiciliarios, llevando las cuentas de comisiones y pagos.

Hecho con **Angular 21** + **Angular Material** + **Firebase** (Auth, Firestore, Storage, Hosting).

## Paneles

| Ruta        | Quién           | Estado                    |
| ----------- | --------------- | ------------------------- |
| `/admin`    | Administrador   | ✅ Fase 1                  |
| `/negocio`  | Emprendimiento  | ✅ Fase 2                  |
| `/domi`     | Domiciliario    | ✅ Fase 3                  |
| `/`         | Cliente (web)   | ✅ Fase 4                  |

## Cómo se calculan las cuentas

Por cada pedido (ver `src/app/core/desglose.ts`):

- **Comisión** = % del subtotal, o valor fijo por pedido (se configura por emprendimiento).
- **Pago al domiciliario** = % de la tarifa de la zona. En la zona gratis (tarifa 0) se le paga el
  "pago mínimo" de la zona, que asume la plataforma.
- **Tu ganancia** = comisión + (tarifa domicilio − pago al domiciliario).
- **Al emprendimiento** = subtotal − comisión.

El desglose se guarda dentro de cada pedido, así que si cambias tarifas o comisiones los pedidos
viejos no cambian. Solo los pedidos **entregados** suman en Cuentas. Las **liquidaciones** agrupan
pedidos ya pagados para no pagarlos dos veces.

## Arrancar en desarrollo

### Opción A: tu proyecto real de Firebase (recomendado)

1. En https://console.firebase.google.com crea un proyecto.
2. Activa **Authentication → Correo/contraseña**, **Firestore** y **Storage**.
3. En *Configuración del proyecto → Tus apps → Web* copia el `firebaseConfig` y pégalo en
   `src/environments/environment.ts` y `environment.prod.ts`; en `environment.ts` pon
   `useEmulators: false`.
4. Cambia `demo-untoque` por el id de tu proyecto en `.firebaserc`.
5. Crea tu usuario admin: en *Authentication* agrega un usuario y copia su **UID**. En *Firestore*
   crea la colección `usuarios`, documento con id = ese UID y campos:
   `nombre` (string), `email` (string), `telefono` (string), `rol` = `admin`, `activo` = `true`.
6. Publica las reglas: `firebase deploy --only firestore:rules,storage`.
7. `npm start` y entra a http://localhost:4200.

### Opción B: emuladores locales (requiere Java 21+)

```bash
npm run emuladores                 # terminal 1
npm run crear-admin -- tu@correo.com tuClave "Tu nombre"   # terminal 2 (una vez)
npm start                          # terminal 3
```

Por defecto el admin es `admin@untoque.co` / `admin123`. Los datos del emulador se borran al
cerrarlo.

## Comandos

```bash
npm start        # servidor de desarrollo
npm test         # pruebas (Vitest)
npm run deploy   # compila y publica en Firebase Hosting
```

## Estructura

```
src/app/
  core/           firebase, modelos, cálculo de cuentas, auth, servicios de datos
  shared/         pipes (pesos, estado, fecha) y componentes comunes
  features/
    auth/         login
    admin/        pedidos, nuevo pedido, cuentas, emprendimientos, domiciliarios, zonas, publicidad
    negocio/      panel del emprendimiento (fase 2)
    domiciliario/ panel del domiciliario (fase 3)
firestore.rules   permisos por rol
storage.rules     permisos de imágenes
```
