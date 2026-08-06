// ---------------------------------------------------------------------------
// Configuracion del CLI de Prisma.
//
// Antes vivia en `package.json#prisma`, que Prisma 6 ya marca como deprecado y
// Prisma 7 elimina: cada `prisma generate` imprimia el aviso.
//
// El detalle que no es obvio: en cuanto existe este archivo, el CLI deja de
// cargar `.env` por su cuenta. Sin la linea de dotenv, `prisma migrate` se
// queda sin DATABASE_URL y falla con un mensaje que no menciona el .env.
// ---------------------------------------------------------------------------

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx scripts/seed.ts',
  },
});
