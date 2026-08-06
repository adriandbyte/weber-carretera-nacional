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
              <a
                href={`/categoria/${category.slug}`}
                className="block rounded-card border border-carbon-200 p-5 transition hover:border-ember-500 hover:shadow-sm"
              >
                <span className="block font-semibold text-carbon-900">{category.name}</span>
                <span className="mt-1 block text-sm text-carbon-400">
                  {pluralize(category._count.products, 'producto')}
                </span>
              </a>
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
            {products.map((product) => (
              <li key={product.id} className="group">
                <a href={`/producto/${product.slug}`}>
                  <div className="aspect-square overflow-hidden rounded-card bg-steel-100">
                    {product.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.images[0].url}
                        alt={product.images[0].alt ?? product.name}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    )}
                  </div>
                  {product.series && (
                    <span className="mt-3 block text-xs uppercase tracking-wide text-carbon-400">
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
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-16 text-sm text-carbon-300">
        {publishedCount} publicados · {draftCount} en borrador
      </p>
    </div>
  );
}
