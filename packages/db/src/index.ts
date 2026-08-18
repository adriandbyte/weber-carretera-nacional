// Prisma 6 cargaba el .env por su cuenta y todo el mundo se apoyaba en ello sin
// saberlo. Prisma 7 dejo de hacerlo, asi que sin esta linea los scripts y las
// pruebas se quedan sin DATABASE_URL. En Next es inocuo: ya lo carga el
// framework antes de que se importe nada de aqui.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export * from './generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/// Prisma 7 ya no abre la conexion por su cuenta: el motor propio desaparecio y
/// hay que pasarle un adaptador del driver. Para Postgres es PrismaPg, que por
/// dentro es el pool de `pg`.
///
/// La URL se lee aqui y no del esquema porque el bloque datasource ya no la
/// admite. DATABASE_URL es la que puede ir por un pooler; DIRECT_URL queda
/// para el CLI, que hace DDL.
function crearCliente(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Antes el fallo llegaba desde dentro de Prisma, en la primera consulta y
    // con un mensaje que no mencionaba el .env. Vale mas gastarlo aqui.
    throw new Error(
      'Falta DATABASE_URL. Vive en el .env de la raiz, al que cada paquete llega por symlink.',
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });
}

/// Cliente unico. En desarrollo Next.js recarga los modulos en cada cambio,
/// asi que sin este cache se abririan conexiones hasta agotar el pool.
export const prisma = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
