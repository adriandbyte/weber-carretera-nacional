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
import { slugify } from '@weber/core';
import { CATALOGS } from '@/lib/catalogos';

export interface CatalogState {
  ok: boolean;
  message?: string;
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

function readForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const hexRaw = String(formData.get('hex') ?? '').trim();
  const positionRaw = String(formData.get('position') ?? '').trim();
  return {
    name,
    hex: hexRaw === '' ? null : hexRaw,
    position: positionRaw === '' ? 0 : Number(positionRaw),
    active: formData.get('active') === 'on',
  };
}

function validate(input: ReturnType<typeof readForm>): string | null {
  if (input.name.length < 1) return 'Escribe un nombre.';
  if (input.name.length > 80) return 'El nombre no debe pasar de 80 caracteres.';
  if (!slugify(input.name)) return 'El nombre debe tener letras o números.';
  if (input.hex !== null && !HEX_PATTERN.test(input.hex)) {
    return 'El color debe ir en formato #RRGGBB, por ejemplo #1A1A1A.';
  }
  if (!Number.isInteger(input.position) || input.position < 0) {
    return 'El orden debe ser un número entero de 0 o más.';
  }
  return null;
}

export async function createCatalogItem(
  key: string,
  _prev: CatalogState,
  formData: FormData,
): Promise<CatalogState> {
  const catalog = CATALOGS[key];
  if (!catalog) return { ok: false, message: 'Ese catálogo no existe.' };

  const input = readForm(formData);
  const error = validate(input);
  if (error) return { ok: false, message: error };

  // El slug se deriva del nombre, igual que en productos: no es algo que
  // quien administra el catalogo tenga que inventar.
  const slug = slugify(input.name);
  const existing = await catalog.list();
  if (existing.some((row) => row.slug === slug)) {
    return { ok: false, message: `Ya existe un ${catalog.singular} con ese nombre.` };
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
  if (!catalog) return { ok: false, message: 'Ese catálogo no existe.' };

  const input = readForm(formData);
  const error = validate(input);
  if (error) return { ok: false, message: error };

  const rows = await catalog.list();
  const current = rows.find((row) => row.id === id);
  if (!current) return { ok: false, message: 'Ese valor ya no existe.' };

  // El slug solo se regenera si el nombre cambio de verdad. Es la direccion
  // por la que se filtra en la tienda, y moverla sin necesidad rompe enlaces.
  const slug = input.name === current.name ? current.slug : slugify(input.name);
  if (slug !== current.slug && rows.some((row) => row.id !== id && row.slug === slug)) {
    return { ok: false, message: `Ya existe otro ${catalog.singular} con ese nombre.` };
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

export async function deleteCatalogItem(key: string, formData: FormData): Promise<void> {
  const catalog = CATALOGS[key];
  if (!catalog) return;

  const id = String(formData.get('id') ?? '');
  const rows = await catalog.list();
  const target = rows.find((row) => row.id === id);

  // Sin esta guarda, borrar "Gas" dejaria 33 asadores sin combustible.
  // La pantalla ya esconde el boton cuando hay uso, pero un formulario se
  // puede reenviar a mano y la comprobacion tiene que estar de este lado.
  if (!target || target.usage > 0) return;

  await catalog.remove(id);
  revalidatePath(`/catalogos/${key}`);
}
