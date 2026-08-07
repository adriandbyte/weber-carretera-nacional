// Prueba de la guarda que impide borrar un valor de catalogo en uso.
//
// Es la regla que mas caro sale romper: borrar "Gas" dejaria 33 asadores sin
// combustible, y el error no se veria hasta que alguien filtrara en la tienda.
import { prisma } from '@weber/db';
import { CATALOGS } from '../src/lib/catalogos';
import { check } from './harness';

export async function correr() {
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
  const compat = await prisma.productCompatibility.count({
    where: { series: { slug: 'genesis' } },
  });
  check(
    'una serie suma sus usos como serie y como compatibilidad',
    genesis?.usage,
    propios + compat,
  );

  // La accion de borrado se niega cuando hay uso, y ahora ademas lo explica:
  // antes devolvia sin decir nada y la pantalla se quedaba igual, asi que
  // quien lo intentaba concluia que el panel estaba roto.
  const { deleteCatalogItem } = await import('../src/app/catalogos/actions');
  const antes = await prisma.color.count();
  const form = new FormData();
  form.set('id', negro!.id);
  const resultado = await deleteCatalogItem('colores', { ok: false }, form);
  check('un color en uso no se borra', await prisma.color.count(), antes);
  check('el borrado rechazado se reporta', resultado.ok, false);
  check(
    'el mensaje dice cuantos productos lo usan',
    resultado.message?.includes(String(negro!.usage)),
    true,
  );
}
