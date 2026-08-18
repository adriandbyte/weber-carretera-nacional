'use server';

// ---------------------------------------------------------------------------
// Alta y baja de productos.
//
// Casi todo el catalogo entra por el importador del Excel. El alta manual es
// para lo que Weber saque despues del ultimo archivo, asi que pide lo minimo
// para existir: SKU y nombre. El resto se completa en la ficha.
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@weber/db';
import { newProductSchema, slugify } from '@weber/core';

export interface NewProductState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export async function createProduct(
  _prev: NewProductState,
  formData: FormData,
): Promise<NewProductState> {
  // Las reglas viven en el esquema, no aqui. La version escrita a mano era una
  // cadena de ifs donde cada uno pisaba el error del anterior: un nombre como
  // "!!" es corto y ademas no deja slug, y solo se reportaba lo segundo. Zod
  // reune todos los problemas de un campo y los devuelve juntos.
  const parsed = newProductSchema.safeParse({
    sku: formData.get('sku') ?? '',
    name: formData.get('name') ?? '',
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: 'Revisa los campos marcados.',
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { sku, name } = parsed.data;

  // El SKU es la llave con la que se cruzan las listas de precios. Repetirlo
  // rompe ese cruce, asi que se avisa antes de intentar guardar.
  const existing = await prisma.product.findUnique({
    where: { sku },
    select: { id: true, name: true },
  });
  if (existing) {
    return {
      ok: false,
      message: 'Ese SKU ya existe.',
      errors: { sku: [`Ya lo usa "${existing.name}".`] },
    };
  }

  const base = slugify(name);
  const slugTaken = await prisma.product.findUnique({
    where: { slug: base },
    select: { id: true },
  });

  const brand = await prisma.brand.findUnique({ where: { slug: 'weber' }, select: { id: true } });

  const product = await prisma.product.create({
    data: {
      sku,
      name,
      slug: slugTaken ? `${base}-${sku.toLowerCase()}` : base,
      status: 'DRAFT',
      brandId: brand?.id ?? null,
      metaTitle: name.slice(0, 70),
      // Nace pendiente: le falta todo lo que no cabe en dos campos.
      needsReview: true,
      reviewNote: 'Alta manual, falta completar la ficha',
    },
    select: { id: true },
  });

  revalidatePath('/productos');
  redirect(`/productos/${product.id}`);
}

/// Baja definitiva. Solo se permite en productos que nunca salieron a la
/// tienda: si ya se publico, archivarlo conserva su historia y su direccion,
/// que puede seguir recibiendo visitas desde enlaces viejos.
export async function deleteProduct(productId: string, formData: FormData): Promise<void> {
  const confirmation = String(formData.get('sku') ?? '').trim();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { sku: true, publishedAt: true },
  });
  if (!product || product.publishedAt !== null) return;

  // Se pide teclear el SKU para borrar. Un boton de confirmacion se acepta en
  // automatico; teclear la clave del producto obliga a mirar cual es.
  if (confirmation !== product.sku) return;

  await prisma.product.delete({ where: { id: productId } });
  revalidatePath('/productos');
  redirect('/productos');
}
