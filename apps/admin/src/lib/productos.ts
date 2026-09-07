// ---------------------------------------------------------------------------
// Cuantos productos siguen pendientes, en forma de consulta.
//
// findPending (en @weber/core) es la fuente de verdad, pero trabaja sobre un
// producto ya cargado: sirve para pintar la ficha, no para contar sobre la base.
//
// Esto es su traduccion a SQL. Coincide campo por campo con los pendientes
// bloqueantes, salvo el nombre sin redactar: eso lo decide una heuristica en
// JavaScript que Postgres no puede evaluar, y su equivalente aqui es la marca
// needsReview.
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
