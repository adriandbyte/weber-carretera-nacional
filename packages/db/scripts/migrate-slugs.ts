// ---------------------------------------------------------------------------
// Pone las URLs de los productos en la regla que usa el panel.
//
// El importador construia el slug pegandole el SKU a todo ("plancha-para-
// genesis-ii-7599") y cortando a 80 caracteres. El panel usa otra: sin SKU
// salvo choque, y hasta 120. Por eso guardar una ficha sin tocar el nombre le
// cambiaba la URL al producto.
//
// Las dos reglas ya estan alineadas en el codigo. Esto arregla lo que quedo
// escrito antes de alinearlas.
//
// Solo mueve productos que nunca se publicaron. Un slug publicado esta
// congelado a proposito: puede tener enlaces vivos y estar indexado, y esa es
// la regla que protege apps/admin/src/app/productos/[id]/actions.ts.
//
//   pnpm --filter @weber/db exec tsx scripts/migrate-slugs.ts          (simulacion)
//   pnpm --filter @weber/db exec tsx scripts/migrate-slugs.ts --aplicar
// ---------------------------------------------------------------------------

import { prisma } from '../src/index.js';
import { slugify } from './lib/normalize.js';

const aplicar = process.argv.includes('--aplicar');

async function main() {
  const productos = await prisma.product.findMany({
    orderBy: { sku: 'asc' },
    select: { id: true, sku: true, name: true, slug: true, publishedAt: true },
  });

  // Los publicados conservan su URL pase lo que pase, asi que sus slugs siguen
  // ocupados y hay que contarlos al repartir los demas.
  const tomados = new Set(productos.filter((p) => p.publishedAt !== null).map((p) => p.slug));
  const cambios: { id: string; sku: string; de: string; a: string }[] = [];
  const congelados = productos.filter((p) => p.publishedAt !== null).length;

  for (const producto of productos) {
    if (producto.publishedAt !== null) continue;

    const base = slugify(producto.name);
    // Un nombre sin letras ni numeros no da slug. Antes no pasaba porque el SKU
    // iba pegado siempre; ahora hay que caer en el SKU a proposito.
    const conSku = `${base}-${producto.sku.toLowerCase()}`;
    const destino = !base ? producto.sku.toLowerCase() : tomados.has(base) ? conSku : base;

    tomados.add(destino);
    if (destino !== producto.slug) {
      cambios.push({ id: producto.id, sku: producto.sku, de: producto.slug, a: destino });
    }
  }

  console.log(`productos:            ${productos.length}`);
  console.log(`publicados (intactos): ${congelados}`);
  console.log(`URLs a mover:          ${cambios.length}`);

  // `tomados` es el conjunto de URLs finales: empieza con las de los
  // publicados y va sumando un destino por cada producto. Si al final tiene
  // menos entradas que productos, es que dos cayeron en la misma.
  const repetidas = productos.length - tomados.size;
  if (repetidas > 0) {
    console.error(`\nABORTA: el reparto deja ${repetidas} URLs repetidas.`);
    process.exitCode = 1;
    return;
  }

  for (const cambio of cambios.slice(0, 10)) {
    console.log(`  ${cambio.sku.padEnd(10)} ${cambio.de}\n  ${' '.repeat(10)} -> ${cambio.a}`);
  }
  if (cambios.length > 10) console.log(`  ... y ${cambios.length - 10} mas`);

  if (!aplicar) {
    console.log('\nSimulacion. Repite con --aplicar para escribirlo.');
    return;
  }

  // En una transaccion: a medio camino quedarian unas URLs con la regla nueva y
  // otras con la vieja, que es peor que no haber empezado.
  await prisma.$transaction(
    cambios.map((cambio) =>
      prisma.product.update({ where: { id: cambio.id }, data: { slug: cambio.a } }),
    ),
  );

  const despues = await prisma.product.findMany({ select: { slug: true } });
  const unicos = new Set(despues.map((p) => p.slug)).size;
  console.log(`\nlisto: ${cambios.length} URLs movidas`);
  console.log(`URLs unicas: ${unicos} de ${despues.length}`);
  if (unicos !== despues.length) {
    console.error('ATENCION: quedaron URLs repetidas.');
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
