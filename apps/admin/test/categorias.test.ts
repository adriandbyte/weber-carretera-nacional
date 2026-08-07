// Prueba de las escrituras de categorias.
//
// Importan dos cosas que no se ven hasta que ya es tarde: que no se pueda
// vaciar una seccion de la tienda borrando su categoria, y que el slug no se
// mueva al editar. El slug es la direccion por la que la tienda filtra, y
// cambiarlo rompe enlaces sin avisar a nadie.
import { prisma } from '@weber/db';
import { categorySchema, nextCategorySlug } from '@weber/core';
import { check } from './harness';

export async function correr() {
  const conProductos = await prisma.category.findFirst({
    where: { products: { some: {} } },
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  });
  check('hay una categoria con productos que probar', conProductos !== null, true);
  if (!conProductos) return;

  const { deleteCategory } = await import('../src/app/catalogos/categorias/actions');

  // --- No se vacia una seccion por accidente ------------------------------
  const antes = await prisma.category.count();
  const borrado = new FormData();
  borrado.set('id', conProductos.id);
  const resultado = await deleteCategory({ ok: false }, borrado);

  check('una categoria con productos no se borra', await prisma.category.count(), antes);
  check('el borrado rechazado se reporta', resultado.ok, false);
  check(
    'el mensaje dice cuantos productos hay dentro',
    resultado.message?.includes(String(conProductos._count.products)),
    true,
  );

  // --- El slug no se mueve al editar --------------------------------------
  //
  // No se llama a updateCategory: esa accion usa revalidatePath, que solo
  // existe dentro de Next y revienta fuera del servidor. La decision del slug
  // vive aparte justo para poder comprobarla aqui.
  check(
    'guardar sin tocar el nombre deja el slug quieto',
    nextCategorySlug(conProductos.name, conProductos),
    conProductos.slug,
  );
  check(
    'los espacios de sobra no cuentan como cambio de nombre',
    nextCategorySlug(`  ${conProductos.name}  `, conProductos),
    conProductos.slug,
  );
  check(
    'cambiar el nombre si mueve el slug',
    nextCategorySlug('Asadores de Gas', conProductos),
    'asadores-de-gas',
  );

  // --- Los limites de los textos para buscadores --------------------------
  const base = { name: 'Gas', description: '', position: '0', active: true };
  check(
    'un meta titulo de mas de 70 se rechaza',
    categorySchema.safeParse({ ...base, metaTitle: 'x'.repeat(71), metaDescription: '' }).success,
    false,
  );
  check(
    'una meta descripcion de mas de 160 se rechaza',
    categorySchema.safeParse({ ...base, metaTitle: '', metaDescription: 'x'.repeat(161) }).success,
    false,
  );
  check(
    'vacios se aceptan y se rellenan solos en el servidor',
    categorySchema.safeParse({ ...base, metaTitle: '', metaDescription: '' }).success,
    true,
  );
}
