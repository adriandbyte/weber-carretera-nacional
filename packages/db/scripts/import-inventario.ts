// ---------------------------------------------------------------------------
// Importa "Base de Datos Inventario.xlsx" a la base de datos.
//
//   pnpm import:inventario                    usa el archivo por defecto
//   pnpm import:inventario -- ruta/al.xlsx    usa otro archivo
//
// Es idempotente: se puede correr las veces que haga falta. Los productos se
// insertan como borrador porque el Excel no trae precio ni descripcion, asi
// que nada aparece en la tienda hasta que alguien lo revise y lo publique.
//
// Lo que respeta al reimportar:
//   - no pisa precio, stock, descripcion ni estado de un producto existente
//   - no duplica imagenes: la ruta lleva el hash del contenido
//   - no borra productos que ya no esten en el Excel, solo los reporta
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { readInventory } from './lib/excel.js';
import { normalizeRow } from './lib/normalize.js';
import { seedCatalogs } from './lib/catalogs.js';
import {
  contentTypeFor,
  createImageStore,
  imageKey,
  isInStore,
  readDimensions,
} from './lib/images.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '../../..');
const DEFAULT_FILE = path.join(REPO_ROOT, 'data/fuentes/Base de Datos Inventario.xlsx');
const LOCAL_IMAGE_ROOT = path.join(REPO_ROOT, 'data/imagenes');

const prisma = new PrismaClient();

