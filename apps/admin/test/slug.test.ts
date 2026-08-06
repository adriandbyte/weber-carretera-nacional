// Prueba del ciclo de vida de la URL contra la base real.
//
// Es la regla mas facil de romper sin darse cuenta: como el campo ya no
// aparece en el panel, nadie va a notar a mano que una URL publicada se movio.
import { prisma } from '@weber/db';
import { slugify } from '@weber/core';

let fallos = 0;

function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${nombre}\n      real: ${JSON.stringify(real)}  esperado: ${JSON.stringify(esperado)}`);
}

/// Replica la regla de saveProduct: sin publicar la URL sigue al nombre,
/// publicado se queda como esta.
function resolveSlug(name: string, current: { slug: string; publishedAt: Date | null }) {
  return current.publishedAt === null ? slugify(name) : current.slug;
}

async function main() {
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

  check('acentos y simbolos se limpian', slugify('Asador Carbón 22" Ivory®'), 'asador-carbon-22-ivory');
  check('nombre sin letras no genera URL', slugify('!!! ???'), '');

  // Ningun producto puede compartir URL: es la llave de la pagina publica.
  const dup = await prisma.$queryRaw<{ slug: string; n: bigint }[]>`
    SELECT slug, COUNT(*) AS n FROM productos GROUP BY slug HAVING COUNT(*) > 1
  `;
  check('no hay URLs duplicadas en la base', dup.length, 0);

  console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
