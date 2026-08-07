// ---------------------------------------------------------------------------
// Normalizacion del inventario.
//
// El Excel guarda cuatro dimensiones aplastadas en texto libre:
//
//   Categoria  (col D)  "GAS Spirit"        -> combustible + serie
//   Categoria  (col E)  "Gas - Portatil"    -> combustible + formato
//   Producto   (col C)  'Asador Spirit E325 LP Negro 22"'
//                                           -> serie + color + tamano
//
// Este modulo las separa. Cada funcion devuelve el slug del catalogo, o null
// cuando el dato simplemente no aplica (un sazonador no tiene combustible).
// Cuando algo no se puede decidir con confianza se marca para revision en
// lugar de adivinar: el admin lo corrige una vez y queda.
// ---------------------------------------------------------------------------

export interface RawRow {
  sku: string;
  name: string;
  categoryD: string | null;
  categoryE: string | null;
}

export interface NormalizedProduct {
  sku: string;
  name: string;
  slug: string;
  productTypeSlug: string;
  fuelTypeSlug: string | null;
  seriesSlug: string | null;
  /// Solo para accesorios: series con las que el producto es compatible.
  compatibleSeriesSlugs: string[];
  formatSlug: string | null;
  colorSlug: string | null;
  sizeSlug: string | null;
  categorySlugs: string[];
  status: 'DRAFT' | 'DISCONTINUED';
  needsReview: boolean;
  reviewNote: string | null;
  rawCategory: string | null;
  rawSubcategory: string | null;
}

const clean = (v: string | null | undefined): string => (v ?? '').replace(/\s+/g, ' ').trim();

