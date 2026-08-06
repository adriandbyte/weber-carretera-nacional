import { prisma, type Prisma } from '@weber/db';
import { formatMoney, pluralize, STATUS_LABEL } from '@weber/core';
import { Pagination } from '@/components/pagination';

export const metadata = { title: 'Productos' };

/// Siempre lee de la base, nunca de cache: es la pantalla a la que se vuelve
/// despues de guardar, y ahi el cambio tiene que verse de inmediato.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const FILTERS: Record<string, { label: string; where: Prisma.ProductWhereInput }> = {
  todos: { label: 'Todos', where: {} },
  revision: { label: 'Por revisar', where: { needsReview: true } },
  listos: { label: 'Revisados', where: { needsReview: false } },
  'sin-imagen': { label: 'Sin imagen', where: { images: { none: {} } } },
  'sin-descripcion': { label: 'Sin descripción', where: { description: null } },
  publicados: { label: 'Publicados', where: { status: 'ACTIVE' } },
  borradores: { label: 'Borradores', where: { status: 'DRAFT' } },
};

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> = {
  nombre: { label: 'Nombre', orderBy: [{ name: 'asc' }] },
  sku: { label: 'SKU', orderBy: [{ sku: 'asc' }] },
  revisar: { label: 'Por revisar primero', orderBy: [{ needsReview: 'desc' }, { name: 'asc' }] },
  recientes: { label: 'Editados al final', orderBy: [{ updatedAt: 'desc' }] },
};

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string; orden?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const filterKey = params.filtro && params.filtro in FILTERS ? params.filtro : 'todos';
  // Por nombre y no por "revisar primero": con 104 marcados, ese orden llenaba
  // la primera pagina entera y parecia que no existian los demas productos.
  const sortKey = params.orden && params.orden in SORTS ? params.orden : 'nombre';
  const search = params.q?.trim();
  const page = Math.max(1, Number(params.pagina) || 1);

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
      orderBy: SORTS[sortKey]!.orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        series: true,
        productType: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryFor = (extra: Record<string, string | number>) => {
    const query = new URLSearchParams({ filtro: filterKey, orden: sortKey });
    if (search) query.set('q', search);
    for (const [key, value] of Object.entries(extra)) query.set(key, String(value));
    return `/productos?${query.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-carbon-900">Productos</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-carbon-400">
            {pluralize(total, 'producto')}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </p>
          <a
            href="/productos/nuevo"
            className="rounded-md bg-carbon-900 px-3 py-2 text-sm font-medium text-white hover:bg-carbon-700"
          >
            Nuevo producto
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {Object.entries(FILTERS).map(([key, filter]) => (
          <a
            key={key}
            href={`/productos?filtro=${key}&orden=${sortKey}`}
            className={`rounded-full px-3 py-1 text-sm transition ${
              key === filterKey
                ? 'bg-carbon-900 text-white'
                : 'bg-white text-carbon-600 hover:bg-carbon-100'
            }`}
          >
            {filter.label}
          </a>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <form action="/productos" className="flex items-center gap-2">
          <input type="hidden" name="filtro" value={filterKey} />
          <input type="hidden" name="orden" value={sortKey} />
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Buscar por nombre o SKU"
            className="w-72 rounded-md border border-carbon-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-carbon-900 px-3 py-2 text-sm text-white hover:bg-carbon-700"
          >
            Buscar
          </button>
          {search && (
            <a href={`/productos?filtro=${filterKey}`} className="text-sm text-carbon-400 underline">
              Limpiar
            </a>
          )}
        </form>

        <form action="/productos" className="flex items-center gap-2 text-sm text-carbon-400">
          <input type="hidden" name="filtro" value={filterKey} />
          {search && <input type="hidden" name="q" value={search} />}
          <label htmlFor="orden">Ordenar por</label>
          <select
            id="orden"
            name="orden"
            defaultValue={sortKey}
            className="rounded-md border border-carbon-200 bg-white px-2 py-1.5 text-carbon-700"
          >
            {Object.entries(SORTS).map(([key, sort]) => (
              <option key={key} value={key}>
                {sort.label}
              </option>
            ))}
          </select>
          <button type="submit" className="text-carbon-500 underline">
            Aplicar
          </button>
        </form>
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-carbon-200 bg-white">
        <table className="w-full min-w-[52rem] table-fixed text-sm">
          <colgroup>
            <col />
            <col className="w-24" />
            <col className="w-24" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
          </colgroup>
          <thead className="border-b border-carbon-200 text-left text-carbon-400">
            <tr>
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Serie</th>
              <th className="px-4 py-3 text-right font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-carbon-400">
                  Ningún producto coincide con este filtro.
                </td>
              </tr>
            )}
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
                      <a
                        href={`/productos/${product.id}`}
                        className="line-clamp-2 min-w-0 font-medium text-carbon-900 hover:text-ember-600"
                      >
                        {product.name}
                      </a>
                      {product.needsReview && (
                        <span
                          title={product.reviewNote ?? undefined}
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
                  {formatMoney(product.price) ?? <span className="text-carbon-300">-</span>}
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

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => queryFor({ pagina: p })} />
    </div>
  );
}
