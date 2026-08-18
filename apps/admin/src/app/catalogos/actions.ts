'use server';

// ---------------------------------------------------------------------------
// Escrituras de los catalogos.
//
// La regla que importa: nunca se borra un valor que algun producto este
// usando. Si se borrara, esos productos perderian su tipo o su color sin que
// nadie se entere, y el error solo aparecería semanas despues en la tienda.
// En su lugar se ofrece desactivar: deja de aparecer en los dropdowns pero
// los productos que ya lo tienen lo conservan.
// ---------------------------------------------------------------------------

import { revalidatePath } from 'next/cache';
import { catalogSchema, slugify } from '@weber/core';
import { CATALOGS } from '@/lib/catalogos';

export interface CatalogState {
  ok: boolean;
  message?: string;
  /// Por campo, para que el error se lea pegado al input que hay que corregir.
  errors?: Record<string, string[]>;
}

/// Valida contra el mismo esquema que documenta la forma de un catalogo.
///
/// Antes habia aqui una funcion `validate` escrita a mano que repetia, con
/// otras palabras, lo que catalogSchema ya decia en @weber/core. Dos listas de
/// reglas para lo mismo terminan separandose: la del esquema aceptaba nombres
/// que la de aqui rechazaba, y ninguna de las dos era la verdadera.
function parseForm(formData: FormData) {
  return catalogSchema.safeParse({
    name: formData.get('name') ?? '',
    hex: formData.get('hex') ?? '',
    position: formData.get('position') ?? '',
    active: formData.get('active') === 'on',
  });
}

/// Los errores repartidos por campo.
///
/// Antes se devolvia solo el primer mensaje y salia como aviso flotante. Con el
/// formulario dentro de una ventana eso no vale: el aviso se va solo a los
/// segundos y deja la ventana abierta sin decir que estaba mal ni donde.
function fieldErrors(error: import('zod').ZodError): CatalogState {
  return {
    ok: false,
    message: 'Revisa los campos marcados.',
    errors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

export async function createCatalogItem(
  key: string,
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const catalog = CATALOGS[key];
  if (!catalog?.create) return { ok: false, message: 'Ese catálogo no existe.' };

  const parsed = parseForm(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  const input = parsed.data;

  // El slug se deriva del nombre, igual que en productos: no es algo que
  // quien administra el catalogo tenga que inventar.
  const slug = slugify(input.name);
  const existing = await catalog.list();
  if (existing.some((row) => row.slug === slug)) {
    return {
      ok: false,
      message: `Ya existe un ${catalog.singular} con ese nombre.`,
      errors: { name: [`Ya hay otro ${catalog.singular} que se llama así`] },
    };
  }

  await catalog.create({ slug, name: input.name, position: input.position, hex: input.hex });
  revalidatePath(`/catalogos/${key}`);
  return { ok: true, message: `Se agregó "${input.name}".` };
}

export async function updateCatalogItem(
  key: string,
  id: string,
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const catalog = CATALOGS[key];
  if (!catalog?.update) return { ok: false, message: 'Ese catálogo no existe.' };

  const parsed = parseForm(formData);
  if (!parsed.success) return fieldErrors(parsed.error);
  const input = parsed.data;

  const rows = await catalog.list();
  const current = rows.find((row) => row.id === id);
  if (!current) return { ok: false, message: 'Ese valor ya no existe.' };

  // El slug solo se regenera si el nombre cambio de verdad. Es la direccion
  // por la que se filtra en la tienda, y moverla sin necesidad rompe enlaces.
  const slug = input.name === current.name ? current.slug : slugify(input.name);
  if (slug !== current.slug && rows.some((row) => row.id !== id && row.slug === slug)) {
    return {
      ok: false,
      message: `Ya existe otro ${catalog.singular} con ese nombre.`,
      errors: { name: [`Ya hay otro ${catalog.singular} que se llama así`] },
    };
  }

  await catalog.update(id, {
    slug,
    name: input.name,
    position: input.position,
    active: input.active,
    hex: input.hex,
  });
  revalidatePath(`/catalogos/${key}`);
  return { ok: true, message: 'Cambios guardados.' };
}

export async function deleteCatalogItem(
  key: string,
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const catalog = CATALOGS[key];
  if (!catalog?.remove) return { ok: false, message: 'Ese catálogo no existe.' };

  const id = String(formData.get('id') ?? '');
  const rows = await catalog.list();
  const target = rows.find((row) => row.id === id);

  if (!target) return { ok: false, message: 'Ese valor ya no existe.' };

  // Sin esta guarda, borrar "Gas" dejaria 33 asadores sin combustible.
  // La pantalla ya esconde el boton cuando hay uso, pero un formulario se
  // puede reenviar a mano y la comprobacion tiene que estar de este lado.
  //
  // Antes se devolvia sin mas y la pantalla se quedaba igual, sin explicar por
  // que: quien lo intentaba concluia que el panel estaba roto.
  if (target.usage > 0) {
    return {
      ok: false,
      message:
        `No se puede eliminar: ${target.usage} ${target.usage === 1 ? 'producto lo usa' : 'productos lo usan'}. ` +
        'Edítalo y desmarca "Visible" para que deje de aparecer en los menús.',
    };
  }

  await catalog.remove(id);
  revalidatePath(`/catalogos/${key}`);
  return { ok: true, message: `Se eliminó "${target.name}".` };
}
