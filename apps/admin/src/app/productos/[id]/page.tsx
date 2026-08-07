import { notFound } from 'next/navigation';
import { prisma } from '@weber/db';
import { acceptsCompatibility, findPending } from '@weber/core';
import { countPending } from '@/lib/productos';
import { PageHeader } from '@/components/page-header';
import { deleteImage, saveProduct, setPrimaryImage, uploadImage } from './actions';
import { ProductForm } from './product-form';
import { ImageManager } from './image-manager';
import { DangerZone } from './danger-zone';
import { PendingList } from './pending-list';
import { deleteProduct } from '../nuevo/actions';

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
      prisma.fuelType.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        select: OPTION,
      }),
      prisma.series.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: OPTION }),
      prisma.format.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        select: OPTION,
      }),
      prisma.color.findMany({ where: { active: true }, orderBy: { name: 'asc' }, select: OPTION }),
      prisma.sizeOption.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        select: OPTION,
      }),
      prisma.category.findMany({
        where: { active: true },
        orderBy: { position: 'asc' },
        select: OPTION,
      }),
    ]);

  if (!product) notFound();

  // Cuenta lo mismo que recorre "Guardar y seguir". Cuando contaba solo
  // needsReview decia 104 mientras el boton encadenaba 331: el numero de la
  // cabecera no era el del trabajo que quedaba.
  const pendingCount = await countPending();

  const pending = findPending({
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    imageCount: product.images.length,
    categoryCount: product.categories.length,
    hasProductType: product.productTypeId !== null,
  });

  // "Compatible con" solo aplica a lo que acompaña a un asador. Mostrar 17
  // casillas de series en la ficha de un asador es ruido puro.
  //
  // La regla viene de @weber/core para que la pantalla y el guardado usen la
  // misma: cuando cada uno tenia la suya, esconder el bloque borraba datos.
  const equipmentTypeIds = productTypes
    .filter((type) => !acceptsCompatibility(type.slug))
    .map((type) => type.id);

  return (
    <div>
      <PageHeader
        back={{ href: '/productos', label: 'Productos' }}
        title={product.name}
        description={
          <>
            SKU <span className="font-mono text-xs">{product.sku}</span>
          </>
        }
        actions={
          <span className="text-muted-foreground text-sm">
            Quedan <span className="tabular-nums">{pendingCount}</span> productos por limpiar
          </span>
        }
      />

      <div className="mb-6">
        <PendingList items={pending} />
      </div>

      <div>
        <ProductForm
          action={saveProduct.bind(null, product.id)}
          media={
            <ImageManager
              images={product.images}
              uploadAction={uploadImage.bind(null, product.id)}
              deleteAction={deleteImage}
              setPrimaryAction={setPrimaryImage}
            />
          }
          catalogs={{ productTypes, fuelTypes, series, formats, colors, sizes, categories }}
          equipmentTypeIds={equipmentTypeIds}
          values={{
            name: product.name,
            slug: product.slug,
            published: product.publishedAt !== null,
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

      <DangerZone
        sku={product.sku}
        canDelete={product.publishedAt === null}
        action={deleteProduct.bind(null, product.id)}
      />
    </div>
  );
}
