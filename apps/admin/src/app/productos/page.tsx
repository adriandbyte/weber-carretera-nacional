import Link from 'next/link';
import { ImageOff, Plus, Search } from 'lucide-react';
import { prisma, type Prisma } from '@weber/db';
import { formatMoney, pluralize, STATUS_LABEL } from '@weber/core';
import { Pagination } from '@/components/pagination';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      <PageHeader
        title="Productos"
        description={
          <>
            {pluralize(total, 'producto')}
            {totalPages > 1 && ` · página ${page} de ${totalPages}`}
          </>
        }
        actions={
          <Button asChild size="lg">
            <Link href="/productos/nuevo">
              <Plus data-icon="inline-start" />
              Nuevo producto
            </Link>
          </Button>
        }
      />

      {/* Los filtros son navegacion, no un control de formulario: cada uno
          tiene su URL. Por eso son enlaces con el aspecto de boton y no un
          grupo de alternancia, que ademas perderia el poder abrirlos en otra
          pestaña. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(FILTERS).map(([key, filter]) => (
          <Button
            key={key}
            asChild
            variant={key === filterKey ? 'default' : 'outline'}
            aria-current={key === filterKey ? 'page' : undefined}
          >
            <Link href={`/productos?filtro=${key}&orden=${sortKey}`}>{filter.label}</Link>
          </Button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <form action="/productos" className="flex items-center gap-2">
          <input type="hidden" name="filtro" value={filterKey} />
          <input type="hidden" name="orden" value={sortKey} />
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar por nombre o SKU"
              className="w-72 bg-card pl-8"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
          {search && (
            <Button asChild variant="ghost">
              <Link href={`/productos?filtro=${filterKey}`}>Limpiar</Link>
            </Button>
          )}
        </form>

        <form action="/productos" className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="hidden" name="filtro" value={filterKey} />
          {search && <input type="hidden" name="q" value={search} />}
          <label htmlFor="orden" className="whitespace-nowrap">
            Ordenar por
          </label>
          <NativeSelect id="orden" name="orden" defaultValue={sortKey} className="w-52 bg-card">
            {Object.entries(SORTS).map(([key, sort]) => (
              <option key={key} value={key}>
                {sort.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="submit" variant="outline">
            Aplicar
          </Button>
        </form>
      </div>

      <Card className="mt-4 gap-0 py-0">
        <Table className="min-w-[52rem] table-fixed">
          <colgroup>
            <col />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-32" />
            <col className="w-32" />
            <col className="w-32" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 text-muted-foreground">Producto</TableHead>
              <TableHead className="px-4 text-muted-foreground">SKU</TableHead>
              <TableHead className="px-4 text-muted-foreground">Tipo</TableHead>
              <TableHead className="px-4 text-muted-foreground">Serie</TableHead>
              <TableHead className="px-4 text-right text-muted-foreground">Precio</TableHead>
              <TableHead className="px-4 text-muted-foreground">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                  Ningún producto coincide con este filtro.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="px-4 py-3 whitespace-normal">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-foreground/10 ${
                        product.images[0] ? 'bg-photo' : 'bg-muted'
                      }`}
                    >
                      {product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt=""
                          className="size-full object-contain"
                        />
                      ) : (
                        <ImageOff className="size-4 text-muted-foreground/60" />
                      )}
                    </div>
                    {/* La etiqueta va pegada al nombre y no alineada al borde
                        de la columna: separada por medio ancho de tabla ya no
                        se lee como algo que le pasa a ese producto. */}
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        href={`/productos/${product.id}`}
                        className="line-clamp-2 font-medium transition-colors hover:text-primary"
                      >
                        {product.name}
                      </Link>
                      {product.needsReview && (
                        <Badge
                          variant="warning"
                          title={product.reviewNote ?? undefined}
                          className="shrink-0 cursor-help"
                        >
                          Revisar
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 font-mono text-xs text-muted-foreground">
                  {product.sku}
                </TableCell>
                <TableCell className="truncate px-4 text-muted-foreground">
                  {product.productType?.name ?? '-'}
                </TableCell>
                <TableCell className="truncate px-4 text-muted-foreground">
                  {product.series?.name ?? '-'}
                </TableCell>
                <TableCell className="px-4 text-right tabular-nums">
                  {formatMoney(product.price) ?? (
                    <span className="text-muted-foreground/60">-</span>
                  )}
                </TableCell>
                <TableCell className="px-4">
                  <Badge variant={product.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {STATUS_LABEL[product.status] ?? product.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Pagination page={page} totalPages={totalPages} hrefFor={(p) => queryFor({ pagina: p })} />
    </div>
  );
}
