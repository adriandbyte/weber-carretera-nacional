// ---------------------------------------------------------------------------
// Que productos siguen pendientes, en forma de consulta.
//
// findPending (en @weber/core) es la fuente de verdad, pero trabaja sobre un
// producto ya cargado: sirve para pintar la ficha, no para preguntarle a la
// base "¿cual es el siguiente?".
//
// Esto es su traduccion a SQL. Coincide campo por campo con los pendientes
// bloqueantes, salvo el nombre sin redactar: eso lo decide una heuristica en
// JavaScript que Postgres no puede evaluar, y su equivalente aqui es la marca
// needsReview que dejo el importador.
//
// La imagen queda fuera a proposito. Sigue siendo un pendiente de la ficha,
// pero no bloquea publicar y las fotos se suben al almacenamiento remoto con
// la tienda ya en linea. Incluirla mandaria a quien captura a fichas donde lo
// unico que falta es algo que todavia no puede hacer.
// ---------------------------------------------------------------------------

import { prisma, type Prisma } from '@weber/db';

export const PENDING_WHERE: Prisma.ProductWhereInput = {
  OR: [
    { needsReview: true },
    { shortDescription: null },
    { categories: { none: {} } },
    { productTypeId: null },
  ],
};

export function countPending(): Promise<number> {
  return prisma.product.count({ where: PENDING_WHERE });
}

/// El siguiente producto por limpiar despues del que se acaba de guardar.
///
/// El cursor es el nombre que tenia el producto al abrirlo, no el que tiene
/// ahora: quien limpia el catalogo casi siempre reescribe el nombre, y usar el
/// nuevo moveria el punto del recorrido a otra letra del abecedario. Con el
/// viejo se sigue avanzando desde donde se estaba.
///
/// El id desempata los nombres repetidos, que los hay: el mismo modelo en dos
/// medidas comparte nombre hasta que alguien lo redacta completo.
/// Busca el primer pendiente que cumpla el filtro, en orden de recorrido.
///
/// Es un parametro y no una llamada directa a Prisma para poder comprobar el
/// recorrido con una lista inventada, sin base de datos. Lo que decide esta
/// funcion no es SQL: es que se salte el producto actual, que avance desde el
/// cursor y que al final vuelva al principio.
export type BuscarPendiente = (opciones: {
  excluirId: string;
  /// Desde donde seguir. Ausente significa "desde el principio".
  despuesDe?: { name: string; id: string };
}) => Promise<string | null>;

export async function elegirSiguientePendiente(
  afterName: string,
  currentId: string,
  buscar: BuscarPendiente,
): Promise<string | null> {
  const next = await buscar({ excluirId: currentId, despuesDe: { name: afterName, id: currentId } });
  if (next) return next;

  // Al llegar al final se vuelve a empezar. Sin esta vuelta, quien entro por
  // la mitad de la lista se quedaba sin siguiente teniendo cien por delante.
  return buscar({ excluirId: currentId });
}

export function findNextPendingId(afterName: string, currentId: string): Promise<string | null> {
  return elegirSiguientePendiente(afterName, currentId, async ({ excluirId, despuesDe }) => {
    const order: Prisma.ProductOrderByWithRelationInput[] = [{ name: 'asc' }, { id: 'asc' }];
    const filtros: Prisma.ProductWhereInput[] = [PENDING_WHERE, { id: { not: excluirId } }];

    // El cursor compara por nombre y desempata por id, igual que el orden.
    //
    // Con solo `name > afterName` los nombres repetidos se perdian: el segundo
    // producto que comparte nombre quedaba por debajo del cursor y la vuelta al
    // principio tampoco lo alcanzaba, asi que no se visitaba nunca. En el
    // catalogo hay cinco pares de nombres identicos.
    if (despuesDe) {
      filtros.push({
        OR: [
          { name: { gt: despuesDe.name } },
          { AND: [{ name: despuesDe.name }, { id: { gt: despuesDe.id } }] },
        ],
      });
    }

    const fila = await prisma.product.findFirst({
      where: { AND: filtros },
      orderBy: order,
      select: { id: true },
    });
    return fila?.id ?? null;
  });
}
