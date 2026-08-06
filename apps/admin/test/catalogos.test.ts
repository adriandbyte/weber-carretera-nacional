// Prueba de la guarda que impide borrar un valor de catalogo en uso.
//
// Es la regla que mas caro sale romper: borrar "Gas" dejaria 33 asadores sin
// combustible, y el error no se veria hasta que alguien filtrara en la tienda.
import { prisma } from '@weber/db';
import { CATALOGS } from '../src/lib/catalogos';

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${nombre}  (real: ${JSON.stringify(real)}, esperado: ${JSON.stringify(esperado)})`);
}

async function main() {
  check('estan los siete catalogos', Object.keys(CATALOGS).length, 7);

  // El conteo de uso tiene que coincidir con la base, o la pantalla ofreceria
  // eliminar algo que si se esta usando.
  const colores = await CATALOGS.colores!.list();
  const negro = colores.find((c) => c.slug === 'negro');
  const negroReal = await prisma.product.count({ where: { color: { slug: 'negro' } } });
  check('el uso de un color coincide con la base', negro?.usage, negroReal);

  // Una serie cuenta dos veces: como serie propia y como compatibilidad.
  const series = await CATALOGS.series!.list();
  const genesis = series.find((s) => s.slug === 'genesis');
  const propios = await prisma.product.count({ where: { series: { slug: 'genesis' } } });
  const compat = await prisma.productCompatibility.count({ where: { series: { slug: 'genesis' } } });
  check('una serie suma sus usos como serie y como compatibilidad', genesis?.usage, propios + compat);

  // La accion de borrado se niega en silencio cuando hay uso. Se comprueba
  // que el registro sigue ahi despues de intentarlo.
  const { deleteCatalogItem } = await import('../src/app/catalogos/actions');
  const antes = await prisma.color.count();
  const form = new FormData();
  form.set('id', negro!.id);
  await deleteCatalogItem('colores', form).catch(() => undefined);
  check('un color en uso no se borra', await prisma.color.count(), antes);

  console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
  process.exit(fallos === 0 ? 0 : 1);
}

main().finally(() => prisma.$disconnect());