/// Quita acentos y simbolos para poder comparar sin sorpresas.
/// "Génesis" y "Genesis" deben caer en la misma serie.
export function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/// Tiene que producir exactamente lo mismo que slugify de @weber/core.
///
/// Esta duplicada porque @weber/core ya depende de @weber/db, y hacer que el
/// importador importe de core cerraria el ciclo entre los dos paquetes. Para
/// que las dos copias no se separen hay una prueba que las compara sobre los
/// nombres reales del catalogo: si alguien toca una y no la otra, falla.
///
/// Antes cortaba a 80 y la de core a 120, asi que el importador dejaba slugs
/// truncados que el panel recalculaba distintos al primer guardado.
export function slugify(value: string): string {
  return fold(value)
    .replace(/["'®™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

// --- Tipo de producto ------------------------------------------------------

/// Tipos que son equipo propiamente dicho. El resto son cosas que acompañan
/// al equipo, y varias reglas de normalizacion cambian segun de cual se trate.
export const EQUIPMENT_TYPES = ['asador', 'ahumador', 'plancha'];

export const PRODUCT_TYPES = [
  { slug: 'asador', name: 'Asador' },
  { slug: 'ahumador', name: 'Ahumador' },
  { slug: 'plancha', name: 'Plancha' },
  { slug: 'accesorio', name: 'Accesorio' },
  { slug: 'combustible', name: 'Combustible' },
  { slug: 'sazonador', name: 'Sazonador' },
  { slug: 'paquete', name: 'Paquete' },
] as const;

export function resolveProductType(row: RawRow): string {
  const d = fold(clean(row.categoryD));
  const e = fold(clean(row.categoryE));
  const name = fold(row.name);

  if (d.includes('sazonador')) return 'sazonador';
  if (d.includes('bundle')) return 'paquete';
  if (d.includes('consumable') || d.includes('fuel')) return 'combustible';
  // Las columnas de categoria mandan sobre el nombre. Un nombre que menciona
  // un tipo de equipo casi siempre es un accesorio PARA ese equipo:
  // "Caja para Ahumador" es una caja de astillas, no un ahumador, igual que
  // "Funda para plancha" no es una plancha.
  if (e.includes('ahumador')) return 'ahumador';
  if (d.includes('griddle') || e.includes('plancha')) return 'plancha';
  if (d.includes('accesorio') || e.includes('accesorio')) return 'accesorio';

  // Ya sin columnas que consultar, el nombre es lo unico que queda.
  if (name.includes('ahumador') || name.includes('smoker')) return 'ahumador';
  return 'asador';
}

// --- Combustible -----------------------------------------------------------

export const FUEL_TYPES = [
  { slug: 'carbon', name: 'Carbón' },
  { slug: 'gas', name: 'Gas' },
  { slug: 'electrico', name: 'Eléctrico' },
  { slug: 'pellet', name: 'Pellet' },
] as const;

export function resolveFuelType(row: RawRow, productType: string): string | null {
  // Accesorios, sazonadores y paquetes no queman nada.
  if (['accesorio', 'sazonador', 'paquete'].includes(productType)) return null;

  const haystack = `${fold(clean(row.categoryD))} ${fold(clean(row.categoryE))}`;

  if (haystack.includes('pellet')) return 'pellet';
  if (haystack.includes('charcoal') || haystack.includes('carbon')) return 'carbon';
  if (haystack.includes('electric')) return 'electrico';
  if (haystack.includes('gas') || haystack.includes('griddle')) return 'gas';

  // El combustible en bolsa (briquetas, trozos) es de carbon salvo que
  // el nombre diga otra cosa.
  if (productType === 'combustible') {
    const name = fold(row.name);
    if (name.includes('pellet')) return 'pellet';
    if (name.includes('carbon') || name.includes('briqueta')) return 'carbon';
    return null;
  }

  return null;
}

// --- Serie -----------------------------------------------------------------
//
// El orden importa: los patrones mas especificos van primero para que
// "Master-Touch Premium" no caiga en "Kettle" y "Smokey Mountain" no se
// confunda con "Smokey Joe".

interface SeriesDef {
  slug: string;
  name: string;
  patterns: string[];
}

export const SERIES: SeriesDef[] = [
  { slug: 'spirit', name: 'Spirit', patterns: ['spirit'] },
  { slug: 'genesis', name: 'Genesis', patterns: ['genesis'] },
  { slug: 'summit', name: 'Summit', patterns: ['summit'] },
  { slug: 'searwood', name: 'Searwood', patterns: ['searwood'] },
  { slug: 'lumin', name: 'Lumin', patterns: ['lumin'] },
  { slug: 'traveler', name: 'Traveler', patterns: ['traveler'] },
  { slug: 'smokey-mountain', name: 'Smokey Mountain', patterns: ['smokey mountain'] },
  { slug: 'smokey-joe', name: 'Smokey Joe', patterns: ['smokey joe'] },
  { slug: 'jumbo-joe', name: 'Jumbo Joe', patterns: ['jumbo joe'] },
  { slug: 'go-anywhere', name: 'Go-Anywhere', patterns: ['go-anywhere', 'go anywhere'] },
  { slug: 'master-touch', name: 'Master-Touch', patterns: ['master-touch', 'master touch'] },
  { slug: 'performer', name: 'Performer', patterns: ['performer'] },
  { slug: 'ranch-kettle', name: 'Ranch Kettle', patterns: ['ranch kettle'] },
  {
    slug: 'original-kettle',
    name: 'Original Kettle',
    patterns: ['original kettle', 'orig kettle'],
  },
  { slug: 'compact', name: 'Compact', patterns: ['compact'] },
  { slug: 'kamado', name: 'Kamado', patterns: ['kamado'] },
  { slug: 'q', name: 'Q', patterns: [] }, // se detecta aparte, ver abajo
];

/// Todas las series mencionadas en el texto, en orden de aparicion en SERIES.
/// Una funda puede decir "compatible con Spirit y Genesis", y ahi las dos
/// menciones importan.
export function findSeries(row: RawRow): string[] {
  const name = fold(row.name);
  const d = fold(clean(row.categoryD));
  const found: string[] = [];

  for (const serie of SERIES) {
    if (serie.patterns.some((p) => name.includes(p) || d.includes(p))) found.push(serie.slug);
  }

  // La serie Q se llama con una sola letra, asi que buscarla como subcadena
  // daria falsos positivos en cualquier palabra. Se exige limite de palabra.
  if (/\bq\s?\d{3,4}\b/.test(name) || /\bweber q\b/.test(name) || /\bgas q\b/.test(d)) {
    found.push('q');
  }

  return found;
}

/// La serie propia del equipo. Un accesorio no pertenece a una serie: la
/// menciona porque es compatible con ella, y eso se guarda aparte.
export function resolveSeries(row: RawRow, productType: string): string | null {
  if (!EQUIPMENT_TYPES.includes(productType)) return null;
  return findSeries(row)[0] ?? null;
}

/// Series con las que un accesorio declara ser compatible.
export function resolveCompatibleSeries(row: RawRow, productType: string): string[] {
  if (EQUIPMENT_TYPES.includes(productType)) return [];
  return findSeries(row);
}

// --- Formato ---------------------------------------------------------------

export const FORMATS = [
  { slug: 'portatil', name: 'Portátil' },
  { slug: 'empotrable', name: 'Empotrable' },
  { slug: 'de-carro', name: 'De carro' },
  { slug: 'de-pedestal', name: 'De pedestal' },
] as const;

export function resolveFormat(row: RawRow, productType: string): string | null {
  if (['accesorio', 'sazonador', 'paquete', 'combustible'].includes(productType)) return null;

  const haystack = `${fold(clean(row.categoryD))} ${fold(clean(row.categoryE))} ${fold(row.name)}`;

  if (haystack.includes('empotrable') || /\bsb\d{2}\b/.test(haystack)) return 'empotrable';
  if (haystack.includes('portatil') || haystack.includes('portable')) return 'portatil';
  if (haystack.includes('con carro') || haystack.includes('cart')) return 'de-carro';
  return null;
}

// --- Color -----------------------------------------------------------------
//
// Los colores viven al final del nombre, mezclados en español e ingles.
// hex se usa para pintar el selector de color en la ficha de producto.

interface ColorDef {
  slug: string;
  name: string;
  hex: string;
  patterns: string[];
}

export const COLORS: ColorDef[] = [
  {
    slug: 'negro-mate',
    name: 'Negro mate',
    hex: '#2B2B2B',
    patterns: ['negro mate', 'matte black'],
  },
  { slug: 'negro', name: 'Negro', hex: '#1A1A1A', patterns: ['negro', 'black', ' blk'] },
  { slug: 'crimson', name: 'Crimson', hex: '#8C1D1D', patterns: ['crimson'] },
  { slug: 'ivory', name: 'Ivory', hex: '#EFE6D5', patterns: ['ivory', 'marfil'] },
  { slug: 'smoke', name: 'Smoke', hex: '#5A5A57', patterns: ['deep smoke', 'smoke'] },
  { slug: 'slate-blue', name: 'Slate Blue', hex: '#5A6B7D', patterns: ['slate blue'] },
  { slug: 'spring-green', name: 'Spring Green', hex: '#7A8B4A', patterns: ['spring green'] },
  {
    slug: 'deep-ocean-blue',
    name: 'Deep Ocean Blue',
    hex: '#1F3A5F',
    patterns: ['deep ocean blue'],
  },
  { slug: 'cobre', name: 'Cobre', hex: '#A65E2E', patterns: ['cobre', 'copper'] },
  { slug: 'verde', name: 'Verde', hex: '#2F5D3A', patterns: ['verde', 'green'] },
  { slug: 'rojo', name: 'Rojo', hex: '#B3261E', patterns: ['rojo', 'red'] },
  { slug: 'azul', name: 'Azul', hex: '#1E4E8C', patterns: ['azul', 'blue'] },
  {
    slug: 'acero-inoxidable',
    name: 'Acero inoxidable',
    hex: '#B8BCC0',
    patterns: [' ss ', 'stainless', 'inoxidable'],
  },
  { slug: 'stealth', name: 'Stealth', hex: '#3A3A3A', patterns: ['stealth'] },
];

/// Nombres de serie que contienen una palabra de color y provocarian falsos
/// positivos: "Smokey Joe" no es color humo, "Deep Ocean Blue" si es azul.
const SERIES_WORDS = SERIES.flatMap((s) => s.patterns).concat(['smokey', 'joe']);

export function resolveColor(row: RawRow, productType: string): string | null {
  // El color de una espatula no le importa a nadie; solo se captura en
  // equipos, donde es criterio real de compra.
  if (!EQUIPMENT_TYPES.includes(productType)) return null;

  // Se quita el nombre de la serie antes de buscar el color, porque varias
  // series lo llevan dentro: sin esto todo Smokey Joe saldria color "Smoke".
  let name = ` ${fold(row.name)} `;
  for (const word of SERIES_WORDS) {
    name = name.replaceAll(word, ' ');
  }

  for (const color of COLORS) {
    // Limite de palabra: "blue" no debe dispararse dentro de "bluetooth",
    // ni "red" dentro de "redondo".
    if (color.patterns.some((p) => new RegExp(`(?<![a-z])${p.trim()}(?![a-z])`).test(name))) {
      return color.slug;
    }
  }
  return null;
}

// --- Tamano ----------------------------------------------------------------

interface SizeDef {
  slug: string;
  name: string;
  inches: number;
}

export const SIZES: SizeDef[] = [
  { slug: '14-pulgadas', name: '14"', inches: 14 },
  { slug: '18-pulgadas', name: '18"', inches: 18 },
  { slug: '18-5-pulgadas', name: '18.5"', inches: 18.5 },
  { slug: '22-pulgadas', name: '22"', inches: 22 },
  { slug: '22-5-pulgadas', name: '22.5"', inches: 22.5 },
  { slug: '24-pulgadas', name: '24"', inches: 24 },
  { slug: '26-pulgadas', name: '26"', inches: 26 },
  { slug: '34-pulgadas', name: '34"', inches: 34 },
  { slug: '37-5-pulgadas', name: '37.5"', inches: 37.5 },
];

const SIZE_BY_INCHES = new Map(SIZES.map((s) => [s.inches, s.slug]));

export function resolveSize(row: RawRow, productType: string): string | null {
  if (!['asador', 'ahumador', 'plancha'].includes(productType)) return null;

  const name = fold(row.name).replace(/[”″]/g, '"');

  // "37 1/2" -> 37.5
  const fraction = name.match(/(\d{2})\s+1\/2/);
  if (fraction?.[1]) {
    const inches = Number(fraction[1]) + 0.5;
    return SIZE_BY_INCHES.get(inches) ?? null;
  }

  // 14", 18.5", 22in, 26 in
  const match = name.match(/(\d{2}(?:\.\d)?)\s*(?:"|in\b|pulgadas)/);
  if (match?.[1]) return SIZE_BY_INCHES.get(Number(match[1])) ?? null;

  return null;
}

// --- Categorias de navegacion ---------------------------------------------
//
// Son las pestañas del menu que pide el Excel de propuesta. Un producto
// puede vivir en varias: un Traveler es "Gas" y tambien "Portatiles".
// La primera de la lista es la primaria y define la URL canonica.

export const CATEGORIES = [
  { slug: 'gas', name: 'Gas', description: 'Asadores de gas Weber' },
  { slug: 'carbon', name: 'Carbón', description: 'Asadores y ahumadores de carbón' },
  { slug: 'electricos', name: 'Eléctricos', description: 'Asadores eléctricos y pellet' },
  { slug: 'planchas', name: 'Planchas', description: 'Planchas y griddles' },
  { slug: 'portatiles', name: 'Portátiles', description: 'Asadores para llevar' },
  { slug: 'empotrables', name: 'Empotrables', description: 'Asadores para cocina exterior' },
  { slug: 'accesorios', name: 'Accesorios', description: 'Herramientas, fundas y refacciones' },
] as const;

export function resolveCategories(
  productType: string,
  fuel: string | null,
  format: string | null,
): string[] {
  const slugs: string[] = [];

  if (productType === 'plancha') slugs.push('planchas');
  else if (['accesorio', 'sazonador', 'combustible', 'paquete'].includes(productType)) {
    slugs.push('accesorios');
  } else if (fuel === 'gas') slugs.push('gas');
  else if (fuel === 'carbon') slugs.push('carbon');
  else if (fuel === 'electrico' || fuel === 'pellet') slugs.push('electricos');

  if (format === 'portatil') slugs.push('portatiles');
  if (format === 'empotrable') slugs.push('empotrables');

  return Array.from(new Set(slugs));
}

// --- Orquestador -----------------------------------------------------------

export function normalizeRow(row: RawRow): NormalizedProduct {
  const notes: string[] = [];

  const productType = resolveProductType(row);
  const fuel = resolveFuelType(row, productType);
  const series = resolveSeries(row, productType);
  const compatibleSeries = resolveCompatibleSeries(row, productType);
  const format = resolveFormat(row, productType);
  const color = resolveColor(row, productType);
  const size = resolveSize(row, productType);
  const categories = resolveCategories(productType, fuel, format);

  if (!clean(row.categoryD) && !clean(row.categoryE)) {
    notes.push('Sin categoría en el Excel');
  }
  if (categories.length === 0) {
    notes.push('Sin categoría de navegación');
  }
  if (['asador', 'ahumador'].includes(productType) && !fuel) {
    notes.push('Sin combustible identificado');
  }
  // Nombres que vienen del sistema de Weber en ingles y en mayusculas.
  // Se importan tal cual pero hay que redactarlos para la tienda.
  if (row.name === row.name.toUpperCase() && row.name.length > 12) {
    notes.push('Nombre en mayúsculas, falta redacción comercial');
  }

  const discontinued = fold(clean(row.categoryD)).includes('descontinuado');

  return {
    sku: row.sku,
    name: clean(row.name),
    // Sin el SKU pegado: es la direccion que va a ver el cliente y
    // "plancha-para-genesis-ii" se lee mejor que "...-7599". El SKU solo entra
    // cuando dos productos chocan, y eso se resuelve al insertar, que es donde
    // se sabe que slugs estan tomados. Es la misma regla que aplica el panel
    // en deriveSlug; cuando eran distintas, guardar una ficha le cambiaba la
    // URL sin que nadie lo pidiera.
    slug: slugify(row.name),
    productTypeSlug: productType,
    fuelTypeSlug: fuel,
    seriesSlug: series,
    compatibleSeriesSlugs: compatibleSeries,
    formatSlug: format,
    colorSlug: color,
    sizeSlug: size,
    categorySlugs: categories,
    status: discontinued ? 'DISCONTINUED' : 'DRAFT',
    needsReview: notes.length > 0,
    reviewNote: notes.length > 0 ? notes.join('; ') : null,
    rawCategory: clean(row.categoryD) || null,
    rawSubcategory: clean(row.categoryE) || null,
  };
}
