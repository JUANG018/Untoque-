// Crea el usuario administrador y datos de ejemplo en los EMULADORES de Firebase.
// Uso: con los emuladores corriendo (npm run emuladores), en otra terminal:
//   npm run crear-admin -- correo@ejemplo.com contraseña "Tu nombre"
const [email = 'admin@untoque.co', password = 'admin123', nombre = 'Administrador'] =
  process.argv.slice(2);

const PROYECTO = 'demo-untoque';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const FS = `http://127.0.0.1:8080/v1/projects/${PROYECTO}/databases/(default)/documents`;
// "Bearer owner" salta las reglas de seguridad (solo funciona en el emulador).
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };

function valor(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: v } : { doubleValue: v };
  if (v === null) return { nullValue: null };
  return { stringValue: String(v) };
}
const campos = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, valor(v)]));

async function guardar(ruta, datos) {
  const r = await fetch(`${FS}/${ruta}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields: campos(datos) }),
  });
  if (!r.ok) throw new Error(`${ruta}: ${await r.text()}`);
}

const r = await fetch(`${AUTH}/accounts:signUp?key=demo-key`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
const cuenta = await r.json();
if (!r.ok) {
  console.error('No se pudo crear la cuenta:', cuenta.error?.message ?? cuenta);
  process.exit(1);
}

await guardar(`usuarios/${cuenta.localId}`, {
  nombre,
  email,
  telefono: '',
  rol: 'admin',
  activo: true,
});

await guardar('zonas/centro', {
  nombre: 'Centro (gratis)',
  tarifaCliente: 0,
  porcentajeDomiciliario: 80,
  pagoMinimoDomiciliario: 2000,
  activa: true,
});
await guardar('zonas/barrios', {
  nombre: 'Barrios',
  tarifaCliente: 4000,
  porcentajeDomiciliario: 80,
  pagoMinimoDomiciliario: 0,
  activa: true,
});

console.log(`Admin creado: ${email} / ${password}`);
console.log('Zonas de ejemplo: "Centro (gratis)" y "Barrios".');
