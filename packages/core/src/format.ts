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

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Publicado',
  ARCHIVED: 'Archivado',
  DISCONTINUED: 'Descontinuado',
};
