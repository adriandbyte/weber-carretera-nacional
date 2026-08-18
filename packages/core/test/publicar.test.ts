// Que se exige de verdad para publicar un producto.
//
// Es la regla que mas caro sale equivocar en las dos direcciones. De menos,
// sale a la tienda una ficha sin descripcion o fuera de toda seccion, y nadie
// se entera hasta verla publicada. De mas, se bloquea a quien captura por un
// campo que en realidad no hacia falta.
//
// Se comprueba con productos inventados: la regla solo mira la foto del
// producto, no necesita consultarlo en ningun lado.
import { motivoParaNoPublicar } from '../src/pendientes';

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALLA'} ${nombre}` +
      (ok ? '' : `\n      real: ${JSON.stringify(real)}  esperado: ${JSON.stringify(esperado)}`),
  );
}

/// Un producto al que no le falta nada.
const COMPLETO = {
  name: 'Asador de Gas Weber Genesis E-315, Negro',
  shortDescription: 'Asador de gas de tres quemadores para seis personas.',
  description: 'Texto largo de la ficha, con medidas y materiales.',
  imageCount: 1,
  categoryCount: 1,
  hasProductType: true,
};

check('un producto completo se publica', motivoParaNoPublicar(COMPLETO), null);

// --- Lo que si impide publicar --------------------------------------------

const sinCorta = motivoParaNoPublicar({ ...COMPLETO, shortDescription: null });
check('sin descripcion corta no se publica', sinCorta !== null, true);
check('y el mensaje dice cual falta', sinCorta?.includes('la descripción corta'), true);

const sinCategoria = motivoParaNoPublicar({ ...COMPLETO, categoryCount: 0 });
check('sin categoria no se publica', sinCategoria !== null, true);
check('y el mensaje dice cual falta', sinCategoria?.includes('una categoría del menú'), true);

const sinTipo = motivoParaNoPublicar({ ...COMPLETO, hasProductType: false });
check('sin tipo de producto no se publica', sinTipo !== null, true);

const nombreCrudo = motivoParaNoPublicar({ ...COMPLETO, name: 'GENESIS E-315 LP BLK US/CA' });
check('con el nombre del sistema de Weber no se publica', nombreCrudo !== null, true);

// --- Lo que NO impide publicar --------------------------------------------

// La foto se sube al almacenamiento remoto con la tienda ya en linea, asi que
// exigirla antes detendria el catalogo entero por un trabajo posterior.
check('sin imagen si se publica', motivoParaNoPublicar({ ...COMPLETO, imageCount: 0 }), null);

// La descripcion completa es recomendable, no obligatoria: la corta ya da lo
// minimo para que la ficha no salga vacia.
check('sin descripcion larga si se publica', motivoParaNoPublicar({ ...COMPLETO, description: null }), null);

// --- El mensaje, cuando falta mas de una cosa -----------------------------

const vacio = motivoParaNoPublicar({
  name: 'Asador de prueba bien redactado',
  shortDescription: null,
  description: null,
  imageCount: 0,
  categoryCount: 0,
  hasProductType: false,
});
// Se enumeran todas de una vez y no de una en una: quien captura no deberia
// tener que guardar cuatro veces para descubrir los cuatro campos que faltan.
check(
  'las que faltan se enumeran en una sola frase',
  vacio,
  'Para publicar falta la descripción corta, una categoría del menú, el tipo de producto. ' +
    'Guárdalo como borrador mientras tanto.',
);
// Y termina diciendo que hacer, no solo que esta mal.
check('el mensaje dice que hacer mientras tanto', vacio?.includes('Guárdalo como borrador'), true);

console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
