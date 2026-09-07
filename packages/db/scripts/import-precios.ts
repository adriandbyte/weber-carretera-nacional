// ---------------------------------------------------------------------------
// Importa una lista de precios y la cruza con el inventario por SKU.
//
//   pnpm import:precios                        usa la lista vigente
//   pnpm import:precios -- ruta/a/otra.xlsx     usa otro archivo
//   pnpm import:precios -- --crear              da de alta lo que falte
//
// Se separa del importador de inventario a proposito: la lista de precios
// llega despues y se va a actualizar muchas mas veces que el catalogo.
//
// El archivo solo necesita una columna de SKU y una de precio. Los nombres
// de encabezado se detectan solos entre las variantes mas comunes, asi que
// sirve tal como venga de Weber o de contabilidad sin tener que reformatearlo.
//
// Encabezados reconocidos (sin distinguir mayusculas ni acentos):
//   SKU      sku, codigo, clave, articulo, modelo, no. parte
//   Precio   precio, precio publico, precio venta, pvp, price, map
//   Lista    precio lista, precio regular, precio anterior, compare
//   Costo    costo, cost
//   Stock    stock, existencia, inventario, cantidad
//
// Los precios de Weber Mexico ya vienen con IVA: son el precio final que ve
// el cliente, asi que se guardan tal cual y la tienda no calcula impuestos.
//
// Con --crear, los SKU de la lista que no existen en el catalogo se dan de alta
// como borrador. Es opt-in porque un SKU sin producto puede ser un alta o una
// errata de captura, y solo quien mira las dos listas puede saberlo: sin la
// bandera se reportan y no se toca nada.
//
// El alta corre una sola vez por producto: si despues cambia una regla de
// clasificacion o de nombre, lo que ya existe no se vuelve a calcular, y hay que
// borrarlo para que se de de alta otra vez.
//
// El alta se clasifica con la columna de categoria de la propia lista, que
// habla el mismo vocabulario que el inventario ("GAS Q", "CHARCOAL Performer"),
// y su nombre se redacta con las mismas reglas que el resto del catalogo. Trae
// menos informacion -el inventario tiene dos columnas de categoria y esta una-,
// asi que el producto queda marcado para revisar.
//
// Nada se publica solo. Un producto pasa de borrador a activo unicamente
// con --publicar, y aun asi solo si quedo con precio mayor a cero.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { prisma, Prisma } from '../src/index.js';
import { fold, normalizeRow, slugify } from './lib/normalize.js';
import { generarNombre } from './lib/nombres.js';
import { seedCatalogs } from './lib/catalogs.js';
import { deriveSeo } from '../../core/src/format.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '../../..');
const DEFAULT_FILE = path.join(REPO_ROOT, 'data/fuentes/Lista de Precios 2026 - Pagina Web.xlsx');

/// Precios que el cliente dio de palabra porque su lista no los trae.
///
/// Los dos tanques de gas se venden, pero se quedaron fuera de la lista 2026
/// (2026-09-07: 400 gr $399, 10 kg $1,999). Se aplican solo si el producto
/// sigue sin precio, asi que en cuanto Weber los meta en su lista, la lista
/// manda y este mapa deja de hacer nada.
const PRECIOS_DICHOS = new Map([
  ['60006', '399'],
  ['60008', '1999'],
]);

const HEADERS = {
  sku: ['sku', 'codigo', 'clave', 'articulo', 'modelo', 'no. parte', 'no parte', 'numero de parte'],
  name: ['descripcion', 'producto', 'nombre', 'description'],
  category: ['categoria', 'category', 'linea'],
  // "map" es el precio minimo que Weber autoriza a publicar, y es el que la
  // marca manda en su lista anual. Viene con el año pegado ("MAP 2026"), asi
  // que se reconoce por prefijo y la lista del año que entre sirve igual.
  price: ['precio', 'precio publico', 'precio venta', 'precio de venta', 'pvp', 'price', 'map'],
  compareAt: ['precio lista', 'precio regular', 'precio anterior', 'compare', 'precio de lista'],
  cost: ['costo', 'cost', 'precio costo'],
  stock: ['stock', 'existencia', 'existencias', 'inventario', 'cantidad'],
} as const;

type Field = keyof typeof HEADERS;

/// Encuentra en que columna quedo cada campo. Devuelve el indice 1-based que
/// usa ExcelJS, o null si esa columna no viene en el archivo.
function mapColumns(headerRow: ExcelJS.Row): Record<Field, number | null> {
  const found: Record<Field, number | null> = {
    sku: null,
    name: null,
    category: null,
    price: null,
    compareAt: null,
    cost: null,
    stock: null,
  };

  headerRow.eachCell((cell, colNumber) => {
    const text = fold(String(cell.value ?? '')).trim();
    if (!text) return;
    for (const field of Object.keys(HEADERS) as Field[]) {
      // Solo se toma la primera columna que coincida: si el archivo trae
      // "Precio" y "Precio con IVA", gana la que aparezca antes.
      if (found[field] !== null) continue;
      if (HEADERS[field].some((candidate) => text === candidate || text.startsWith(candidate))) {
        found[field] = colNumber;
        return;
      }
    }
  });

  return found;
}

