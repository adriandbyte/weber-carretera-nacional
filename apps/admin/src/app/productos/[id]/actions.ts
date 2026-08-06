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
import { findPending, productSchema, slugify } from '@weber/core';
import { del, put } from '@vercel/blob';

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
    select: { sku: true, slug: true, publishedAt: true },
  });
  if (!current) return { ok: false, message: 'El producto ya no existe.' };

  // --- URL del producto --------------------------------------------------
  //
  // Nunca se captura a mano: no aparece en el panel. Quien limpia el catalogo
  // escribe el nombre y la direccion se acomoda sola.
  //
  //   Sin publicar  la URL sigue al nombre. No hay enlaces que romper.
  //   Publicado     la URL se congela aunque cambie el nombre. Ya circula en
  //                 enlaces y esta indexada; moverla tira lo ganado.
  const slug = current.publishedAt === null ? await deriveSlug(data.name, current.sku, productId) : current.slug;

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

    const blocking = findPending({
      name: data.name,
      shortDescription: data.shortDescription,
      description: data.description,
      imageCount,
      categoryCount,
      hasProductType: data.productTypeId !== null,
    }).filter((item) => item.blocking);

    if (blocking.length > 0) {
      return {
        ok: false,
        message:
          `Para publicar falta ${blocking.map((b) => b.missing).join(', ')}. ` +
          'Guárdalo como borrador mientras tanto.',
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

    await tx.productCompatibility.deleteMany({ where: { productId } });
    if (data.compatibleSeriesIds.length > 0) {
      await tx.productCompatibility.createMany({
        data: data.compatibleSeriesIds.map((seriesId) => ({ productId, seriesId })),
      });
    }
  });

  revalidatePath('/productos');
  revalidatePath(`/productos/${productId}`);
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

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/// Lado maximo que se guarda. Una foto de celular llega con 4000 px o mas y
/// nadie va a ver un asador a ese tamaño ni en pantalla completa. Guardarla
/// tal cual solo hace lenta la pagina y cara la factura de almacenamiento.
const MAX_EDGE = 2000;

/// Se normaliza todo a WebP: pesa alrededor de un tercio menos que JPEG con la
/// misma calidad visible y lo entienden todos los navegadores actuales. Ademas
/// deja un solo formato en la tienda en vez de una mezcla de PNG y JPEG.
async function prepareUpload(file: File) {
  const sharp = (await import('sharp')).default;
  const original = Buffer.from(await file.arrayBuffer());

  const pipeline = sharp(original)
    // withoutEnlargement: una imagen que ya es chica no se estira, porque
    // agrandar no agrega detalle, solo peso.
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 });

  const buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? null, height: meta.height ?? null };
}

export async function uploadImage(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Elige un archivo de imagen.' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, message: 'Solo se aceptan imágenes PNG, JPG o WebP.' };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'La imagen no debe pesar más de 12 MB.' };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      message: 'Falta configurar el almacenamiento de imágenes (BLOB_READ_WRITE_TOKEN).',
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true, name: true, _count: { select: { images: true } } },
  });
  if (!product) return { ok: false, message: 'El producto ya no existe.' };

  let prepared;
  try {
    prepared = await prepareUpload(file);
  } catch {
    return { ok: false, message: 'No se pudo leer la imagen. ¿Está dañada?' };
  }

  const stored = await put(`productos/${product.sku}-${Date.now()}.webp`, prepared.buffer, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
  });

  await prisma.productImage.create({
    data: {
      productId,
      url: stored.url,
      blobPath: stored.pathname,
      alt: product.name,
      position: product._count.images,
      isPrimary: product._count.images === 0,
      width: prepared.width,
      height: prepared.height,
    },
  });

  revalidatePath(`/productos/${productId}`);

  const ahorro = Math.round((1 - prepared.buffer.length / file.size) * 100);
  return {
    ok: true,
    message:
      ahorro > 5
        ? `Imagen agregada y optimizada (${ahorro}% más ligera).`
        : 'Imagen agregada.',
  };
}

export async function deleteImage(formData: FormData) {
  const imageId = String(formData.get('imageId') ?? '');
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image) return;

  // Se borra el archivo real solo si vive en Blob. Las rutas locales del
  // importador se dejan en disco: son la copia de respaldo del Excel.
  if (image.blobPath && image.url.startsWith('https://') && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(image.url).catch(() => undefined);
  }
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

/// Ir al siguiente pendiente sin volver a la lista. Es lo que convierte la
/// limpieza de 331 productos en algo que se puede hacer de corrido.
export async function goToNextPending(currentName: string) {
  const next = await prisma.product.findFirst({
    where: { needsReview: true, name: { gt: currentName } },
    orderBy: { name: 'asc' },
    select: { id: true },
  });
  const fallback = next
    ? null
    : await prisma.product.findFirst({
        where: { needsReview: true },
        orderBy: { name: 'asc' },
        select: { id: true },
      });

  const target = next ?? fallback;
  redirect(target ? `/productos/${target.id}` : '/productos?filtro=revision');
}
