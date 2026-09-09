// ---------------------------------------------------------------------------
// Formato de valores para pantalla.
//
// Vive en un paquete compartido y no dentro de cada app para que un precio se
// vea igual en la tienda y en el admin. Cuando esos dos no coinciden, el
// cliente cree que hay un error de datos aunque el numero sea el mismo.
// ---------------------------------------------------------------------------

const MXN = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
});

/// Acepta el Decimal de Prisma, que llega como objeto y no como number.
type Money = { toString(): string } | number | null | undefined;

export function formatMoney(value: Money): string | null {
  if (value === null || value === undefined) return null;
  const amount = Number(value.toString());
  return Number.isFinite(amount) ? MXN.format(amount) : null;
}

/// Pluralizacion simple en español. Evita los "1 productos" que delatan
/// que la pagina se genero sola.
export function pluralize(count: number, singular: string, plural?: string): string {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/// Corta sin partir palabras. Vive aqui porque los textos para buscadores se
/// derivan en dos sitios -el panel al guardar y el generador de nombres al
/// redactar el catalogo- y con dos copias del limite un producto cambiaba de
/// metaTitle con solo abrirlo y guardarlo.
export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/// Titulo y descripcion para buscadores, derivados de lo que si se captura.
/// Un campo de SEO en blanco es peor que uno generado: quien limpia el catalogo
/// no tiene por que saber que escribir ahi.
export function deriveSeo(name: string, shortDescription: string | null) {
  return {
    metaTitle: truncate(name, 70),
    metaDescription: shortDescription ? truncate(shortDescription, 160) : null,
  };
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Publicado',
  ARCHIVED: 'Archivado',
  DISCONTINUED: 'Descontinuado',
};
