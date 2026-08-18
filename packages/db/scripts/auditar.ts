// ---------------------------------------------------------------------------
// Auditoria del estado de los datos.
//
//   pnpm db:auditar
//
// Esto no es una prueba y por eso no corre en CI. Una prueba falla cuando se
// rompe el codigo; esto falla cuando los datos estan mal, que es otra cosa y
// pasa en otros momentos: al importar un Excel nuevo, al renombrar en masa, al
// migrar los slugs.
//
// Antes vivia disfrazado de prueba dentro del panel. Mezclado ahi tenia dos
// problemas: exigia una base para verificar logica que no la necesita, y su
// resultado dependia del catalogo importado, asi que se ponia rojo por razones
// que no tenian nada que ver con el cambio que se estaba revisando.
// ---------------------------------------------------------------------------

import { prisma } from '../src/index.js';
import { slugify as slugPanel } from '../../core/src/schemas.js';
import { slugify as slugImportador } from './lib/normalize.js';

let problemas = 0;

function revisar(titulo: string, fallos: string[], detalle?: (f: string) => string) {
  if (fallos.length === 0) {
    console.log(`ok    ${titulo}`);
    return;
  }
  problemas += 1;
  console.log(`AVISO ${titulo}: ${fallos.length}`);
  for (const f of fallos.slice(0, 5)) console.log(`        ${detalle ? detalle(f) : f}`);
  if (fallos.length > 5) console.log(`        …y ${fallos.length - 5} más`);
}

async function main() {
  const productos = await prisma.product.findMany({
    select: { sku: true, name: true, slug: true },
  });
  console.log(`\nAuditando ${productos.length} productos\n`);

  // Ningun producto puede compartir URL: es la llave de la pagina publica.
  const porSlug = new Map<string, string[]>();
  for (const p of productos) porSlug.set(p.slug, [...(porSlug.get(p.slug) ?? []), p.sku]);
  revisar(
    'sin URLs duplicadas',
    [...porSlug.entries()].filter(([, skus]) => skus.length > 1).map(([slug]) => slug),
  );

  // Las dos copias de slugify tienen que producir lo mismo. Hay dos porque el
  // importador no puede importar de @weber/core sin cerrar un ciclo entre los
  // paquetes; los casos dificiles se comprueban en las pruebas, y aqui se pasa
  // el catalogo entero por encima.
  revisar(
    'las dos copias de slugify coinciden',
    productos.filter((p) => slugImportador(p.name) !== slugPanel(p.name)).map((p) => p.sku),
    (sku) => {
      const p = productos.find((x) => x.sku === sku)!;
      return `${sku} "${p.name}"\n          importador: ${slugImportador(p.name)}\n          panel:      ${slugPanel(p.name)}`;
    },
  );

  // Abrir una ficha y guardarla sin tocar el nombre no debe mover su URL.
  //
  // Parece obvio y no lo era: el importador escribia los slugs con una regla
  // (SKU pegado siempre, corte a 80) y el panel los recalculaba con otra, asi
  // que el primer guardado de cada producto le cambiaba la direccion.
  revisar(
    'guardar sin cambiar el nombre no movería ninguna URL',
    productos
      .filter((p) => {
        const base = slugPanel(p.name);
        return p.slug !== base && p.slug !== `${base}-${p.sku.toLowerCase()}`;
      })
      .map((p) => `${p.sku} "${p.slug}" -> "${slugPanel(p.name)}"`),
  );

  // Un SKU es la llave con la que se cruzan las listas de precios: si no es un
  // numero, alguien lo capturo a mano y la carga masiva no lo va a encontrar.
  revisar(
    'todos los SKU tienen forma de SKU',
    productos.filter((p) => !/^[A-Z0-9-]{3,}$/i.test(p.sku)).map((p) => `${p.sku} "${p.name}"`),
  );

  const sinCategoria = await prisma.product.count({ where: { categories: { none: {} } } });
  revisar('todos tienen categoría', sinCategoria > 0 ? [`${sinCategoria} sin categoría`] : []);

  const sinTipo = await prisma.product.count({ where: { productTypeId: null } });
  revisar('todos tienen tipo de producto', sinTipo > 0 ? [`${sinTipo} sin tipo`] : []);

  console.log(
    problemas === 0
      ? '\nLos datos están sanos'
      : `\n${problemas} punto(s) que revisar. No son errores de código: son datos.`,
  );
  // Sin codigo de salida distinto de cero: esto informa, no bloquea. Nada de
  // esto tiene que impedir un merge.
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
