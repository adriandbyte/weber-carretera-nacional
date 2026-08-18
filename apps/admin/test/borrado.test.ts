// La guarda que impide borrar algo en uso.
//
// Antes eran dos pruebas, catalogos.test.ts y categorias.test.ts, que llamaban
// a las Server Actions contra la base real solo para descubrir un numero. Como
// la decision es "si hay uso, no se borra, y se dice cuantos", no hace falta
// ninguna base: hace falta un numero.
//
// Lo que si comprobaban aquellas y esto no: que el conteo de uso que calcula
// CATALOGS coincida con la base. Eso es una auditoria de datos y vive ahora en
// `pnpm db:auditar`.
import { USO_CATALOGO, USO_CATEGORIA, motivoParaNoBorrar } from '@weber/core';
import { check } from './harness';

export async function correr() {
  check('sin uso se puede borrar', motivoParaNoBorrar(0, USO_CATALOGO), null);
  check('un uso negativo tampoco bloquea', motivoParaNoBorrar(-1, USO_CATALOGO), null);

  // El mensaje tiene que decir cuantos son: sin el numero, quien lo lee no sabe
  // si le queda un producto por mover o treinta.
  const uno = motivoParaNoBorrar(1, USO_CATALOGO);
  check('con un uso se bloquea', uno !== null, true);
  check('en singular concuerda', uno?.includes('1 producto lo usa'), true);

  const varios = motivoParaNoBorrar(33, USO_CATALOGO);
  check('en plural concuerda', varios?.includes('33 productos lo usan'), true);

  // Y tiene que terminar diciendo que hacer en su lugar, no solo que no se
  // puede: quien usa el panel no es tecnico.
  check('dice que hacer en su lugar', varios?.includes('desmarca "Visible"'), true);

  // Las categorias usan la misma regla con otras palabras.
  const categoria = motivoParaNoBorrar(1, USO_CATEGORIA);
  check(
    'la categoria concuerda en singular',
    categoria?.includes('1 producto está en esta categoría'),
    true,
  );
  check(
    'la categoria concuerda en plural',
    motivoParaNoBorrar(4, USO_CATEGORIA)?.includes('4 productos están en esta categoría'),
    true,
  );
}
