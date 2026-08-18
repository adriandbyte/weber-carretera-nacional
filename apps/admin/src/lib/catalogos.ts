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
  /// Siempre presente: el indice cuenta cuantas opciones tiene cada lista.
  list(): Promise<CatalogRow[]>;

  // Las tres escrituras faltan cuando la lista tiene su propia pantalla, que
  // hoy es el caso de Categorias: no es solo un desplegable, es una pagina de
  // la tienda con texto, imagen y etiquetas para buscadores, y eso no cabe en
  // la tabla generica. Su ruta estatica gana sobre /catalogos/[tipo], asi que
  // estas funciones nunca se llamarian y dejarlas escritas seria codigo muerto
  // que ademas sabe menos que la pantalla de verdad.
  create?(data: {
    slug: string;
    name: string;
    position: number;
    hex: string | null;
  }): Promise<void>;
  update?(
    id: string,
    data: { slug: string; name: string; position: number; active: boolean; hex: string | null },
  ): Promise<void>;
  remove?(id: string): Promise<void>;
}

type UsageColumn = 'productTypeId' | 'fuelTypeId' | 'seriesId' | 'formatId' | 'colorId' | 'sizeId';

/// Cuantos productos usan cada valor, en una sola consulta.
///
/// Antes se contaba fila por fila: abrir Colores lanzaba catorce count() y
/// Series treinta y cuatro, todos en paralelo. Ademas de lento, esa rafaga de
/// consultas simultaneas es la clase de carga que hace tropezar al Postgres
/// local. Un GROUP BY responde lo mismo de una vez.
async function usageByColumn(column: UsageColumn): Promise<Map<string, number>> {
  const rows = await prisma.product.groupBy({ by: [column], _count: { _all: true } });
  const usage = new Map<string, number>();
  for (const row of rows) {
    const id = row[column];
    // Los productos sin ese atributo se agrupan bajo null y no cuentan.
    if (id !== null) usage.set(id, row._count._all);
  }
  return usage;
}

/// Las dos tablas de union se cuentan igual, pero cada una por su lado: un
/// helper generico sobre ambas obligaria a castear la fila y perderia justo la
/// comprobacion de que la columna existe.
async function usageByCategory(): Promise<Map<string, number>> {
  const rows = await prisma.productCategory.groupBy({
    by: ['categoryId'],
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.categoryId, row._count._all]));
}

async function usageByCompatibleSeries(): Promise<Map<string, number>> {
  const rows = await prisma.productCompatibility.groupBy({
    by: ['seriesId'],
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.seriesId, row._count._all]));
}

export const CATALOGS: Record<string, CatalogConfig> = {
  tipos: {
    key: 'tipos',
    label: 'Tipos de producto',
    singular: 'tipo de producto',
    description: 'Qué es el producto: asador, ahumador, plancha, accesorio.',
    async list() {
      const [rows, usage] = await Promise.all([
        prisma.productType.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByColumn('productTypeId'),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
    },
    async create(data) {
      await prisma.productType.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
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
      const [rows, usage] = await Promise.all([
        prisma.fuelType.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByColumn('fuelTypeId'),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
    },
    async create(data) {
      await prisma.fuelType.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
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
      // Una serie se usa de dos formas: como serie propia de un asador y como
      // compatibilidad declarada por un accesorio. Las dos cuentan.
      const [rows, propios, compatibles] = await Promise.all([
        prisma.series.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByColumn('seriesId'),
        usageByCompatibleSeries(),
      ]);
      return rows.map((row) => ({
        ...row,
        usage: (propios.get(row.id) ?? 0) + (compatibles.get(row.id) ?? 0),
      }));
    },
    async create(data) {
      await prisma.series.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
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
      const [rows, usage] = await Promise.all([
        prisma.format.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByColumn('formatId'),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
    },
    async create(data) {
      await prisma.format.create({
        data: { slug: data.slug, name: data.name, position: data.position },
      });
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
      const [rows, usage] = await Promise.all([
        prisma.color.findMany({
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true, hex: true },
        }),
        usageByColumn('colorId'),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
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
      // Se seleccionan los campos uno a uno y no con spread: SizeOption lleva
      // `inches` como Decimal, que no cruza a un componente de cliente.
      const [rows, usage] = await Promise.all([
        prisma.sizeOption.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByColumn('sizeId'),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
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
      const [rows, usage] = await Promise.all([
        prisma.category.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, slug: true, name: true, position: true, active: true },
        }),
        usageByCategory(),
      ]);
      return rows.map((row) => ({ ...row, usage: usage.get(row.id) ?? 0 }));
    },
  },
};

export const CATALOG_KEYS = Object.keys(CATALOGS);
