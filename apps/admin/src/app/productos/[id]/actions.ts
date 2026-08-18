'use server';

// ---------------------------------------------------------------------------
// Escrituras de la ficha de producto.
//
// Toda entrada pasa por Zod antes de tocar la base. El formulario del
// navegador se puede manipular, asi que la validacion del cliente es una
// cortesia y esta es la que cuenta.
//
// Ninguna accion lanza excepciones al usuario: devuelven un estado con los
// errores por campo para que el formulario los muestre junto al input y no
// como una pantalla de error.
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma, Prisma } from '@weber/db';
import {
  acceptsCompatibility,
  motivoParaNoPublicar,
  productSchema,
  slugify,
} from '@weber/core';
import { findNextPendingId } from '@/lib/productos';
import {
  prepareImage,
  removeStoredImage,
  savedPercent,
  storeImage,
  validateImage,
} from '@/lib/imagenes';

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const toDecimal = (value: string | null) => (value === null ? null : new Prisma.Decimal(value));

/// Corta sin partir palabras a la mitad, que en un resultado de Google se ve
/// como un error tipografico.
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd();
}

/// Convierte el nombre en direccion web y resuelve choques.
///
/// Dos productos pueden llamarse igual de forma legitima: el mismo modelo en
/// dos medidas suele compartir nombre hasta que alguien lo redacta completo.
/// En ese caso el SKU los desempata, en vez de rechazar el guardado y dejar a
/// quien captura sin entender que hizo mal.
async function deriveSlug(name: string, sku: string, productId: string): Promise<string> {
  const base = slugify(name);
  if (!base) return '';

  const taken = await prisma.product.findFirst({
    where: { slug: base, id: { not: productId } },
    select: { id: true },
  });
  return taken ? `${base}-${sku.toLowerCase()}` : base;
}

export async function saveProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = productSchema.safeParse({
    name: formData.get('name') ?? '',
    shortDescription: formData.get('shortDescription') ?? '',
    description: formData.get('description') ?? '',
    status: formData.get('status') ?? 'DRAFT',
    price: formData.get('price') ?? '',
    compareAtPrice: formData.get('compareAtPrice') ?? '',
    productTypeId: formData.get('productTypeId') ?? '',
    fuelTypeId: formData.get('fuelTypeId') ?? '',
    seriesId: formData.get('seriesId') ?? '',
    formatId: formData.get('formatId') ?? '',
    colorId: formData.get('colorId') ?? '',
    sizeId: formData.get('sizeId') ?? '',
    categoryIds: formData.getAll('categoryIds').map(String),
    compatibilityEditable: formData.get('compatibilityEditable') === '1',
    compatibleSeriesIds: formData.getAll('compatibleSeriesIds').map(String),
    needsReview: formData.get('needsReview') === 'on',
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisa los campos marcados.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const current = await prisma.product.findUnique({
    where: { id: productId },
    // name es el nombre de antes de guardar: hace de cursor para "y seguir".
    select: { sku: true, slug: true, publishedAt: true, name: true },
  });
  if (!current) return { ok: false, message: 'El producto ya no existe.' };

  // El tipo mandado se resuelve a su slug para poder aplicar la misma regla que
  // la pantalla. Que el formulario declare haber mostrado las casillas no basta:
  // se puede editar en el navegador, y aqui es donde se decide de verdad.
  const productType = data.productTypeId
    ? await prisma.productType.findUnique({
        where: { id: data.productTypeId },
        select: { slug: true },
      })
    : null;
  const editsCompatibility = data.compatibilityEditable && acceptsCompatibility(productType?.slug);

  // --- URL del producto --------------------------------------------------
  //
  // Nunca se captura a mano: no aparece en el panel. Quien limpia el catalogo
  // escribe el nombre y la direccion se acomoda sola.
  //
  //   Sin publicar  la URL sigue al nombre. No hay enlaces que romper.
  //   Publicado     la URL se congela aunque cambie el nombre. Ya circula en
  //                 enlaces y esta indexada; moverla tira lo ganado.
  const slug =
    current.publishedAt === null
      ? await deriveSlug(data.name, current.sku, productId)
      : current.slug;

  if (!slug) {
    return {
      ok: false,
      message: 'El nombre debe tener letras o números.',
      errors: { name: ['Escribe un nombre con letras o números'] },
    };
  }

  // No se puede publicar un producto incompleto: quedaria en la tienda sin
  // nada que mostrar, o sin aparecer en ninguna seccion.
  //
  // La regla no se escribe aqui: se consulta la misma lista de pendientes que
  // ve la persona en pantalla. Cuando estaban separadas, la pantalla marcaba
  // como obligatorias cosas que el guardado no comprobaba.
  if (data.status === 'ACTIVE') {
    const [imageCount, categoryCount] = await Promise.all([
      prisma.productImage.count({ where: { productId } }),
      Promise.resolve(data.categoryIds.length),
    ]);

    const bloqueo = motivoParaNoPublicar({
      name: data.name,
      shortDescription: data.shortDescription,
      description: data.description,
      imageCount,
      categoryCount,
      hasProductType: data.productTypeId !== null,
    });

    if (bloqueo) {
      return {
        ok: false,
        message: bloqueo,
        errors: { status: ['No se puede publicar todavía'] },
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        slug,
        // Se sella la primera vez que sale a la tienda. A partir de ahi la
        // URL queda fija aunque cambie el nombre.
        publishedAt:
          data.status === 'ACTIVE' && current.publishedAt === null ? new Date() : undefined,
        shortDescription: data.shortDescription,
        description: data.description,
        status: data.status,
        price: toDecimal(data.price),
        compareAtPrice: toDecimal(data.compareAtPrice),
        productTypeId: data.productTypeId,
        fuelTypeId: data.fuelTypeId,
        seriesId: data.seriesId,
        formatId: data.formatId,
        colorId: data.colorId,
        sizeId: data.sizeId,
        // brandId y stock no se tocan: no estan en la pantalla, asi que
        // conservan el valor que ya tenian.
        // Los textos para buscadores se derivan de lo que si se captura. Un
        // campo de SEO en blanco es peor que uno generado: quien limpia el
        // catalogo no tiene por que saber que escribir ahi.
        metaTitle: truncate(data.name, 70),
        metaDescription: data.shortDescription ? truncate(data.shortDescription, 160) : null,
        needsReview: data.needsReview,
        // La nota del importador deja de tener sentido una vez revisado.
        reviewNote: data.needsReview ? undefined : null,
      },
    });

    // Las relaciones se reemplazan completas: son listas cortas y asi no hay
    // que calcular que se agrego y que se quito.
    await tx.productCategory.deleteMany({ where: { productId } });
    if (data.categoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: data.categoryIds.map((categoryId, index) => ({
          productId,
          categoryId,
          isPrimary: index === 0,
          position: index,
        })),
      });
    }

    // Solo se toca si la pantalla llego a mostrar las casillas. Cuando el tipo
    // elegido es un asador el bloque no se pinta, el navegador no envia nada y
    // sin esta guarda el guardado leeria ese silencio como "borralas todas":
    // un accesorio marcado como plancha por error perdia sus series sin que
    // nadie viera un aviso, y no habia forma de recuperarlas.
    if (editsCompatibility) {
      await tx.productCompatibility.deleteMany({ where: { productId } });
      if (data.compatibleSeriesIds.length > 0) {
        await tx.productCompatibility.createMany({
          data: data.compatibleSeriesIds.map((seriesId) => ({ productId, seriesId })),
        });
      }
    }
  });

  revalidatePath('/productos');
  revalidatePath(`/productos/${productId}`);

  // A donde se va despues de guardar. Los tres caminos escriben primero: si la
  // validacion hubiera fallado ya se habria devuelto el error mas arriba, asi
  // que nunca se navega dejando cambios sin escribir.
  const intent = formData.get('intent');

  if (intent === 'next') {
    // Encadenar fichas sin pasar por la lista es lo que convierte limpiar 331
    // productos en algo que se hace de corrido.
    const nextId = await findNextPendingId(current.name, productId);
    // Sin siguiente es que ya no queda nada pendiente. Se vuelve a la lista en
    // vez de recargar la misma ficha, que se leeria como que no paso nada.
    redirect(nextId ? `/productos/${nextId}` : '/productos');
  }

  if (intent === 'exit') {
    redirect('/productos');
  }

  return { ok: true, message: 'Cambios guardados.' };
}

