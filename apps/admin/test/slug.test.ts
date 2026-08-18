// Prueba del ciclo de vida de la URL contra la base real.
//
// Es la regla mas facil de romper sin darse cuenta: como el campo ya no
// aparece en el panel, nadie va a notar a mano que una URL publicada se movio.
import { prisma } from '@weber/db';
import { slugify } from '@weber/core';
import { check } from './harness';

/// Replica la regla de saveProduct: sin publicar la URL sigue al nombre,
/// publicado se queda como esta.
function resolveSlug(name: string, current: { slug: string; publishedAt: Date | null }) {
  return current.publishedAt === null ? slugify(name) : current.slug;
}

export async function correr() {
  const sinPublicar = { slug: 'genesis-e-315-lp-blk-us-ca-1500010', publishedAt: null };
  check(
    'en borrador la URL sigue al nombre',
    resolveSlug('Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro', sinPublicar),
    'asador-de-gas-weber-genesis-e-315-3-quemadores-negro',
  );

  const publicado = { slug: 'asador-genesis-e-315', publishedAt: new Date('2026-01-15') };
  check(
    'publicado la URL no se mueve aunque cambie el nombre',
    resolveSlug('Otro Nombre Completamente Distinto', publicado),
    'asador-genesis-e-315',
  );

  check(
    'acentos y simbolos se limpian',
    slugify('Asador Carbón 22" Ivory®'),
    'asador-carbon-22-ivory',
  );
  check('nombre sin letras no genera URL', slugify('!!! ???'), '');

  // Ningun producto puede compartir URL: es la llave de la pagina publica.
  const dup = await prisma.$queryRaw<{ slug: string; n: bigint }[]>`
    SELECT slug, COUNT(*) AS n FROM productos GROUP BY slug HAVING COUNT(*) > 1
  `;
  check('no hay URLs duplicadas en la base', dup.length, 0);

  // Abrir una ficha y guardarla sin tocar el nombre no debe mover su URL.
  //
  // Parece obvio y no lo era: el importador escribia los slugs con una regla
  // (SKU pegado siempre, corte a 80) y el panel los recalculaba con otra, asi
  // que el primer guardado de cada producto le cambiaba la direccion. Esta
  // comprobacion recorre el catalogo entero y es la que avisaria si las dos
  // reglas volvieran a separarse.
  const productos = await prisma.product.findMany({
    select: { sku: true, name: true, slug: true },
  });
  const moverian = productos.filter((producto) => {
    const base = slugify(producto.name);
    return producto.slug !== base && producto.slug !== `${base}-${producto.sku.toLowerCase()}`;
  });
  check('guardar sin cambiar el nombre no movería ninguna URL', moverian.length, 0);
  for (const p of moverian.slice(0, 3)) {
    console.log(`        ${p.sku} "${p.slug}" -> "${slugify(p.name)}"`);
  }
}