/// Convierte "$ 12,499.00 MXN" en 12499.00. Devuelve null si no hay numero.
function parseMoney(value: ExcelJS.CellValue): Prisma.Decimal | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return new Prisma.Decimal(value);

  const raw = typeof value === 'object' && 'result' in value ? value.result : value;
  const digits = String(raw).replace(/[^0-9.-]/g, '');
  if (!digits || Number.isNaN(Number(digits))) return null;
  return new Prisma.Decimal(digits);
}

function parseInteger(value: ExcelJS.CellValue): number | null {
  if (typeof value === 'number') return Math.trunc(value);
  const digits = String(value ?? '').replace(/[^0-9-]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

/// La categoria de la fila, que es lo que clasifica el producto al darlo de alta.
function categoriaDe(row: ExcelJS.Row, columns: Record<Field, number | null>): string | null {
  if (!columns.category) return null;
  const texto = String(row.getCell(columns.category).value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return texto || null;
}

/// Da de alta un producto que esta en la lista de precios y no en el catalogo.
///
/// Reusa el mismo normalizador que el importador de inventario, con la columna
/// de categoria de la lista en lugar de las dos del Excel de inventario. Sale
/// siempre marcado para revisar: la clasificacion viene de menos informacion
/// que la del resto del catalogo y alguien tiene que confirmarla.
async function alta(
  sku: string,
  nombre: string,
  categoria: string | null,
  ids: Awaited<ReturnType<typeof seedCatalogs>>,
): Promise<string> {
  const normalizado = normalizeRow({ sku, name: nombre, categoryD: categoria, categoryE: null });

  // El nombre se redacta con las mismas reglas que el resto del catalogo. Si se
  // dejara el de la lista, el Q1200 que entra por aqui se llamaria "Asador
  // Weber Q1200 NEGRO" al lado de un "Asador Portatil de Gas Weber Q1200,
  // Midnight Black" que es su hermano de otro color.
  const redactado = generarNombre({
    sku,
    name: nombre,
    productTypeSlug: normalizado.productTypeSlug,
    fuelTypeSlug: normalizado.fuelTypeSlug,
    seriesSlug: normalizado.seriesSlug,
    compatibleSeriesSlugs: normalizado.compatibleSeriesSlugs,
    formatSlug: normalizado.formatSlug,
    sizeName: null,
    colorSlug: normalizado.colorSlug,
  });
  const comercial = redactado.nombre.replace(/\s+/g, ' ').trim() || nombre;

  const motivos = ['alta desde la lista de precios, falta confirmar la clasificación'];
  if (normalizado.reviewNote) motivos.push(normalizado.reviewNote);
  for (const nota of redactado.notas) motivos.push(nota);

  /// El slug se desempata con el SKU igual que en el panel: dos productos
  /// pueden llamarse igual de forma legitima hasta que alguien los redacta.
  const base = slugify(comercial);
  const tomado = await prisma.product.findUnique({ where: { slug: base }, select: { id: true } });
  const slug = !base || tomado ? `${base}-${sku.toLowerCase()}` : base;

  const producto = await prisma.product.create({
    data: {
      sku,
      slug,
      name: comercial,
      // La descripcion corta repite el nombre, como en el resto del catalogo:
      // sin ella no se puede publicar y el cliente prefirio no redactarlas.
      shortDescription: comercial,
      status: 'DRAFT',
      brandId: ids.brand,
      productTypeId: ids.productType.get(normalizado.productTypeSlug) ?? null,
      fuelTypeId: normalizado.fuelTypeSlug
        ? (ids.fuelType.get(normalizado.fuelTypeSlug) ?? null)
        : null,
      seriesId: normalizado.seriesSlug ? (ids.series.get(normalizado.seriesSlug) ?? null) : null,
      formatId: normalizado.formatSlug ? (ids.format.get(normalizado.formatSlug) ?? null) : null,
      colorId: normalizado.colorSlug ? (ids.color.get(normalizado.colorSlug) ?? null) : null,
      sizeId: normalizado.sizeSlug ? (ids.size.get(normalizado.sizeSlug) ?? null) : null,
      rawCategory: categoria,
      needsReview: true,
      reviewNote: motivos.join('; '),
      ...deriveSeo(comercial, comercial),
    },
  });

  for (const [index, slugCategoria] of normalizado.categorySlugs.entries()) {
    const categoryId = ids.category.get(slugCategoria);
    if (!categoryId) continue;
    await prisma.productCategory.create({
      data: { productId: producto.id, categoryId, isPrimary: index === 0, position: index },
    });
  }

  for (const slugSerie of normalizado.compatibleSeriesSlugs) {
    const seriesId = ids.series.get(slugSerie);
    if (!seriesId) continue;
    await prisma.productCompatibility.create({ data: { productId: producto.id, seriesId } });
  }

  return producto.id;
}

async function main() {
  const args = process.argv.slice(2);
  const publish = args.includes('--publicar');
  const crear = args.includes('--crear');
  const file = args.find((arg) => !arg.startsWith('--')) ?? DEFAULT_FILE;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`El archivo ${file} no tiene hojas`);

  // El encabezado no siempre esta en la fila 1: los archivos de contabilidad
  // suelen traer titulo y fecha arriba. Se busca la primera fila que tenga
  // una columna de SKU reconocible.
  let headerRowNumber: number | null = null;
  let columns: Record<Field, number | null> | null = null;
  for (let rowNumber = 1; rowNumber <= Math.min(sheet.rowCount, 20); rowNumber += 1) {
    const candidate = mapColumns(sheet.getRow(rowNumber));
    if (candidate.sku !== null && candidate.price !== null) {
      headerRowNumber = rowNumber;
      columns = candidate;
      break;
    }
  }

  if (!headerRowNumber || !columns?.sku || !columns.price) {
    console.error('No se encontro una fila de encabezados con columnas de SKU y precio.');
    console.error('Encabezados reconocidos:');
    for (const [field, names] of Object.entries(HEADERS)) {
      console.error(`  ${field.padEnd(10)} ${names.join(', ')}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Archivo:     ${path.basename(file)}`);
  console.log(`Encabezados: fila ${headerRowNumber}`);
  for (const [field, col] of Object.entries(columns)) {
    if (col !== null) console.log(`  ${field.padEnd(10)} columna ${col}`);
  }

  const skuColumn = columns.sku;
  const priceColumn = columns.price;
  let matched = 0;
  let published = 0;
  const notFound: string[] = [];
  const noPrice: string[] = [];
  const created: string[] = [];
  const ids = crear ? await seedCatalogs(prisma) : null;

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const sku = String(row.getCell(skuColumn).value ?? '').trim();
    if (!sku) continue;

    let product = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
    if (!product && crear && ids) {
      const nombre = columns.name
        ? String(row.getCell(columns.name).value ?? '')
            .replace(/\s+/g, ' ')
            .trim()
        : '';
      if (!nombre) {
        notFound.push(sku);
        continue;
      }
      product = { id: await alta(sku, nombre, categoriaDe(row, columns), ids) };
      created.push(sku);
    }
    if (!product) {
      notFound.push(sku);
      continue;
    }

    const price = parseMoney(row.getCell(priceColumn).value);
    if (price === null || price.lessThanOrEqualTo(0)) {
      noPrice.push(sku);
      continue;
    }

    const data: Prisma.ProductUpdateInput = { price };
    if (columns.compareAt) data.compareAtPrice = parseMoney(row.getCell(columns.compareAt).value);
    if (columns.cost) data.cost = parseMoney(row.getCell(columns.cost).value);
    if (columns.stock) {
      const stock = parseInteger(row.getCell(columns.stock).value);
      if (stock !== null) data.stock = stock;
    }

    // Publicar es opt-in y nunca reactiva algo archivado a proposito.
    if (publish) {
      const current = await prisma.product.findUnique({
        where: { id: product.id },
        select: { status: true },
      });
      if (current?.status === 'DRAFT') {
        data.status = 'ACTIVE';
        published += 1;
      }
    }

    await prisma.product.update({ where: { id: product.id }, data });
    matched += 1;
  }

  // Los precios de palabra van al final y solo donde no hay precio: la lista
  // es la autoridad y nunca se le pasa por encima.
  let dichos = 0;
  for (const [sku, monto] of PRECIOS_DICHOS) {
    const aplicado = await prisma.product.updateMany({
      where: { sku, price: null },
      data: { price: new Prisma.Decimal(monto) },
    });
    dichos += aplicado.count;
  }

  const sinPrecio = await prisma.product.count({ where: { price: null } });

  console.log('\nResumen');
  console.log(`  Precios aplicados:        ${matched}`);
  console.log(`  Productos dados de alta:  ${created.length}${crear ? '' : ' (usa --crear)'}`);
  console.log(`  Precios de palabra:       ${dichos}`);
  if (created.length > 0) console.log(`    ${created.join(', ')}`);
  console.log(`  Publicados:               ${published}${publish ? '' : ' (usa --publicar)'}`);
  console.log(`  SKU sin producto:         ${notFound.length}`);
  if (notFound.length > 0) console.log(`    ${notFound.slice(0, 30).join(', ')}`);
  console.log(`  Filas sin precio valido:  ${noPrice.length}`);
  if (noPrice.length > 0) console.log(`    ${noPrice.slice(0, 30).join(', ')}`);
  console.log(`  Productos aun sin precio: ${sinPrecio}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
