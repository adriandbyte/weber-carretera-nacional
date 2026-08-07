// Prueba del recorrido de "Guardar y seguir" contra la base real.
//
// Es el flujo con el que se van a limpiar los 331 productos, asi que un salto
// mal calculado no es un detalle: significa fichas que nunca aparecen y otras
// que salen dos veces, sin que nadie lo note hasta el final.
//
// Lo que mas importa aqui es el cursor. Quien limpia el catalogo casi siempre
// reescribe el nombre, y el nombre es lo que ordena el recorrido: si se usara
// el nombre nuevo, renombrar "22IN ORIG KETTLE" a "Asador Original Kettle"
// saltaria de golpe media lista.
import { prisma } from '@weber/db';
import { PENDING_WHERE, countPending, findNextPendingId } from '../src/lib/productos';
import { check } from './harness';

export async function correr() {
  const orden = await prisma.product.findMany({
    where: PENDING_WHERE,
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true },
  });

  check('hay productos pendientes que recorrer', orden.length > 0, true);
  check('countPending cuadra con la consulta', await countPending(), orden.length);

  const primero = orden[0]!;
  const segundo = orden[1]!;
  const tercero = orden[2]!;

  check(
    'desde el primero se avanza al segundo',
    await findNextPendingId(primero.name, primero.id),
    segundo.id,
  );

  // El caso que motivo el diseño: se guarda con un nombre nuevo, pero el
  // cursor es el de antes de guardar, asi que el recorrido no se mueve de
  // sitio aunque el producto se haya ido al final del abecedario.
  check(
    'renombrar no descoloca el recorrido',
    await findNextPendingId(segundo.name, segundo.id),
    tercero.id,
  );

  // Nunca se devuelve el producto que se acaba de guardar: se quedaria dando
  // vueltas sobre la misma ficha.
  const ultimo = orden[orden.length - 1]!;
  const trasElUltimo = await findNextPendingId(ultimo.name, ultimo.id);
  check('el ultimo da la vuelta al principio', trasElUltimo, primero.id);
  check('nunca devuelve la ficha actual', trasElUltimo === ultimo.id, false);

  // Un nombre posterior a todos: solo puede resolverse dando la vuelta.
  check(
    'un nombre fuera de rango vuelve al principio',
    await findNextPendingId('￿', 'ninguno'),
    primero.id,
  );
}
