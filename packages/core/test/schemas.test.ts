// Prueba directa del esquema de precio, que es donde se cuela la basura que
// escribe una persona real: simbolos, comas, texto, campos vacios.
import { productSchema } from '../src/schemas';

const base = {
  name: 'Producto de prueba',
  slug: 'producto-de-prueba',
  shortDescription: '',
  description: '',
  status: 'DRAFT' as const,
  compareAtPrice: '',
  stock: '0',
  brandId: '', productTypeId: '', fuelTypeId: '', seriesId: '',
  formatId: '', colorId: '', sizeId: '',
  categoryIds: [], compatibleSeriesIds: [],
  metaTitle: '', metaDescription: '', needsReview: false,
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
for (const [entrada, esperado] of casos) {
  const r = productSchema.safeParse({ ...base, price: entrada });
  const real = r.success ? r.data.price : 'ERROR';
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} precio ${JSON.stringify(entrada).padEnd(14)} -> ${JSON.stringify(real).padEnd(12)} (esperado ${JSON.stringify(esperado)})`);
}
console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
