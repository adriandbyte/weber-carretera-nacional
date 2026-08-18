// Todas las pruebas del panel, en un proceso.
//
// Ninguna toca la base: son logica con datos inventados, y por eso corren en
// CI sin Postgres, sin secretos y sin depender de que el catalogo importado
// siga como estaba. Lo que si necesita la base es una auditoria de datos, no
// una prueba, y vive en `pnpm db:auditar`.
import { totalFallos } from './harness';
import { correr as urls } from './slug.test';
import { correr as borrado } from './borrado.test';
import { correr as categorias } from './categorias.test';
import { correr as siguientePendiente } from './siguiente-pendiente.test';
import { correr as slugifyAlineado } from './slugify-alineado.test';

const SUITES: [string, () => Promise<void>][] = [
  ['URL del producto', urls],
  ['slugify alineado entre paquetes', slugifyAlineado],
  ['Borrado de lo que está en uso', borrado],
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