async function main() {
  const file = process.argv[2] ?? DEFAULT_FILE;
  console.log(`Leyendo ${path.basename(file)}`);

  const { rows, images, skippedRows, unsupported } = await readInventory(file);
  const products = rows.map(normalizeRow);
  console.log(`  ${rows.length} productos, ${images.length} imagenes, ${skippedRows} filas sin SKU`);
  if (unsupported.length > 0) {
    console.log(
      `  ${unsupported.length} imagenes ignoradas por formato no soportado en navegador ` +
        `(${unsupported.map((u) => `${u.sku}:${u.extension}`).join(', ')})`,
    );
  }

  console.log('Sembrando catalogos');
  const ids = await seedCatalogs(prisma);

  // --- Productos ---------------------------------------------------------
  console.log('Importando productos');
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const existing = await prisma.product.findUnique({ where: { sku: product.sku } });

    /// Atributos derivados del Excel. Se refrescan siempre, porque son
    /// consecuencia del archivo fuente y no del trabajo del admin.
    const derived = {
      brandId: ids.brand,
      productTypeId: ids.productType.get(product.productTypeSlug) ?? null,
      fuelTypeId: product.fuelTypeSlug ? (ids.fuelType.get(product.fuelTypeSlug) ?? null) : null,
      seriesId: product.seriesSlug ? (ids.series.get(product.seriesSlug) ?? null) : null,
      formatId: product.formatSlug ? (ids.format.get(product.formatSlug) ?? null) : null,
      colorId: product.colorSlug ? (ids.color.get(product.colorSlug) ?? null) : null,
      sizeId: product.sizeSlug ? (ids.size.get(product.sizeSlug) ?? null) : null,
      rawCategory: product.rawCategory,
      rawSubcategory: product.rawSubcategory,
      needsReview: product.needsReview,
      reviewNote: product.reviewNote,
    };

    const record = await prisma.product.upsert({
      where: { sku: product.sku },
      // Al reimportar solo se tocan los atributos derivados. El nombre no,
      // porque el admin seguramente ya lo redacto para la tienda.
      update: derived,
      create: {
        sku: product.sku,
        slug: product.slug,
        name: product.name,
        status: product.status,
        metaTitle: `${product.name} | Weber`,
        ...derived,
      },
    });
    if (existing) updated += 1;
    else created += 1;

    // --- Categorias ------------------------------------------------------
    await prisma.productCategory.deleteMany({ where: { productId: record.id } });
    for (const [index, slug] of product.categorySlugs.entries()) {
      const categoryId = ids.category.get(slug);
      if (!categoryId) continue;
      await prisma.productCategory.create({
        data: { productId: record.id, categoryId, isPrimary: index === 0, position: index },
      });
    }

    // --- Compatibilidad de accesorios ------------------------------------
    await prisma.productCompatibility.deleteMany({ where: { productId: record.id } });
    for (const slug of product.compatibleSeriesSlugs) {
      const seriesId = ids.series.get(slug);
      if (!seriesId) continue;
      await prisma.productCompatibility.create({ data: { productId: record.id, seriesId } });
    }
  }

  console.log(`  ${created} creados, ${updated} actualizados`);

  // --- Imagenes ----------------------------------------------------------
  const store = createImageStore(LOCAL_IMAGE_ROOT);
  console.log(
    store.kind === 'blob'
      ? 'Subiendo imagenes a Vercel Blob'
      : `Guardando imagenes en ${path.relative(REPO_ROOT, LOCAL_IMAGE_ROOT)} (sin BLOB_READ_WRITE_TOKEN)`,
  );

  const bySku = new Map<string, typeof images>();
  for (const image of images) {
    bySku.set(image.sku, [...(bySku.get(image.sku) ?? []), image]);
  }

  let savedImages = 0;
  let reusedImages = 0;
  let movedImages = 0;

  for (const [sku, group] of bySku) {
    const product = await prisma.product.findUnique({
      where: { sku },
      select: { id: true, name: true },
    });
    if (!product) continue;

    for (const [index, image] of group.entries()) {
      const key = imageKey(sku, image.buffer, image.extension, index);

      // El key lleva el hash del contenido, asi que una coincidencia es
      // literalmente el mismo archivo.
      const already = await prisma.productImage.findFirst({
        where: { productId: product.id, blobPath: key },
      });

      // Pero coincidir no basta: hay que comprobar que viva en el
      // almacenamiento que se esta usando ahora, y que tenga sus medidas
      // guardadas. Ver isInStore y readDimensions.
      if (already !== null && isInStore(already.url, store.kind) && already.width !== null) {
        reusedImages += 1;
        continue;
      }

      const size = await readDimensions(image.buffer);

      const stored = await store.save(key, image.buffer, contentTypeFor(image.extension));

      if (already) {
        // Migracion entre almacenamientos: se actualiza el registro que ya
        // existe en lugar de crear uno nuevo, que dejaria el producto con la
        // misma foto dos veces.
        await prisma.productImage.update({
          where: { id: already.id },
          data: { url: stored.url, blobPath: stored.blobPath, ...size },
        });
        movedImages += 1;
        continue;
      }

      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: stored.url,
          blobPath: stored.blobPath,
          alt: product.name,
          position: index,
          isPrimary: index === 0,
          ...size,
        },
      });
      savedImages += 1;
    }
  }

  console.log(
    `  ${savedImages} imagenes nuevas, ${reusedImages} ya existentes` +
      (movedImages > 0 ? `, ${movedImages} movidas a ${store.kind === 'blob' ? 'la nube' : 'disco'}` : ''),
  );

  // --- Reporte final -----------------------------------------------------
  const sinImagen = products.filter((p) => !bySku.has(p.sku));
  const enExcel = new Set(products.map((p) => p.sku));
  const huerfanos = await prisma.product.findMany({
    where: { sku: { notIn: [...enExcel] } },
    select: { sku: true, name: true },
  });

  console.log('\nResumen');
  console.log(`  Productos en la base:        ${created + updated}`);
  console.log(`  Requieren revision:          ${products.filter((p) => p.needsReview).length}`);
  console.log(`  Sin imagen:                  ${sinImagen.length}`);
  if (sinImagen.length > 0) {
    console.log(`    ${sinImagen.map((p) => p.sku).join(', ')}`);
  }
  console.log(`  En la base pero no en Excel: ${huerfanos.length}`);
  for (const orphan of huerfanos) {
    console.log(`    ${orphan.sku}  ${orphan.name}`);
  }
  console.log('\nTodos entran como borrador. Publicalos desde el admin cuando tengan precio.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
