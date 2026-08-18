// Prueba del ciclo de vida de la URL de un producto.
//
// Es la regla mas facil de romper sin darse cuenta: como el campo ya no aparece
// en el panel, nadie va a notar a mano que una URL publicada se movio.
//
// Lo que antes recorria el catalogo entero para comprobar que ninguna URL se
// moveria vive ahora en `pnpm db:auditar`. Eso miraba el estado de los datos,
// no el de esta regla: fallaba al importar un Excel raro y no al romper el
// codigo, que es lo contrario de lo que tiene que hacer una prueba.
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

  // El caso que rompio las URLs una vez: el importador escribia el slug con el
  // SKU pegado y el panel lo recalculaba sin el, asi que el primer guardado de
  // cada producto le cambiaba la direccion. La regla de arriba es la que lo
  // impide, y solo funciona si un producto ya publicado se deja en paz.
  const importado = {
    slug: 'asador-de-gas-weber-genesis-e-315-1500010',
    publishedAt: new Date('2026-01-15'),
  };
  check(
    'un slug con SKU pegado sobrevive al primer guardado',
    resolveSlug('Asador de Gas Weber Genesis E-315', importado),
    'asador-de-gas-weber-genesis-e-315-1500010',
  );
}