/// Marcar como revisado sin abrir la ficha, desde el propio detalle.
export async function toggleReview(productId: string, reviewed: boolean) {
  await prisma.product.update({
    where: { id: productId },
    data: { needsReview: !reviewed, ...(reviewed ? { reviewNote: null } : {}) },
  });
  revalidatePath('/productos');
  revalidatePath(`/productos/${productId}`);
}

// --- Imagenes --------------------------------------------------------------

export async function uploadImage(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const file = formData.get('file');
  const problema = validateImage(file);
  if (problema) return { ok: false, message: problema };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true, name: true, _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, message: 'El producto ya no existe.' };

  let prepared;
  try {
    prepared = await prepareImage(file as File);
  } catch {
    return { ok: false, message: 'No se pudo leer la imagen. ¿Está dañada?' };
  }

  const stored = await storeImage(`productos/${product.sku}-${Date.now()}.webp`, prepared.buffer);

  await prisma.productImage.create({
    data: {
      productId,
      url: stored.url,
      blobPath: stored.blobPath,
      alt: product.name,
      position: product._count.images,
      isPrimary: product._count.images === 0,
      width: prepared.width,
      height: prepared.height,
    },
  });

  revalidatePath(`/productos/${productId}`);

  const ahorro = savedPercent((file as File).size, prepared.buffer.length);
  return {
    ok: true,
    message:
      ahorro > 5 ? `Imagen agregada y optimizada (${ahorro}% más ligera).` : 'Imagen agregada.',
  };
}

export async function deleteImage(formData: FormData) {
  const imageId = String(formData.get('imageId') ?? '');
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  if (image.blobPath) await removeStoredImage(image.url);
  await prisma.productImage.delete({ where: { id: imageId } });

  // Si se borro la principal, asciende la siguiente para que el producto
  // nunca quede sin imagen de portada teniendo otras.
  const remaining = await prisma.productImage.findMany({
    where: { productId: image.productId },
    orderBy: { position: 'asc' },
  });
  if (remaining.length > 0 && !remaining.some((i) => i.isPrimary)) {
    await prisma.productImage.update({
      where: { id: remaining[0]!.id },
      data: { isPrimary: true },
    });
  }

  revalidatePath(`/productos/${image.productId}`);
  revalidatePath('/productos');
}

export async function setPrimaryImage(formData: FormData) {
  const imageId = String(formData.get('imageId') ?? '');
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  await prisma.$transaction([
    prisma.productImage.updateMany({
      where: { productId: image.productId },
      data: { isPrimary: false },
    }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
  ]);

  revalidatePath(`/productos/${image.productId}`);
  revalidatePath('/productos');
}
