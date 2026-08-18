// Prueba del recorrido de "Guardar y seguir", con una lista inventada.
//
// Es el flujo con el que se van a limpiar los 331 productos, asi que un salto
// mal calculado no es un detalle: significa fichas que nunca aparecen y otras
// que salen dos veces, sin que nadie lo note hasta el final.
//
// Antes esta prueba consultaba la base y comprobaba el catalogo importado, asi
// que fallaba cuando cambiaban los datos y no cuando se rompia el recorrido.
// Ahora la busqueda se inyecta: el orden lo pone esta lista, no Postgres.
import { elegirSiguientePendiente, type BuscarPendiente } from '../src/lib/productos';
import { check } from './harness';

/// Cuatro pendientes ya en orden de recorrido (nombre, luego id).
/// "Asador B" esta repetido a proposito: los nombres duplicados existen en el
/// catalogo y el id es lo unico que los desempata.
const PENDIENTES = [
  { id: 'p1', name: 'Asador A' },
  { id: 'p2', name: 'Asador B' },
  { id: 'p3', name: 'Asador B' },
  { id: 'p4', name: 'Asador C' },
];

/// La misma semantica que la consulta, resuelta sobre la lista de arriba:
/// avanza por nombre y desempata por id.
const buscarEnLaLista: BuscarPendiente = async ({ excluirId, despuesDe }) => {
  const encontrado = PENDIENTES.find((p) => {
    if (p.id === excluirId) return false;
    if (!despuesDe) return true;
    return p.name > despuesDe.name || (p.name === despuesDe.name && p.id > despuesDe.id);
  });
  return encontrado?.id ?? null;
};

export async function correr() {
  check(
    'desde el primero se avanza al siguiente nombre',
    await elegirSiguientePendiente('Asador A', 'p1', buscarEnLaLista),
    'p2',
  );

  // El caso que motivo el diseño: se guarda con un nombre nuevo, pero el cursor
  // es el de antes de guardar, asi que el recorrido no se mueve de sitio aunque
  // el producto se haya ido al final del abecedario.
  check(
    'renombrar no descoloca el recorrido',
    await elegirSiguientePendiente('Asador A', 'p1', buscarEnLaLista),
    'p2',
  );

  // Al final se da la vuelta: la primera busqueda no encuentra nada despues del
  // ultimo nombre y la segunda arranca desde el principio.
  check(
    'el ultimo da la vuelta al principio',
    await elegirSiguientePendiente('Asador C', 'p4', buscarEnLaLista),
    'p1',
  );

  // Nunca se devuelve el producto que se acaba de guardar: se quedaria dando
  // vueltas sobre la misma ficha.
  const soloQuedaElActual: BuscarPendiente = async ({ excluirId }) =>
    excluirId === 'p1' ? null : 'p1';
  check(
    'si el unico pendiente es el actual, no hay siguiente',
    await elegirSiguientePendiente('Asador A', 'p1', soloQuedaElActual),
    null,
  );

  // Un nombre posterior a todos: solo puede resolverse dando la vuelta.
  check(
    'un nombre fuera de rango vuelve al principio',
    await elegirSiguientePendiente('￿', 'ninguno', buscarEnLaLista),
    'p1',
  );

  // El caso que destapo un bug de verdad. Con el cursor comparando solo por
  // nombre, desde el primer "Asador B" se saltaba al "Asador C" y el segundo
  // "Asador B" no se visitaba nunca: quedaba por debajo del cursor y la vuelta
  // al principio tampoco lo alcanzaba. En el catalogo hay cinco pares asi.
  check(
    'un nombre repetido no se salta',
    await elegirSiguientePendiente('Asador B', 'p2', buscarEnLaLista),
    'p3',
  );
  check(
    'y desde el segundo se sigue de largo',
    await elegirSiguientePendiente('Asador B', 'p3', buscarEnLaLista),
    'p4',
  );
}
