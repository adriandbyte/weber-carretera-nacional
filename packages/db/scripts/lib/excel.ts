// ---------------------------------------------------------------------------
// Lectura del Excel de inventario.
//
// Las imagenes no viven en una celda: son objetos flotantes anclados a un
// rango de filas. ExcelJS expone ese anclaje, asi que se puede recuperar la
// fila de cada imagen y de ahi su SKU. Sin ese anclaje las 302 fotos serian
// un monton de archivos sin dueño.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import type { RawRow } from './normalize.js';

export interface SheetImage {
  /// SKU del producto al que pertenece la imagen.
  sku: string;
  extension: string;
  buffer: Buffer;
}

export interface InventoryFile {
  rows: RawRow[];
  images: SheetImage[];
  /// Filas descartadas por no traer SKU, para poder reportarlas.
  skippedRows: number;
  /// Imagenes en formatos que el navegador no puede mostrar.
  unsupported: { sku: string; extension: string }[];
}

/// Formatos que un navegador puede mostrar. Excel acepta pegar EMF y WMF
/// (metarchivos de Windows), que se ven bien dentro de la hoja pero que
/// ningun navegador sabe dibujar. Importarlos daria un producto con imagen
/// segun la base y un hueco gris en la tienda, que es peor que no tener
/// ninguna: al menos "sin imagen" sale en el filtro y alguien la consigue.
const WEB_FORMATS = ['png', 'jpeg', 'jpg', 'gif', 'webp'];

const HEADER_ROW = 1;
const COL_SKU = 2;
const COL_NAME = 3;
const COL_CATEGORY_D = 4;
const COL_CATEGORY_E = 5;

const cellText = (row: ExcelJS.Row, col: number): string | null => {
  const value = row.getCell(col).value;
  if (value === null || value === undefined) return null;
  // Las celdas con formula devuelven { result }, las de texto enriquecido
  // devuelven { richText: [...] }.
  if (typeof value === 'object') {
    if ('result' in value) return String(value.result ?? '').trim() || null;
    if ('richText' in value) {
      return value.richText.map((part) => part.text).join('').trim() || null;
    }
    if ('text' in value) return String(value.text).trim() || null;
  }
  return String(value).trim() || null;
};

export async function readInventory(filePath: string): Promise<InventoryFile> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error(`El archivo ${filePath} no tiene hojas`);

  const rows: RawRow[] = [];
  /// Indice fila de Excel -> SKU, para resolver el anclaje de las imagenes.
  const skuByRow = new Map<number, string>();
  let skippedRows = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= HEADER_ROW) return;

    const sku = cellText(row, COL_SKU);
    const name = cellText(row, COL_NAME);
    if (!sku || !name) {
      if (sku || name) skippedRows += 1;
      return;
    }

    rows.push({
      sku,
      name,
      categoryD: cellText(row, COL_CATEGORY_D),
      categoryE: cellText(row, COL_CATEGORY_E),
    });
    skuByRow.set(rowNumber, sku);
  });

  const images: SheetImage[] = [];
  const unsupported: { sku: string; extension: string }[] = [];
  for (const anchored of sheet.getImages()) {
    // range.tl.nativeRow es 0-based y apunta a la esquina superior de la
    // imagen; las filas de ExcelJS son 1-based.
    const rowNumber = Math.round(anchored.range.tl.nativeRow) + 1;
    const sku = skuByRow.get(rowNumber);
    if (!sku) continue;

    const media = workbook.getImage(Number(anchored.imageId));
    if (!media?.buffer) continue;

    const extension = (media.extension ?? 'png').toLowerCase();
    if (!WEB_FORMATS.includes(extension)) {
      unsupported.push({ sku, extension });
      continue;
    }

    images.push({
      sku,
      extension,
      buffer: Buffer.from(media.buffer as ArrayBuffer),
    });
  }

  return { rows, images, skippedRows, unsupported };
}
