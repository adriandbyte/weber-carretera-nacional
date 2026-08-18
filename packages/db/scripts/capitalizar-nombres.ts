// ---------------------------------------------------------------------------
// Reescribe los nombres que llegaron en MAYUSCULAS pero ya estaban en español.
//
//   pnpm db:capitalizar             muestra que cambiaria, sin tocar nada
//   pnpm db:capitalizar --aplicar   lo escribe
//
// Es la parte de la limpieza que no necesita ninguna decision del cliente: los
// nombres ya dicen lo que tienen que decir, solo estan gritados. Los que traen
// ingles o codigos de almacen quedan fuera y esperan al cuestionario.
//
// Sin --aplicar no escribe: estos nombres son la direccion publica de cada
// producto y conviene leer la tabla antes de moverlos.
// ---------------------------------------------------------------------------

import { prisma } from '../src/index.js';
import { slugify } from '../../core/src/schemas.js';
import { capitalizarNombre, quitarPuntoFinal, soloNecesitaCapitalizarse } from './lib/capitalizar.js';

const aplicar = process.argv.includes('--aplicar');

async function main() {
  const productos = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, slug: true, publishedAt: true },
    orderBy: { sku: 'asc' },
  });

  // Dos arreglos distintos, y el segundo alcanza a mas nombres que el primero:
  // el punto final sobra en cualquier idioma, asi que tambien se le quita a los
  // nombres que siguen esperando la respuesta del cliente para reescribirse.
  const candidatos = productos
    .map((p) => ({
      ...p,
      nombreNuevo: soloNecesitaCapitalizarse(p.name)
        ? capitalizarNombre(p.name)
        : quitarPuntoFinal(p.name),
    }))
    .filter((p) => p.nombreNuevo !== p.name);

  if (candidatos.length === 0) {
    console.log('No hay nombres que capitalizar.');
    return;
  }

  console.log(`\n${candidatos.length} nombres a reescribir:\n`);
  for (const p of candidatos) {
    console.log(`  ${p.sku}`);
    console.log(`    antes:   ${p.name}`);
    console.log(`    después: ${p.nombreNuevo}`);
  }

  // El slug sigue al nombre mientras el producto no se haya publicado. Si no se
  // moviera aqui, el primer guardado en el panel lo moveria igual, pero sin que
  // nadie lo hubiera revisado.
  //
  // Un producto ya publicado no se toca: su direccion circula en enlaces.
  const publicados = candidatos.filter((p) => p.publishedAt !== null);
  if (publicados.length > 0) {
    console.log(`\n${publicados.length} ya están publicados: se les cambia el nombre pero no la URL.`);
  }

  const usados = new Set(productos.map((p) => p.slug));
  const cambios = candidatos.map((p) => {
    if (p.publishedAt !== null) return { ...p, slugNuevo: p.slug };

    const base = slugify(p.nombreNuevo);
    // El SKU desempata, igual que en el panel: dos productos pueden llamarse
    // igual de forma legitima hasta que alguien los redacta completos.
    usados.delete(p.slug);
    const slugNuevo = !base || usados.has(base) ? `${base}-${p.sku.toLowerCase()}` : base;
    usados.add(slugNuevo);
    return { ...p, slugNuevo };
  });

  const urlsMovidas = cambios.filter((p) => p.slugNuevo !== p.slug);
  const plural = urlsMovidas.length === 1 ? 'URL se movería' : 'URLs se moverían';
  console.log(`\n${urlsMovidas.length} ${plural}:\n`);
  for (const p of urlsMovidas) {
    console.log(`  ${p.sku}  ${p.slug}\n         -> ${p.slugNuevo}`);
  }

  if (!aplicar) {
    console.log('\nEsto es una vista previa. Para escribirlo: pnpm db:capitalizar --aplicar');
    return;
  }

  // En una transaccion: si algo falla a medias, el catalogo queda con una parte
  // de los nombres nuevos y otra con los viejos, y no habria forma de saber
  // cual es cual sin volver a mirarlos uno por uno.
  await prisma.$transaction(
    cambios.map((p) =>
      prisma.product.update({
        where: { id: p.id },
        data: { name: p.nombreNuevo, slug: p.slugNuevo },
      }),
    ),
  );

  console.log(`\nListo: ${cambios.length} nombres reescritos.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
