// ---------------------------------------------------------------------------
// Dry-run del importador: lee el Excel, normaliza y reporta el resultado
// sin tocar la base de datos. Sirve para revisar la calidad de la
// normalizacion antes de escribir, y para auditarla despues de ajustar
// cualquier patron en normalize.ts.
//
//   pnpm --filter @weber/db exec tsx scripts/analyze-inventario.ts
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readInventory } from './lib/excel.js';
import { normalizeRow, type NormalizedProduct } from './lib/normalize.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_FILE = path.resolve(here, '../../../data/fuentes/Base de Datos Inventario.xlsx');

function tally(items: NormalizedProduct[], pick: (p: NormalizedProduct) => string | null) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = pick(item) ?? '(sin valor)';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printTally(title: string, entries: [string, number][]) {
  console.log(`\n--- ${title} ---`);
  for (const [key, count] of entries) {
    console.log(`${String(count).padStart(4)}  ${key}`);
  }
}

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  const { rows, images, skippedRows } = await readInventory(file);
  const products = rows.map(normalizeRow);

  console.log(`Archivo:            ${path.basename(file)}`);
  console.log(`Filas con producto: ${rows.length}`);
  console.log(`Filas descartadas:  ${skippedRows}`);
  console.log(`Imagenes ancladas:  ${images.length}`);

  const skusConImagen = new Set(images.map((i) => i.sku));
  console.log(`SKUs con imagen:    ${skusConImagen.size} de ${rows.length}`);

  printTally('Tipo de producto', tally(products, (p) => p.productTypeSlug));
  printTally('Combustible', tally(products, (p) => p.fuelTypeSlug));
  printTally('Serie', tally(products, (p) => p.seriesSlug));
  printTally('Formato', tally(products, (p) => p.formatSlug));
  printTally('Color', tally(products, (p) => p.colorSlug));
  printTally('Tamano', tally(products, (p) => p.sizeSlug));
  printTally('Categoria primaria', tally(products, (p) => p.categorySlugs[0] ?? null));

  // --- Integridad --------------------------------------------------------
  const bySku = new Map<string, NormalizedProduct[]>();
  const bySlug = new Map<string, NormalizedProduct[]>();
  for (const p of products) {
    bySku.set(p.sku, [...(bySku.get(p.sku) ?? []), p]);
    bySlug.set(p.slug, [...(bySlug.get(p.slug) ?? []), p]);
  }
  const dupSku = [...bySku.entries()].filter(([, v]) => v.length > 1);
  const dupSlug = [...bySlug.entries()].filter(([, v]) => v.length > 1);

  console.log(`\n--- Integridad ---`);
  console.log(`SKUs duplicados:  ${dupSku.length}`);
  for (const [sku, items] of dupSku) {
    console.log(`  ${sku}: ${items.map((i) => i.name).join(' | ')}`);
  }
  console.log(`Slugs duplicados: ${dupSlug.length}`);
  for (const [slug, items] of dupSlug) {
    console.log(`  ${slug}: ${items.map((i) => i.sku).join(', ')}`);
  }

  const review = products.filter((p) => p.needsReview);
  console.log(`\n--- Requieren revision: ${review.length} de ${products.length} ---`);
  const noteCounts = new Map<string, number>();
  for (const p of review) {
    for (const note of (p.reviewNote ?? '').split('; ')) {
      noteCounts.set(note, (noteCounts.get(note) ?? 0) + 1);
    }
  }
  for (const [note, count] of [...noteCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(count).padStart(4)}  ${note}`);
  }

  // Muestra de asadores para revisar la calidad a ojo.
  console.log(`\n--- Muestra de equipos ---`);
  for (const p of products.filter((x) => x.productTypeSlug !== 'accesorio').slice(0, 25)) {
    console.log(
      [
        p.sku.padEnd(9),
        (p.seriesSlug ?? '-').padEnd(16),
        (p.fuelTypeSlug ?? '-').padEnd(10),
        (p.formatSlug ?? '-').padEnd(11),
        (p.colorSlug ?? '-').padEnd(17),
        (p.sizeSlug ?? '-').padEnd(14),
        p.categorySlugs.join('+').padEnd(20),
        p.name.slice(0, 42),
      ].join(' '),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
