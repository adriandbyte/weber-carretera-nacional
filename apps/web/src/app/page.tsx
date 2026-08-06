import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@weber/db';
import { formatMoney, pluralize } from '@weber/core';

/// La tienda se sirve estatica y se regenera cada minuto (ISR). Es lo que
/// da SEO y velocidad sin que el contenido quede congelado: al publicar algo
/// en el admin aparece solo, sin desplegar.
export const revalidate = 60;

/// Solo se muestra lo publicado. Los 331 productos entran como borrador,
/// asi que la tienda queda vacia a proposito hasta que haya precios.
export default async function HomePage() {
  const [categories, products, publishedCount, draftCount] = await Promise.all([
    prisma.category.findMany({
      where: { active: true, parentId: null },
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: { images: { where: { isPrimary: true }, take: 1 }, series: true },
    }),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'DRAFT' } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <section>
        <h1 className="font-display text-4xl font-bold text-carbon-900">
          Encuentra tu asador ideal
        </h1>
        <p className="mt-3 max-w-2xl text-carbon-500">
          Asadores Weber de gas, carbón y eléctricos. Compra en línea y recoge en tienda.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">Categorías</h2>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/categoria/${category.slug}`}
                className="block rounded-card border border-carbon-200 p-5 transition hover:border-ember-500 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
              >
                <span className="block font-semibold text-carbon-900">{category.name}</span>
                <span className="mt-1 block text-sm text-carbon-500">
                  {pluralize(category._count.products, 'producto')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
          Recién publicados
        </h2>
        {products.length === 0 ? (
          <p className="mt-4 rounded-card border border-dashed border-carbon-200 p-8 text-center text-carbon-400">
            Todavía no hay productos publicados. Hay {draftCount} en borrador esperando precio en el
            panel de administración.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.id} className="group">
                <Link
                  href={`/producto/${product.slug}`}
                  className="block rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember-500"
                >
                  <div className="relative aspect-square overflow-hidden rounded-card bg-steel-100">
                    {product.images[0] && (
                      <Image
                        src={product.images[0].url}
                        // El alt de la base describe la foto; el nombre del
                        // producto es el respaldo. Nunca vacio: estas imagenes
                        // son el contenido, no decoracion.
                        alt={product.images[0].alt ?? product.name}
                        fill
                        // Cuatro columnas en escritorio, tres en tableta y dos
                        // en movil. Sin esto el navegador se descarga la
                        // version de ancho completo para una miniatura.
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        // La primera fila entra en el primer pantallazo y es la
                        // que mide Google como LCP: se carga sin diferir.
                        priority={index < 4}
                        className="object-contain transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  {product.series && (
                    <span className="mt-3 block text-xs uppercase tracking-wide text-carbon-500">
                      {product.series.name}
                    </span>
                  )}
                  <span className="mt-1 block text-sm font-medium text-carbon-900">
                    {product.name}
                  </span>
                  {product.price && (
                    <span className="mt-1 block font-semibold text-carbon-900">
                      {formatMoney(product.price)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-16 text-sm text-carbon-400">
        {publishedCount} publicados · {draftCount} en borrador
      </p>
    </div>
  );
}
