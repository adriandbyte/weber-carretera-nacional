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

/// Solo lo que se captura a mano en el panel.
///
/// Deliberadamente NO estan aqui:
///   slug          se deriva del nombre (ver deriveSlug en las acciones)
///   metaTitle     se derivan del nombre y la descripcion corta
///   metaDescription
///   brandId       todo el catalogo es Weber
///   stock         el inventario llega mucho despues
///
/// Todos ellos se calculan o se conservan en el servidor. Un campo que la
/// persona que captura no necesita decidir no deberia estar en la pantalla:
/// solo agrega ruido y formas nuevas de equivocarse.
export const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(200, 'Máximo 200 caracteres'),
    shortDescription: optionalText(300),
    description: optionalText(5000),

    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCONTINUED']),

    // El precio llega meses despues. Se acepta vacio sin protestar.
    price: optionalMoney,
    compareAtPrice: optionalMoney,

    productTypeId: optionalId,
    fuelTypeId: optionalId,
    seriesId: optionalId,
    formatId: optionalId,
    colorId: optionalId,
    sizeId: optionalId,

    categoryIds: z.array(z.string()).default([]),

    /// Un formulario HTML no distingue "no marque ninguna casilla" de "esta
    /// pantalla no tenia casillas": los dos casos llegan como lista vacia. Si el
    /// guardado los confunde, esconder un campo equivale a borrarlo.
    ///
    /// Por eso el formulario declara aparte si llego a mostrar el control. Solo
    /// cuando lo mostro puede la lista vacia significar "quitalas todas".
    compatibilityEditable: z.boolean().default(false),
    compatibleSeriesIds: z.array(z.string()).default([]),

    /// Se apaga a mano cuando el producto ya quedo revisado.
    needsReview: z.boolean().default(false),
  })
  // El precio de lista es el que se pinta tachado al lado del de venta. Si es
  // menor, la tienda anuncia un descuento al reves: "antes $900, ahora $1,200".
  // Se comprueba aqui y no en el formulario porque es una relacion entre dos
  // campos, y ninguno de los dos por separado tiene nada malo.
  .refine(
    (data) =>
      data.price === null ||
      data.compareAtPrice === null ||
      Number(data.compareAtPrice) > Number(data.price),
    {
      path: ['compareAtPrice'],
      message: 'El precio de lista debe ser mayor que el de venta, o déjalo vacío',
    },
  );

export type ProductInput = z.infer<typeof productSchema>;

/// Los siete catalogos comparten forma, asi que comparten esquema.
///
/// El slug no esta aqui por la misma razon que no esta en productos: se deriva
/// del nombre en el servidor. Es la direccion por la que la tienda filtra, y no
/// es algo que quien administra el catalogo tenga que inventar.
export const catalogSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe un nombre')
    .max(80, 'Máximo 80 caracteres')
    // Un nombre de solo simbolos deja el slug vacio, y un catalogo sin
    // direccion no se puede enlazar desde la tienda.
    .refine((v) => slugify(v).length > 0, 'El nombre debe tener letras o números'),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$|^$/, 'El color debe ir en formato #RRGGBB, por ejemplo #1A1A1A')
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null),
  position: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, 'El orden debe ser un número entero de 0 o más'),
  active: z.boolean().default(true),
});

export type CatalogInput = z.infer<typeof catalogSchema>;

/// Una categoria es un catalogo con contenido propio.
///
/// Las otras seis listas solo alimentan un desplegable, asi que con nombre y
/// orden basta. Una categoria ademas es una pagina de la tienda: tiene su texto
/// de entrada, su imagen y sus etiquetas para buscadores. Por eso no cabe en
/// catalogSchema y tiene el suyo.
///
/// El slug sigue derivandose del nombre, igual que en todo el panel.
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Escribe un nombre')
    .max(80, 'Máximo 80 caracteres')
    .refine((v) => slugify(v).length > 0, 'El nombre debe tener letras o números'),

  /// Texto de entrada de la seccion en la tienda.
  description: optionalText(500),

  // Los limites salen de lo que Google recorta en un resultado de busqueda:
  // mas largo no se pierde, pero no se lee.
  metaTitle: optionalText(70),
  metaDescription: optionalText(160),

  position: z
    .string()
    .trim()
    .transform((v) => (v === '' ? 0 : Number(v)))
    .refine((v) => Number.isInteger(v) && v >= 0, 'El orden debe ser un número entero de 0 o más'),
  active: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

/// Que direccion le toca a una categoria despues de editarla.
///
/// Solo se regenera si el nombre cambio de verdad. Entrar a corregir la
/// descripcion y salir no debe mover el slug: es por donde la tienda filtra la
/// seccion, y cambiarlo rompe los enlaces que ya circulan.
///
/// Vive aqui, y no dentro de la Server Action, para poder probarla: la accion
/// llama a revalidatePath y eso solo existe dentro de Next.
export function nextCategorySlug(newName: string, current: { name: string; slug: string }): string {
  return newName.trim() === current.name ? current.slug : slugify(newName);
}

/// Alta manual de un producto.
///
/// Pide lo minimo para que el producto exista: casi todo el catalogo entra por
/// el importador del Excel, y lo que se da de alta a mano se termina en la
/// ficha. El SKU es la llave con la que se cruzan las listas de precios, asi
/// que es el unico campo que no se puede dejar para despues.
export const newProductSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, 'Escribe el SKU de Weber')
    .max(40, 'El SKU no debe pasar de 40 caracteres'),
  name: z
    .string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(200, 'Máximo 200 caracteres')
    .refine((v) => slugify(v).length > 0, 'El nombre debe tener letras o números'),
});

export type NewProductInput = z.infer<typeof newProductSchema>;

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
