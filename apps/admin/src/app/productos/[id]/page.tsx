import { notFound } from 'next/navigation';
import { prisma } from '@weber/db';
import { deleteImage, saveProduct, setPrimaryImage, uploadImage } from './actions';
import { ProductForm } from './product-form';
import { ImageManager } from './image-manager';

export const dynamic = 'force-dynamic';

/// Forma minima de un dropdown. Ver la nota en las consultas de abajo.
const OPTION = { id: true, name: true } as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product?.name ?? 'Producto' };
}

export default async function ProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, productTypes, fuelTypes, series, formats, colors, sizes, categories] =
    await Promise.all([
      prisma.product.findUnique({
        where: { id },
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }] },
          categories: { orderBy: { position: 'asc' } },
          compatibility: true,
        },
      }),
      // Solo id y name cruzan al componente de cliente. Una fila completa
      // arrastra Decimal y Date, que React no puede serializar y que rompen
      // la hidratacion del formulario en silencio.
      prisma.productType.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        select: { ...OPTION, slug: true },
      }),
      prisma.fuelType.findMany({ where: { active: true }, orderBy: { position: 'asc' }, select: OPTION }),
      prisma.series.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: OPTION }),
      prisma.format.findMany({ where: { active: true }, orderBy: { position: 'asc' }, select: OPTION }),
      prisma.color.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: OPTION }),
      prisma.sizeOption.findMany({ where: { active: true }, orderBy: { position: 'asc' }, select: OPTION }),
      prisma.category.findMany({ where: { active: true }, orderBy: { position: 'asc' }, select: OPTION }),
    ]);

  if (!product) notFound();

  const pendingCount = await prisma.product.count({ where: { needsReview: true } });

  // "Compatible con" solo aplica a lo que acompaña a un asador. Mostrar 17
  // casillas de series en la ficha de un asador es ruido puro.
  const equipmentTypeIds = productTypes
    .filter((type) => ['asador', 'ahumador', 'plancha'].includes(type.slug))
    .map((type) => type.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <a href="/productos" className="text-sm text-carbon-400 hover:text-carbon-700">
            ← Productos
          </a>
          <h1 className="mt-1 font-display text-2xl font-bold text-carbon-900">{product.name}</h1>
          <p className="mt-1 text-sm text-carbon-400">SKU {product.sku}</p>
        </div>
        {product.needsReview && product.reviewNote && (
          <p className="max-w-sm rounded-card border border-ember-300 bg-ember-100 px-4 py-3 text-sm text-ember-700">
            <span className="font-semibold">Pendiente:</span> {product.reviewNote}
            <span className="mt-1 block text-xs">
              Quedan {pendingCount} productos por revisar.
            </span>
          </p>
        )}
      </div>

      <ImageManager
        images={product.images}
        uploadAction={uploadImage.bind(null, product.id)}
        deleteAction={deleteImage}
        setPrimaryAction={setPrimaryImage}
      />

      <div className="mt-6">
        <ProductForm
          action={saveProduct.bind(null, product.id)}
          catalogs={{ productTypes, fuelTypes, series, formats, colors, sizes, categories }}
          equipmentTypeIds={equipmentTypeIds}
          values={{
            name: product.name,
            shortDescription: product.shortDescription,
            description: product.description,
            status: product.status,
            // Decimal de Prisma no cruza a un componente de cliente tal cual:
            // se manda como texto, que es como lo espera el input.
            // toFixed(2) y no toString(): Decimal descarta los decimales
            // cero, y ver "12499" donde se capturo "12499.00" hace dudar de
            // si el dato se guardo bien.
            price: product.price?.toFixed(2) ?? null,
            compareAtPrice: product.compareAtPrice?.toFixed(2) ?? null,
            productTypeId: product.productTypeId,
            fuelTypeId: product.fuelTypeId,
            seriesId: product.seriesId,
            formatId: product.formatId,
            colorId: product.colorId,
            sizeId: product.sizeId,
            categoryIds: product.categories.map((c) => c.categoryId),
            compatibleSeriesIds: product.compatibility.map((c) => c.seriesId),
            needsReview: product.needsReview,
            reviewNote: product.reviewNote,
          }}
        />
      </div>
    </div>
  );
}
