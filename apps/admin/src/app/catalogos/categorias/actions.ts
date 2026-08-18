'use server';

// ---------------------------------------------------------------------------
// Escrituras de las categorias.
//
// Van aparte de las de los otros catalogos porque una categoria no es solo una
// opcion de un desplegable: es una pagina de la tienda, con su texto, su imagen
// y sus etiquetas para buscadores.
//
// Se mantienen dos reglas del resto del panel:
//   - el slug se deriva del nombre y nadie lo captura a mano
//   - un valor en uso no se borra, se oculta
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { prisma } from '@weber/db';
import {
  USO_CATEGORIA,
  categorySchema,
  motivoParaNoBorrar,
  nextCategorySlug,
  slugify,
} from '@weber/core';
import {
  prepareImage,
  removeStoredImage,
  savedPercent,
  storeImage,
  validateImage,
} from '@/lib/imagenes';

export interface CategoryState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  /// La imagen que quedo guardada. La ventana de edicion no se entera de que
  /// el servidor revalido la pagina de detras, asi que refresca su miniatura
  /// con esto.
  imageUrl?: string | null;
}

const RUTA = '/catalogos/categorias';

function parseForm(formData: FormData) {
  return categorySchema.safeParse({
    name: formData.get('name') ?? '',
    description: formData.get('description') ?? '',
    metaTitle: formData.get('metaTitle') ?? '',
    metaDescription: formData.get('metaDescription') ?? '',
    position: formData.get('position') ?? '',
    active: formData.get('active') === 'on',
  });
}

function fieldErrors(error: import('zod').ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function createCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, message: 'Revisa los campos marcados.', errors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const slug = slugify(data.name);

  const taken = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (taken) {
    return {
      ok: false,
      message: 'Ya existe una categoría con ese nombre.',
      errors: { name: ['Ya hay otra categoría que se llama así'] },
    };
  }

  await prisma.category.create({
    data: {
      slug,
      name: data.name,
      description: data.description,
      // Si no se escriben a mano, los textos para buscadores salen de lo que si
      // se captura: un campo de SEO vacio es peor que uno derivado.
      metaTitle: data.metaTitle ?? data.name,
      metaDescription: data.metaDescription ?? data.description,
      position: data.position,
    },
  });

  revalidatePath(RUTA);
  return { ok: true, message: `Se agregó "${data.name}".` };
}

export async function updateCategory(
  id: string,
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { ok: false, message: 'Revisa los campos marcados.', errors: fieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const current = await prisma.category.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });
  if (!current) return { ok: false, message: 'Esa categoría ya no existe.' };

  const slug = nextCategorySlug(data.name, current);
  if (slug !== current.slug) {
    const taken = await prisma.category.findFirst({
      where: { slug, id: { not: id } },
      select: { id: true },
    });
    if (taken) {
      return {
        ok: false,
        message: 'Ya existe otra categoría con ese nombre.',
        errors: { name: ['Ya hay otra categoría que se llama así'] },
      };
    }
  }

  await prisma.category.update({
    where: { id },
    data: {
      slug,
      name: data.name,
      description: data.description,
      metaTitle: data.metaTitle ?? data.name,
      metaDescription: data.metaDescription ?? data.description,
      position: data.position,
      active: data.active,
    },
  });

  revalidatePath(RUTA);
  return { ok: true, message: 'Cambios guardados.' };
}

export async function deleteCategory(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const id = String(formData.get('id') ?? '');
  const category = await prisma.category.findUnique({
    where: { id },
    select: { name: true, imageUrl: true, _count: { select: { products: true } } },
  });
  if (!category) return { ok: false, message: 'Esa categoría ya no existe.' };

  const bloqueo = motivoParaNoBorrar(category._count.products, USO_CATEGORIA);
  if (bloqueo) return { ok: false, message: bloqueo };

  await removeStoredImage(category.imageUrl);
  await prisma.category.delete({ where: { id } });

  revalidatePath(RUTA);
  return { ok: true, message: `Se eliminó "${category.name}".` };
}

export async function uploadCategoryImage(
  id: string,
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const file = formData.get('file');
  const problema = validateImage(file);
  if (problema) return { ok: false, message: problema };

  const category = await prisma.category.findUnique({
    where: { id },
    select: { slug: true, imageUrl: true },
  });
  if (!category) return { ok: false, message: 'Esa categoría ya no existe.' };

  let prepared;
  try {
    prepared = await prepareImage(file as File);
  } catch {
    return { ok: false, message: 'No se pudo leer la imagen. ¿Está dañada?' };
  }

  const stored = await storeImage(
    `categorias/${category.slug}-${Date.now()}.webp`,
    prepared.buffer,
  );

  // La anterior se borra despues de guardar la nueva: si el borrado fuera
  // primero y la subida fallara, la categoria se quedaria sin ninguna.
  await prisma.category.update({ where: { id }, data: { imageUrl: stored.url } });
  await removeStoredImage(category.imageUrl);

  revalidatePath(RUTA);
  const ahorro = savedPercent((file as File).size, prepared.buffer.length);
  return {
    ok: true,
    message:
      ahorro > 5 ? `Imagen guardada y optimizada (${ahorro}% más ligera).` : 'Imagen guardada.',
    imageUrl: stored.url,
  };
}

export async function removeCategoryImage(
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  const id = String(formData.get('id') ?? '');
  const category = await prisma.category.findUnique({
    where: { id },
    select: { imageUrl: true },
  });
  if (!category) return { ok: false, message: 'Esa categoría ya no existe.' };

  await removeStoredImage(category.imageUrl);
  await prisma.category.update({ where: { id }, data: { imageUrl: null } });

  revalidatePath(RUTA);
  return { ok: true, message: 'Imagen quitada.', imageUrl: null };
}
