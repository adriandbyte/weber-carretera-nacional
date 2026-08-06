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
import { productSchema } from '@weber/core';
import { del, put } from '@vercel/blob';

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

const toDecimal = (value: string | null) => (value === null ? null : new Prisma.Decimal(value));

export async function saveProduct(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = productSchema.safeParse({
    name: formData.get('name') ?? '',
    slug: formData.get('slug') ?? '',
    shortDescription: formData.get('shortDescription') ?? '',
    description: formData.get('description') ?? '',
    status: formData.get('status') ?? 'DRAFT',
    price: formData.get('price') ?? '',
    compareAtPrice: formData.get('compareAtPrice') ?? '',
    stock: formData.get('stock') ?? '',
    brandId: formData.get('brandId') ?? '',
    productTypeId: formData.get('productTypeId') ?? '',
    fuelTypeId: formData.get('fuelTypeId') ?? '',
    seriesId: formData.get('seriesId') ?? '',
    formatId: formData.get('formatId') ?? '',
    colorId: formData.get('colorId') ?? '',
    sizeId: formData.get('sizeId') ?? '',
    categoryIds: formData.getAll('categoryIds').map(String),
    compatibleSeriesIds: formData.getAll('compatibleSeriesIds').map(String),
    metaTitle: formData.get('metaTitle') ?? '',
    metaDescription: formData.get('metaDescription') ?? '',
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

  // El slug es la URL del producto en la tienda. Dos productos con el mismo
  // slug se pisarian, asi que se avisa en vez de dejar que reviente Postgres.
  const slugTaken = await prisma.product.findFirst({
    where: { slug: data.slug, id: { not: productId } },
    select: { sku: true },
  });
  if (slugTaken) {
    return {
      ok: false,
      message: 'Esa URL ya está en uso.',
      errors: { slug: [`El SKU ${slugTaken.sku} ya usa esta URL. Escribe otra.`] },
    };
  }

  // No se puede publicar un producto vacio: quedaria en la tienda sin nada que
  // mostrar. Es la unica regla de negocio que bloquea el guardado.
  if (data.status === 'ACTIVE') {
    const images = await prisma.productImage.count({ where: { productId } });
    const faltantes: string[] = [];
    if (!data.shortDescription && !data.description) faltantes.push('una descripción');
    if (images === 0) faltantes.push('al menos una imagen');
    if (faltantes.length > 0) {
      return {
        ok: false,
        message: `Para publicar falta ${faltantes.join(' y ')}. Guárdalo como borrador mientras tanto.`,
        errors: { status: ['No se puede publicar todavía'] },
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        status: data.status,
        price: toDecimal(data.price),
        compareAtPrice: toDecimal(data.compareAtPrice),
        stock: data.stock,
        brandId: data.brandId,
        productTypeId: data.productTypeId,
        fuelTypeId: data.fuelTypeId,
        seriesId: data.seriesId,
        formatId: data.formatId,
        colorId: data.colorId,
        sizeId: data.sizeId,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
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

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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
    return { ok: false, message: 'La imagen no debe pesar más de 8 MB.' };
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

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const stored = await put(
    `productos/${product.sku}-${Date.now()}.${extension}`,
    await file.arrayBuffer(),
    { access: 'public', contentType: file.type, addRandomSuffix: false },
  );

  await prisma.productImage.create({
    data: {
      productId,
      url: stored.url,
      blobPath: stored.pathname,
      alt: product.name,
      position: product._count.images,
      isPrimary: product._count.images === 0,
    },
  });

  revalidatePath(`/productos/${productId}`);
  return { ok: true, message: 'Imagen agregada.' };
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
