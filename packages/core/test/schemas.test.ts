// Prueba directa del esquema de precio, que es donde se cuela la basura que
// escribe una persona real: simbolos, comas, texto, campos vacios.
import { productSchema } from '../src/schemas';

const base = {
  name: 'Producto de prueba',
  shortDescription: '',
  description: '',
  status: 'DRAFT' as const,
  compareAtPrice: '',
  productTypeId: '',
  fuelTypeId: '',
  seriesId: '',
  formatId: '',
  colorId: '',
  sizeId: '',
  categoryIds: [],
  compatibleSeriesIds: [],
  needsReview: false,
};

const casos: [string, string | null | 'ERROR'][] = [
  ['', null],
  ['12499', '12499'],
  ['12499.00', '12499.00'],
  ['$ 12,499.00', '12499.00'],
  ['12,499', '12499'],
  ['abc', 'ERROR'],
  ['12.999.00', 'ERROR'],
  ['-500', 'ERROR'],
  ['12499.999', 'ERROR'],
];

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${nombre}`);
}

for (const [entrada, esperado] of casos) {
  const r = productSchema.safeParse({ ...base, price: entrada });
  const real = r.success ? r.data.price : 'ERROR';
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALLA'} precio ${JSON.stringify(entrada).padEnd(14)} -> ${JSON.stringify(real).padEnd(12)} (esperado ${JSON.stringify(esperado)})`,
  );
}
// --- Precio de lista contra precio de venta -------------------------------
//
// El de lista es el que se pinta tachado. Si es menor, la tienda anuncia el
// descuento al reves y nadie lo nota hasta verlo publicado.
const pares: [string, string, boolean][] = [
  // venta, lista, se acepta
  ['1000', '1200', true],
  ['1000', '1000', false],
  ['1200', '900', false],
  ['1000', '', true],
  ['', '1200', true],
  ['', '', true],
  ['$1,000.00', '$1,200.00', true],
  ['$1,200.00', '$900.00', false],
];

for (const [venta, lista, esperado] of pares) {
  const r = productSchema.safeParse({ ...base, price: venta, compareAtPrice: lista });
  const ok = r.success === esperado;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALLA'} venta ${JSON.stringify(venta).padEnd(12)} lista ${JSON.stringify(lista).padEnd(12)} -> ${r.success ? 'acepta' : 'rechaza'}`,
  );
}

// El error tiene que llegar pegado al campo que la persona debe corregir, no
// suelto al pie del formulario.
const invertido = productSchema.safeParse({ ...base, price: '1200', compareAtPrice: '900' });
check(
  'el error del precio de lista apunta a su campo',
  !invertido.success && invertido.error.flatten().fieldErrors.compareAtPrice !== undefined,
  true,
);

console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
