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

// Prisma 7 ya no lee la URL del bloque datasource del esquema: hay que darla
// aqui, y por eso el import de dotenv de arriba dejo de ser una comodidad.
//
// Va DIRECT_URL antes que DATABASE_URL porque lo que corre por aqui son las
// ordenes DDL de migrate, y un pooler no las admite. En local las dos apuntan
// al mismo Postgres, asi que la diferencia solo importa al desplegar.
//
// Y se resuelve sin `env()` a proposito: ese ayudante revienta al cargar el
// archivo si la variable no existe, y el archivo se carga para CUALQUIER orden
// de Prisma, incluida `generate`, que no se conecta a nada. En un build de
// Vercel eso tiraba el despliegue entero por una URL que nadie iba a usar.
// Cuando falta y si hace falta, el que se queja es el comando que la necesita.
const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx scripts/seed.ts',
  },
  ...(url ? { datasource: { url } } : {}),
});
