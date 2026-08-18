// Reglas de las categorias que no dependen de la base.
//
// Importa que el slug no se mueva al editar: es la direccion por la que la
// tienda filtra, y cambiarlo rompe enlaces sin avisar a nadie.
//
// No se llama a updateCategory: esa accion usa revalidatePath, que solo existe
// dentro de Next y revienta fuera del servidor. La decision del slug vive
// aparte justo para poder comprobarla aqui.
//
// La otra mitad de lo que habia (que una categoria con productos no se borre)
// esta en borrado.test.ts, ya sin base: era una regla sobre un numero.
import { categorySchema, nextCategorySlug } from '@weber/core';
import { check } from './harness';

/// Una categoria inventada, con la forma que devuelve la consulta.
const CATEGORIA = { name: 'Asadores de Carbón', slug: 'asadores-de-carbon' };

export async function correr() {
  check(
    'guardar sin tocar el nombre deja el slug quieto',
    nextCategorySlug(CATEGORIA.name, CATEGORIA),
    CATEGORIA.slug,
  );
  check(
    'los espacios de sobra no cuentan como cambio de nombre',
    nextCategorySlug(`  ${CATEGORIA.name}  `, CATEGORIA),
    CATEGORIA.slug,
  );
  check(
    'cambiar el nombre si mueve el slug',
    nextCategorySlug('Asadores de Gas', CATEGORIA),
    'asadores-de-gas',
  );

  // Un slug heredado que no se parece a su nombre tampoco se toca mientras el
  // nombre no cambie: es el caso de las categorias que vienen del Excel.
  const heredada = { name: 'Gas', slug: 'gas-lp-y-natural' };
  check(
    'un slug heredado sobrevive si el nombre no cambia',
    nextCategorySlug('Gas', heredada),
    'gas-lp-y-natural',
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
