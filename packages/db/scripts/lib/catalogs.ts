// ---------------------------------------------------------------------------
// Siembra de los catalogos que alimentan los dropdowns del admin.
//
// Todo se hace con upsert por slug, asi que correr el importador dos veces
// no duplica nada ni pisa lo que el admin ya haya editado a mano mas alla
// del nombre y la posicion.
// ---------------------------------------------------------------------------

import type { PrismaClient } from '../../src/generated/prisma/client';
import { CATEGORIES, COLORS, FORMATS, FUEL_TYPES, PRODUCT_TYPES, SERIES, SIZES } from './normalize.js';

export interface CatalogIds {
  brand: string;
  productType: Map<string, string>;
  fuelType: Map<string, string>;
  series: Map<string, string>;
  format: Map<string, string>;
  color: Map<string, string>;
  size: Map<string, string>;
  category: Map<string, string>;
}

export async function seedCatalogs(prisma: PrismaClient): Promise<CatalogIds> {
  const brand = await prisma.brand.upsert({
    where: { slug: 'weber' },
    update: {},
    create: { slug: 'weber', name: 'Weber', position: 0 },
  });

  const productType = new Map<string, string>();
  for (const [index, item] of PRODUCT_TYPES.entries()) {
    const row = await prisma.productType.upsert({
      where: { slug: item.slug },
      update: { name: item.name, position: index },
      create: { slug: item.slug, name: item.name, position: index },
    });
    productType.set(item.slug, row.id);
  }

  const fuelType = new Map<string, string>();
  for (const [index, item] of FUEL_TYPES.entries()) {
    const row = await prisma.fuelType.upsert({
      where: { slug: item.slug },
      update: { name: item.name, position: index },
      create: { slug: item.slug, name: item.name, position: index },
    });
    fuelType.set(item.slug, row.id);
  }

  const series = new Map<string, string>();
  for (const [index, item] of SERIES.entries()) {
    const row = await prisma.series.upsert({
      where: { slug: item.slug },
      update: { name: item.name, position: index },
      create: { slug: item.slug, name: item.name, position: index },
    });
    series.set(item.slug, row.id);
  }

  const format = new Map<string, string>();
  for (const [index, item] of FORMATS.entries()) {
    const row = await prisma.format.upsert({
      where: { slug: item.slug },
      update: { name: item.name, position: index },
      create: { slug: item.slug, name: item.name, position: index },
    });
    format.set(item.slug, row.id);
  }

  const color = new Map<string, string>();
  for (const [index, item] of COLORS.entries()) {
    const row = await prisma.color.upsert({
      where: { slug: item.slug },
      update: { name: item.name, hex: item.hex, position: index },
      create: { slug: item.slug, name: item.name, hex: item.hex, position: index },
    });
    color.set(item.slug, row.id);
  }

  const size = new Map<string, string>();
  for (const [index, item] of SIZES.entries()) {
    const row = await prisma.sizeOption.upsert({
      where: { slug: item.slug },
      update: { name: item.name, inches: item.inches, position: index },
      create: { slug: item.slug, name: item.name, inches: item.inches, position: index },
    });
    size.set(item.slug, row.id);
  }

  const category = new Map<string, string>();
  for (const [index, item] of CATEGORIES.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: item.slug },
      update: { name: item.name, description: item.description, position: index },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        position: index,
        metaTitle: `${item.name} | Asadores Weber`,
        metaDescription: item.description,
      },
    });
    category.set(item.slug, row.id);
  }

  return { brand: brand.id, productType, fuelType, series, format, color, size, category };
}
