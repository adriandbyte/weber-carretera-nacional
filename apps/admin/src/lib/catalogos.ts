// ---------------------------------------------------------------------------
// Registro de los catalogos editables.
//
// Los siete comparten forma (slug, nombre, orden, activo) y solo cambian en
// dos cosas: en que tabla viven y como se cuenta cuantos productos los usan.
// Ese es exactamente el contenido de este archivo, y por eso hay una sola
// pantalla de catalogo en lugar de siete casi iguales.
//
// Agregar un catalogo nuevo es agregar una entrada aqui.
// ---------------------------------------------------------------------------

import { prisma } from '@weber/db';

export interface CatalogRow {
  id: string;
  slug: string;
  name: string;
  position: number;
  active: boolean;
  hex?: string | null;
  /// Cuantos productos quedarian sin este valor si se borrara.
  usage: number;
}

export interface CatalogConfig {
  /// Como se llama en la URL del panel.
  key: string;
  label: string;
  /// Para los mensajes: "Se eliminó el color".
  singular: string;
  description: string;
  /// Los colores llevan muestra; el resto no.
  hasHex?: boolean;
  list(): Promise<CatalogRow[]>;
  create(data: { slug: string; name: string; position: number; hex: string | null }): Promise<void>;
  update(
    id: string,
    data: { slug: string; name: string; position: number; active: boolean; hex: string | null },
  ): Promise<void>;
  remove(id: string): Promise<void>;
}

/// Cuenta de uso para los catalogos que cuelgan de una columna de Product.
const countByColumn = (column: 'productTypeId' | 'fuelTypeId' | 'formatId' | 'colorId' | 'sizeId') =>
  async (id: string) => prisma.product.count({ where: { [column]: id } });

export const CATALOGS: Record<string, CatalogConfig> = {
  tipos: {
    key: 'tipos',
    label: 'Tipos de producto',
    singular: 'tipo de producto',
    description: 'Qué es el producto: asador, ahumador, plancha, accesorio.',
    async list() {
      const rows = await prisma.productType.findMany({ orderBy: { position: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({ ...row, usage: await countByColumn('productTypeId')(row.id) })),
      );
    },
    async create(data) {
      await prisma.productType.create({ data: { slug: data.slug, name: data.name, position: data.position } });
    },
    async update(id, data) {
      await prisma.productType.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.productType.delete({ where: { id } });
    },
  },

  combustibles: {
    key: 'combustibles',
    label: 'Combustibles',
    singular: 'combustible',
    description: 'Con qué funciona: carbón, gas, eléctrico, pellet.',
    async list() {
      const rows = await prisma.fuelType.findMany({ orderBy: { position: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({ ...row, usage: await countByColumn('fuelTypeId')(row.id) })),
      );
    },
    async create(data) {
      await prisma.fuelType.create({ data: { slug: data.slug, name: data.name, position: data.position } });
    },
    async update(id, data) {
      await prisma.fuelType.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.fuelType.delete({ where: { id } });
    },
  },

  series: {
    key: 'series',
    label: 'Series',
    singular: 'serie',
    description: 'Línea de producto: Spirit, Genesis, Summit, Q, Traveler.',
    async list() {
      const rows = await prisma.series.findMany({ orderBy: { name: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          // Una serie se usa de dos formas: como serie propia de un asador y
          // como compatibilidad declarada por un accesorio. Las dos cuentan.
          usage:
            (await prisma.product.count({ where: { seriesId: row.id } })) +
            (await prisma.productCompatibility.count({ where: { seriesId: row.id } })),
        })),
      );
    },
    async create(data) {
      await prisma.series.create({ data: { slug: data.slug, name: data.name, position: data.position } });
    },
    async update(id, data) {
      await prisma.series.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.series.delete({ where: { id } });
    },
  },

  formatos: {
    key: 'formatos',
    label: 'Formatos',
    singular: 'formato',
    description: 'Cómo se instala o transporta: portátil, empotrable, de carro.',
    async list() {
      const rows = await prisma.format.findMany({ orderBy: { position: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({ ...row, usage: await countByColumn('formatId')(row.id) })),
      );
    },
    async create(data) {
      await prisma.format.create({ data: { slug: data.slug, name: data.name, position: data.position } });
    },
    async update(id, data) {
      await prisma.format.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.format.delete({ where: { id } });
    },
  },

  colores: {
    key: 'colores',
    label: 'Colores',
    singular: 'color',
    description: 'Color del producto. La muestra se ve en la tienda.',
    hasHex: true,
    async list() {
      const rows = await prisma.color.findMany({ orderBy: { name: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({ ...row, usage: await countByColumn('colorId')(row.id) })),
      );
    },
    async create(data) {
      await prisma.color.create({
        data: { slug: data.slug, name: data.name, position: data.position, hex: data.hex },
      });
    },
    async update(id, data) {
      await prisma.color.update({
        where: { id },
        data: {
          slug: data.slug,
          name: data.name,
          position: data.position,
          active: data.active,
          hex: data.hex,
        },
      });
    },
    async remove(id) {
      await prisma.color.delete({ where: { id } });
    },
  },

  tamanos: {
    key: 'tamanos',
    label: 'Tamaños',
    singular: 'tamaño',
    description: 'Medida del asador en pulgadas.',
    async list() {
      const rows = await prisma.sizeOption.findMany({ orderBy: { position: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          position: row.position,
          active: row.active,
          usage: await countByColumn('sizeId')(row.id),
        })),
      );
    },
    async create(data) {
      await prisma.sizeOption.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
    },
    async update(id, data) {
      await prisma.sizeOption.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.sizeOption.delete({ where: { id } });
    },
  },

  categorias: {
    key: 'categorias',
    label: 'Categorías',
    singular: 'categoría',
    description: 'Las secciones del menú de la tienda.',
    async list() {
      const rows = await prisma.category.findMany({ orderBy: { position: 'asc' } });
      return Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          position: row.position,
          active: row.active,
          usage: await prisma.productCategory.count({ where: { categoryId: row.id } }),
        })),
      );
    },
    async create(data) {
      await prisma.category.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
    },
    async update(id, data) {
      await prisma.category.update({
        where: { id },
        data: { slug: data.slug, name: data.name, position: data.position, active: data.active },
      });
    },
    async remove(id) {
      await prisma.category.delete({ where: { id } });
    },
  },
};

export const CATALOG_KEYS = Object.keys(CATALOGS);
