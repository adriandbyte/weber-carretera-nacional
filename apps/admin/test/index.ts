// Todas las pruebas del panel, en un proceso y con una sola conexion.
// El porque esta en harness.ts.
import { prisma } from '@weber/db';
import { totalFallos } from './harness';
import { correr as urls } from './slug.test';
import { correr as catalogos } from './catalogos.test';
import { correr as categorias } from './categorias.test';
import { correr as siguientePendiente } from './siguiente-pendiente.test';
import { correr as slugifyAlineado } from './slugify-alineado.test';

const SUITES: [string, () => Promise<void>][] = [
  ['URL del producto', urls],
  ['slugify alineado entre paquetes', slugifyAlineado],
  ['Catálogos', catalogos],
  ['Categorías', categorias],
  ['Recorrido de limpieza', siguientePendiente],
];

async function main() {
  for (const [nombre, correr] of SUITES) {
    console.log(`\n— ${nombre} —`);
    await correr();
  }

  const fallos = totalFallos();
  console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

// $disconnect en finally y sin process.exit: cortar el proceso a la fuerza
// puede dejar la salida a medio escribir, y con una sola conexion abierta ya no
// hace falta forzar la salida.
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
