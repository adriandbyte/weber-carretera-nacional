import { prisma, type Prisma } from '@weber/db';
import { formatMoney, pluralize, STATUS_LABEL } from '@weber/core';

export const metadata = { title: 'Productos' };

/// Filtros rapidos que apuntan al trabajo pendiente. Son los mismos que
/// enlaza el resumen, para que un clic lleve directo a lo que falta.
const FILTERS: Record<string, { label: string; where: Prisma.ProductWhereInput }> = {
  todos: { label: 'Todos', where: {} },
  'sin-precio': { label: 'Sin precio', where: { price: null } },
  'sin-imagen': { label: 'Sin imagen', where: { images: { none: {} } } },
  revision: { label: 'Para revisar', where: { needsReview: true } },
  publicados: { label: 'Publicados', where: { status: 'ACTIVE' } },
  borradores: { label: 'Borradores', where: { status: 'DRAFT' } },
};

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filterKey = params.filtro && params.filtro in FILTERS ? params.filtro : 'todos';
  const search = params.q?.trim();

  const where: Prisma.ProductWhereInput = {
    ...FILTERS[filterKey]!.where,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ needsReview: 'desc' }, { name: 'asc' }],
      take: 100,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        series: true,
        fuelType: true,
        productType: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-carbon-900">Productos</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Object.entries(FILTERS).map(([key, filter]) => (
          <a
            key={key}
            href={`/productos?filtro=${key}`}
            className={`rounded-full px-3 py-1 text-sm ${
              key === filterKey
                ? 'bg-carbon-900 text-white'
                : 'bg-white text-carbon-600 hover:bg-carbon-100'
            }`}
          >
            {filter.label}
          </a>
        ))}
      </div>

      <form className="mt-4" action="/productos">
        <input type="hidden" name="filtro" value={filterKey} />
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Buscar por nombre o SKU"
          className="w-full max-w-sm rounded-md border border-carbon-200 px-3 py-2 text-sm"
        />
      </form>

      <p className="mt-4 text-sm text-carbon-400">
        {pluralize(total, 'producto')}
        {total > 100 ? ' (mostrando 100)' : ''}
      </p>

      <div className="mt-3 overflow-x-auto rounded-card border border-carbon-200 bg-white">
        {/* table-fixed con anchos declarados: sin esto el nombre del producto
            se come el ancho disponible y empuja precio y estado fuera de la
            vista, que es justo lo que se necesita ver de un vistazo. */}
        <table className="w-full min-w-[52rem] table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-28" />
          </colgroup>
          <thead className="border-b border-carbon-200 text-left text-carbon-400">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Serie</th>
              <th className="px-4 py-3 text-right font-medium">Precio</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-carbon-100 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-steel-100">
                      {product.images[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                      {/* Dos lineas en vez de truncar: los nombres de Weber son
                          largos y cortados a una linea se vuelven indistinguibles
                          entre si ("GENESIS E..." aparecia cuatro veces). */}
                      <a
                        href={`/productos/${product.id}`}
                        className="line-clamp-2 min-w-0 font-medium text-carbon-900 hover:text-ember-600"
                      >
                        {product.name}
                      </a>
                      {/* La nota completa va en el title: casi todas las filas
                          la tienen, y repetirla entera ahogaba la tabla. */}
                      {product.reviewNote && (
                        <span
                          title={product.reviewNote}
                          className="mt-0.5 shrink-0 cursor-help rounded-full bg-ember-100 px-2 py-0.5 text-xs font-medium text-ember-700"
                        >
                          Revisar
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-carbon-400">{product.sku}</td>
                <td className="px-4 py-3 text-carbon-500">{product.productType?.name ?? '-'}</td>
                <td className="px-4 py-3 text-carbon-500">{product.series?.name ?? '-'}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatMoney(product.price) ?? <span className="text-ember-600">Falta</span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-carbon-500">
                  {product.stock}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${
                      product.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-carbon-100 text-carbon-500'
                    }`}
                  >
                    {STATUS_LABEL[product.status] ?? product.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
