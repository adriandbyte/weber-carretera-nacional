// Las dos copias de slugify tienen que producir lo mismo, siempre.
//
// Hay dos porque @weber/core ya depende de @weber/db, y que el importador
// importara de core cerraria el ciclo entre los paquetes. Mientras esa
// duplicacion exista, esta prueba es lo unico que impide que se separen.
//
// Cuando se separaron de verdad costo caro y en silencio: el importador
// cortaba a 80 caracteres y le pegaba el SKU a toda direccion, el panel cortaba
// a 120 y solo usaba el SKU al haber choque. Resultado: abrir una ficha y
// guardarla, sin tocar el nombre, le cambiaba la URL al producto.
import { prisma } from '@weber/db';
import { slugify as slugCore } from '@weber/core';
import { slugify as slugImportador } from '../../../packages/db/scripts/lib/normalize.js';
import { check } from './harness';

/// Casos que separaron las dos versiones alguna vez, mas la basura habitual.
const CASOS = [
  'Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro',
  'Asador Carbón 22" Ivory®',
  'GENESIS E-315 LP BLK US/CA',
  'Piedra para asar Spirit II 200/300 en adelante Asadores de carbón Original Kettle y Performer 22" Summit Charcoal Grill / Grilling Center',
  'Funda de asador Premium (asador eléctrico Lumin con soporte y asador eléctrico Lumin Compact con soporte)',
  'Weber Works™ Soporte para Utensilios',
  '¡Oferta! 50% —— descuento',
  '!!! ???',
  '',
  '   ',
  'ñandú Ñ á é í ó ú ü',
];

export async function correr() {
  for (const caso of CASOS) {
    check(
      `misma URL para ${JSON.stringify(caso.slice(0, 38))}`,
      slugImportador(caso),
      slugCore(caso),
    );
  }

  // El catalogo real es el mejor banco de pruebas que hay: son los nombres que
  // de verdad salieron del Excel, con sus simbolos y sus largos.
  const nombres = await prisma.product.findMany({ select: { name: true } });
  const distintos = nombres.filter((p) => slugImportador(p.name) !== slugCore(p.name));
  check('las dos coinciden en los 331 nombres del catalogo', distintos.length, 0);
  for (const d of distintos.slice(0, 3)) {
    console.log(
      `        "${d.name}"\n          importador: ${slugImportador(d.name)}\n          core:       ${slugCore(d.name)}`,
    );
  }

  // Y el corte tiene que ser el mismo, que es justo donde se separaron.
  const largo = 'a'.repeat(200);
  check('cortan a la misma longitud', slugImportador(largo).length, slugCore(largo).length);
  check('cortan a 120', slugCore(largo).length, 120);
}
