// Prueba de la deteccion de nombres sin redactar.
//
// Importa porque un falso negativo deja pasar un codigo de almacen a la
// tienda, y un falso positivo manda a alguien a "corregir" un nombre que ya
// estaba bien.
import { findPending, looksLikeWarehouseName } from '../src/pendientes';

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${nombre}`);
}

// Nombres crudos reales del Excel: todos deben detectarse.
for (const crudo of [
  '22" MASTER TOUCH GBS IVORY CA',
  'GENESIS E-315 LP BLK US/CA',
  'SUMMIT SB38 S SS LP US/CA/MX',
  'GENESIS 300 SERIES PREM GRILL CVR AMER',
  'RUST RESISTANT GRIDDLE FT G28 BLK US/CA',
]) {
  check(`detecta crudo: ${crudo.slice(0, 34)}`, looksLikeWarehouseName(crudo), true);
}

// Nombres ya redactados: ninguno debe marcarse.
for (const bueno of [
  'Asador de Carbón Weber Master-Touch GBS 22", Ivory',
  'Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro',
  'Asador Weber Q2800 con Carro',
  'Funda Premium Weber para Asador Genesis Serie 300',
  'Ahumador Smokey Mountain 14.5" Negro',
]) {
  check(`respeta redactado: ${bueno.slice(0, 34)}`, looksLikeWarehouseName(bueno), false);
}

const vacio = findPending({
  name: '22" MASTER TOUCH GBS IVORY CA',
  shortDescription: null,
  description: null,
  imageCount: 1,
  categoryCount: 1,
  hasProductType: true,
});
check('lista los tres pendientes del Master-Touch', vacio.length, 3);
check('el primero es el nombre', vacio[0]?.key, 'nombre');

const listo = findPending({
  name: 'Asador de Carbón Weber Master-Touch GBS 22", Ivory',
  shortDescription: 'Asador de carbón de 22 pulgadas con sistema Gourmet BBQ.',
  description: 'Texto largo de la ficha.',
  imageCount: 1,
  categoryCount: 1,
  hasProductType: true,
});
check('un producto completo no tiene pendientes', listo.length, 0);

// Los puntos que impiden publicar son los que llevan asterisco en el
// formulario. Si esta lista cambia, hay que mover el asterisco tambien.
const incompleto = findPending({
  name: 'Asador de prueba bien redactado',
  shortDescription: null,
  description: null,
  imageCount: 0,
  categoryCount: 0,
  hasProductType: false,
});
const bloqueantes = incompleto.filter((i) => i.blocking).map((i) => i.key).sort();
check(
  'los bloqueantes son descripcion corta, imagen, categoria y tipo',
  bloqueantes.join(','),
  'categoria,descripcion-corta,imagen,tipo',
);
check(
  'la descripcion completa no impide publicar',
  incompleto.find((i) => i.key === 'descripcion')?.blocking,
  false,
);
// El texto enumerable tiene que servir dentro de una frase.
check(
  'los textos enumerables se leen corridos',
  `Para publicar falta ${incompleto.filter((i) => i.blocking).map((i) => i.missing).join(', ')}.`,
  'Para publicar falta la descripción corta, una imagen, una categoría del menú, el tipo de producto.',
);

console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
