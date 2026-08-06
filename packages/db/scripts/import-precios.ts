// ---------------------------------------------------------------------------
// Importa una lista de precios y la cruza con el inventario por SKU.
//
//   pnpm import:precios -- ruta/a/lista-precios.xlsx
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
//   Precio   precio, precio publico, precio venta, pvp, price, precio lista
//   Lista    precio lista, precio regular, precio anterior, compare
//   Costo    costo, cost
//   Stock    stock, existencia, inventario, cantidad
//
// Nada se publica solo. Un producto pasa de borrador a activo unicamente
// con --publicar, y aun asi solo si quedo con precio mayor a cero.
// ---------------------------------------------------------------------------

import path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaClient, Prisma } from '@prisma/client';
import { fold } from './lib/normalize.js';

const prisma = new PrismaClient();

const HEADERS = {
  sku: ['sku', 'codigo', 'clave', 'articulo', 'modelo', 'no. parte', 'no parte', 'numero de parte'],
  price: ['precio', 'precio publico', 'precio venta', 'precio de venta', 'pvp', 'price'],
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

async function main() {
  const args = process.argv.slice(2);
  const publish = args.includes('--publicar');
  const file = args.find((arg) => !arg.startsWith('--'));

  if (!file) {
    console.error('Falta la ruta del archivo.');
    console.error('  pnpm import:precios -- data/fuentes/lista-precios.xlsx [--publicar]');
    process.exitCode = 1;
    return;
  }

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

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const sku = String(row.getCell(skuColumn).value ?? '').trim();
    if (!sku) continue;

    const product = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
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

  const sinPrecio = await prisma.product.count({ where: { price: null } });

  console.log('\nResumen');
  console.log(`  Precios aplicados:        ${matched}`);
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
