import type { Metadata } from 'next';
import { prisma } from '@weber/db';
import { pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import {
  createCategory,
  deleteCategory,
  removeCategoryImage,
  updateCategory,
  uploadCategoryImage,
} from './actions';
import { CategoryTable, NewCategoryDialog } from './category-table';

export const metadata: Metadata = { title: 'Categorías' };
export const dynamic = 'force-dynamic';

/// Pantalla propia, no la tabla generica de catalogos.
///
/// Esta ruta gana sobre /catalogos/[tipo] por ser estatica, asi que el enlace
/// del indice sigue funcionando sin cambiarlo.
///
/// Las otras seis listas solo alimentan un desplegable y con nombre y orden
/// tienen bastante. Una categoria ademas es una pagina de la tienda: su texto
/// de entrada, su imagen y sus etiquetas para buscadores no caben en aquella
/// tabla, y por eso hasta ahora no habia forma de tocarlos desde el panel.
export default async function CategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      imageUrl: true,
      metaTitle: true,
      metaDescription: true,
      position: true,
      active: true,
      _count: { select: { products: true } },
    },
  });

  const rows = categories.map(({ _count, ...category }) => ({
    ...category,
    productCount: _count.products,
  }));

  const sinImagen = rows.filter((row) => !row.imageUrl).length;

  return (
    <div>
      <PageHeader
        back={{ href: '/catalogos', label: 'Catálogos' }}
        title="Categorías"
        description="Las secciones del menú de la tienda. Cada una tiene su texto de entrada, su imagen y sus etiquetas para buscadores."
        actions={
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm tabular-nums">
              {pluralize(rows.length, 'categoría', 'categorías')}
              {sinImagen > 0 && ` · ${sinImagen} sin imagen`}
            </span>
            <NewCategoryDialog action={createCategory} />
          </div>
        }
      />

      <CategoryTable
        rows={rows}
        actions={{
          create: createCategory,
          update: updateCategory,
          remove: deleteCategory,
          uploadImage: uploadCategoryImage,
          removeImage: removeCategoryImage,
        }}
      />
    </div>
  );
}
