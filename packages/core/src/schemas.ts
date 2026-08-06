// ---------------------------------------------------------------------------
// Validacion de todo lo que se escribe en la base.
//
// Vive aqui y no en el formulario porque el formulario se puede saltar. Las
// Server Actions validan contra estos esquemas siempre, sin excepcion.
//
// La regla de fondo: el admin lo va a usar alguien que no es tecnico, asi que
// los mensajes explican que hacer, no que fallo.
// ---------------------------------------------------------------------------

import { z } from 'zod';

/// Convierte '' en null. Los formularios HTML mandan cadena vacia para todo
/// campo que el usuario dejo en blanco, y eso en la base debe ser null y no
/// una cadena vacia que despues aparece como un hueco raro en la tienda.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable();

/// Igual para las llaves foraneas: el <select> vacio manda ''.
const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .nullable();

/// Acepta "12,499.00", "$12499" o "". Guarda null cuando no hay dato, que es
/// distinto de cero: cero significaria regalado.
const optionalMoney = z
  .string()
  .trim()
  .nullable()
  .superRefine((raw, ctx) => {
    if (raw === null || raw === '') return;
    // Se aceptan simbolos de moneda y separadores de miles, que es como la
    // gente copia y pega un precio desde una hoja de calculo.
    const digits = raw.replace(/[\s$,]/g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Escribe solo el monto, por ejemplo 12499.00',
      });
    }
  })
  .transform((raw) => {
    if (raw === null) return null;
    const digits = raw.replace(/[\s$,]/g, '');
    // Vacio significa "todavia no hay precio", que no es lo mismo que cero.
    return digits === '' ? null : digits;
  });

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  slug: z
    .string()
    .trim()
    .min(3, 'La URL debe tener al menos 3 caracteres')
    .max(120, 'Máximo 120 caracteres')
    .regex(SLUG_PATTERN, 'Solo minúsculas, números y guiones. Ejemplo: asador-genesis-e-315'),
  shortDescription: optionalText(300),
  description: optionalText(5000),

  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCONTINUED']),

  // Precio y stock se capturan mucho despues. Se aceptan vacios sin protestar.
  price: optionalMoney,
  compareAtPrice: optionalMoney,
  stock: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, 'Debe ser un número entero de 0 o más'),

  brandId: optionalId,
  productTypeId: optionalId,
  fuelTypeId: optionalId,
  seriesId: optionalId,
  formatId: optionalId,
  colorId: optionalId,
  sizeId: optionalId,

  categoryIds: z.array(z.string()).default([]),
  compatibleSeriesIds: z.array(z.string()).default([]),

  metaTitle: optionalText(70),
  metaDescription: optionalText(160),

  /// Se apaga a mano cuando el producto ya quedo revisado.
  needsReview: z.boolean().default(false),
});

export type ProductInput = z.infer<typeof productSchema>;

/// Los catalogos comparten forma, asi que comparten esquema.
export const catalogSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(80, 'Máximo 80 caracteres'),
  slug: z
    .string()
    .trim()
    .min(1, 'La URL es obligatoria')
    .max(80, 'Máximo 80 caracteres')
    .regex(SLUG_PATTERN, 'Solo minúsculas, números y guiones'),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$|^$/, 'Debe ser un color en formato #RRGGBB')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  position: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, 'Debe ser un número entero de 0 o más'),
  active: z.boolean().default(true),
});

export type CatalogInput = z.infer<typeof catalogSchema>;

/// Genera una URL a partir del nombre. Se usa para proponer el slug cuando el
/// usuario aun no lo ha tocado, nunca para sobrescribir uno ya publicado: al
/// cambiar el slug de un producto vivo se rompen sus enlaces y su posicion en
/// buscadores.
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/["'®™]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
