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
// ---------------------------------------------------------------------------

import { prisma, type Prisma } from '@weber/db';

export const PENDING_WHERE: Prisma.ProductWhereInput = {
  OR: [
    { needsReview: true },
    { shortDescription: null },
    { images: { none: {} } },
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
export async function findNextPendingId(
  afterName: string,
  currentId: string,
): Promise<string | null> {
  const order: Prisma.ProductOrderByWithRelationInput[] = [{ name: 'asc' }, { id: 'asc' }];
  const notCurrent = { id: { not: currentId } };

  const next = await prisma.product.findFirst({
    where: { AND: [PENDING_WHERE, notCurrent, { name: { gt: afterName } }] },
    orderBy: order,
    select: { id: true },
  });
  if (next) return next.id;

  // Al llegar al final se vuelve a empezar. Sin esta vuelta, quien entro por
  // la mitad de la lista se quedaba sin siguiente teniendo cien por delante.
  const first = await prisma.product.findFirst({
    where: { AND: [PENDING_WHERE, notCurrent] },
    orderBy: order,
    select: { id: true },
  });
  return first?.id ?? null;
}
