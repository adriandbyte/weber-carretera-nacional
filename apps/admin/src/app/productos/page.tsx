import type { Metadata } from 'next';
import { Suspense, cache } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ImageOff, Plus, Search } from 'lucide-react';
import { prisma, type Prisma } from '@weber/db';
import { formatMoney, pluralize, STATUS_LABEL } from '@weber/core';
import { PENDING_WHERE, countPending } from '@/lib/productos';
import { Pagination } from '@/components/pagination';
import { PageHeader } from '@/components/page-header';
import { ProductTableSkeleton } from '@/components/skeletons';
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

export const metadata: Metadata = { title: 'Productos' };

/// Siempre lee de la base, nunca de cache: es la pantalla a la que se vuelve
/// despues de guardar, y ahi el cambio tiene que verse de inmediato.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

/// Tres vistas, y solo dos siempre visibles: el catalogo, lo archivado, y los
/// pendientes cuando hay pendientes.
///
/// Eran nueve, y tenian sentido cuando cada campo del catalogo estaba vacio en
/// cientos de productos y habia que atacarlos por tandas. Con el catalogo
/// cargado, siete de esos filtros devuelven cero o devuelven todo, y una fila
/// de botones donde solo uno hace algo se lee como que el panel esta roto. Esa
/// misma razon es la que esconde "Pendientes" cuando esta en cero, en vez de
/// borrarlo: el trabajo de capturar apenas empieza y cualquier ficha guardada
/// a medias vuelve a caer ahi.
///
/// "Pendientes" es la misma condicion que cuenta la cabecera de la ficha y la
/// misma que decide si un producto se puede publicar: PENDING_WHERE.
///
/// "Todos" son todos los del catalogo, no los de la base: lo archivado y lo
/// descontinuado se queda fuera. Son productos que alguien decidio sacar de la
/// tienda, y mezclarlos con el trabajo del dia hace dudar de cada uno -"¿este
/// paquete tenia que estar aqui?"- ademas de contradecir el contador, que ya
/// los excluye.
///
/// Pero tienen su propio filtro y no desaparecen: el cliente pidio poder
/// reactivar rapido los colores del Q1200 si Weber los vuelve a surtir, y el
/// nombre de los paquetes guarda la receta de lo que incluyen. Un producto que
/// no se puede encontrar es lo mismo que uno borrado.
const EN_CATALOGO: Prisma.ProductWhereInput = {
  status: { notIn: ['ARCHIVED', 'DISCONTINUED'] },
};

const FILTERS: Record<string, { label: string; where: Prisma.ProductWhereInput }> = {
  todos: { label: 'Todos', where: EN_CATALOGO },
  pendientes: { label: 'Pendientes', where: PENDING_WHERE },
  archivados: {
    label: 'Archivados',
    where: { status: { in: ['ARCHIVED', 'DISCONTINUED'] } },
  },
};

const SORTS: Record<string, { label: string; orderBy: Prisma.ProductOrderByWithRelationInput[] }> =
  {
    nombre: { label: 'Nombre', orderBy: [{ name: 'asc' }] },
    sku: { label: 'SKU', orderBy: [{ sku: 'asc' }] },
    revisar: { label: 'Por revisar primero', orderBy: [{ needsReview: 'desc' }, { name: 'asc' }] },
    recientes: { label: 'Editados al final', orderBy: [{ updatedAt: 'desc' }] },
  };

/// El filtro y la busqueda, traducidos a una condicion de Prisma.
///
/// Se combinan con AND y no fundiendo los dos objetos: el filtro de pendientes
/// ya usa OR por dentro, asi que al fundirlos la busqueda le pisaba ese OR y
/// buscar dentro de "Pendientes" devolvia resultados de todo el catalogo.
function buildWhere(filterKey: string, search: string): Prisma.ProductWhereInput {
  const filtro = FILTERS[filterKey]!.where;
  if (!search) return filtro;

  return {
    AND: [
      filtro,
      {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku: { contains: search, mode: 'insensitive' as const } },
        ],
      },
    ],
  };
}

/// El total lo piden dos sitios: el encabezado, para decir cuantos productos
/// hay, y la tabla, para saber cuantas paginas son. `cache` de React hace que
/// sigan siendo una sola consulta por peticion. Las llaves son cadenas a
/// proposito: memoiza por identidad de argumentos, asi que un objeto `where`
/// recien construido no acertaria nunca.
const countProducts = cache((filterKey: string, search: string) =>
  prisma.product.count({ where: buildWhere(filterKey, search) }),
);

type Query = { filterKey: string; sortKey: string; search: string; page: number };

/// Un filtro de la barra. La busqueda viaja con el: sin esto, buscar "genesis"
/// y pulsar otro filtro perdia el termino sin avisar, y la lista que salia
/// parecia el resultado de la busqueda.
function FilterLink({
  filterKey,
  active,
  sortKey,
  search,
  label,
}: {
  filterKey: string;
  active: string;
  sortKey: string;
  search: string;
  label?: string;
}) {
  const query = new URLSearchParams({
    filtro: filterKey,
    orden: sortKey,
    ...(search ? { q: search } : {}),
  });

  return (
    <Button
      asChild
      variant={filterKey === active ? 'default' : 'outline'}
      aria-current={filterKey === active ? 'page' : undefined}
    >
      <Link href={`/productos?${query}`}>{label ?? FILTERS[filterKey]!.label}</Link>
    </Button>
  );
}

/// "Pendientes" con su cuenta, y solo si hay alguno.
///
/// Se muestra tambien cuando esta seleccionado aunque devuelva cero: si el
/// filtro activo desapareciera de la barra, la pantalla diria "0 productos"
/// sin nada marcado y nadie sabria de donde salio esa lista vacia.
async function PendingFilterLink({
  active,
  sortKey,
  search,
}: {
  active: string;
  sortKey: string;
  search: string;
}) {
  const total = await countPending();
  if (total === 0 && active !== 'pendientes') return null;

  return (
    <FilterLink
      filterKey="pendientes"
      active={active}
      sortKey={sortKey}
      search={search}
      label={`Pendientes ${total}`}
    />
  );
}

/// Va dentro del encabezado, en su propio Suspense: es una consulta mas y no
/// tiene por que retrasar el titulo ni los filtros.
async function TotalLabel({ filterKey, search, page }: Omit<Query, 'sortKey'>) {
  const total = await countProducts(filterKey, search);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <>
      {pluralize(total, 'producto')}
      {totalPages > 1 && ` · página ${page} de ${totalPages}`}
    </>
  );
}

/// La tabla y su paginacion. Es lo unico que espera a la base, asi que es lo
/// unico que se sustituye por el esqueleto al cambiar de filtro o de pagina:
/// los botones de filtro y el buscador se quedan quietos y siguen respondiendo.
async function ProductTable({ filterKey, sortKey, search, page }: Query) {
  const where = buildWhere(filterKey, search);

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
    countProducts(filterKey, search),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hrefFor = (targetPage: number) => {
    const query = new URLSearchParams({ filtro: filterKey, orden: sortKey });
    if (search) query.set('q', search);
    query.set('pagina', String(targetPage));
    return `/productos?${query.toString()}`;
  };

  return (
    <>
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
              <TableHead className="text-muted-foreground px-4">Producto</TableHead>
              <TableHead className="text-muted-foreground px-4">SKU</TableHead>
              <TableHead className="text-muted-foreground px-4">Tipo</TableHead>
              <TableHead className="text-muted-foreground px-4">Serie</TableHead>
              <TableHead className="text-muted-foreground px-4 text-right">Precio</TableHead>
              <TableHead className="text-muted-foreground px-4">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-muted-foreground px-4 py-16 text-center">
                  Ningún producto coincide con este filtro.
                </TableCell>
              </TableRow>
            )}
            {products.map((product) => (
              // Todas las celdas arriba y con el mismo relleno: cuando el
              // nombre ocupa dos lineas, centrar el resto los dejaba flotando a
              // media altura y la fila se leia torcida. Alineadas arriba, la
              // primera linea de cada columna cae siempre en el mismo renglon.
              <TableRow key={product.id} className="[&>td]:py-3 [&>td]:align-top">
                <TableCell className="px-4 whitespace-normal">
                  <div className="flex items-start gap-3">
                    <div
                      className={`ring-foreground/10 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ${
                        product.images[0] ? 'bg-photo' : 'bg-muted'
                      }`}
                    >
                      {product.images[0] ? (
                        <Image
                          src={product.images[0].url}
                          // Decorativa: el nombre del producto va justo al lado
                          // y un lector de pantalla no gana nada leyendolo dos
                          // veces.
                          alt=""
                          width={40}
                          height={40}
                          className="size-full object-contain"
                        />
                      ) : (
                        <ImageOff className="text-muted-foreground/60 size-4" />
                      )}
                    </div>
                    {/* La etiqueta va pegada al nombre y no alineada al borde
                        de la columna: separada por medio ancho de tabla ya no
                        se lee como algo que le pasa a ese producto. */}
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <Link
                        href={`/productos/${product.id}`}
                        className="hover:text-primary line-clamp-2 font-medium transition-colors"
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
                {/* `leading-5` iguala la caja de linea del SKU (mas pequeño y
                    monoespaciado) a la de las demas columnas: sin esto se
                    apoyaba un par de pixeles mas arriba que el resto. */}
                <TableCell className="text-muted-foreground px-4 font-mono text-xs leading-5">
                  {product.sku}
                </TableCell>
                <TableCell className="text-muted-foreground truncate px-4">
                  {product.productType?.name ?? '-'}
                </TableCell>
                <TableCell className="text-muted-foreground truncate px-4">
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

      <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
    </>
  );
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; q?: string; orden?: string; pagina?: string }>;
}) {
  const params = await searchParams;
  const filterKey = params.filtro && params.filtro in FILTERS ? params.filtro : 'todos';
  // Por nombre y no por "revisar primero": ese orden llena la primera pagina
  // con los marcados y parece que no existen los demas productos.
  const sortKey = params.orden && params.orden in SORTS ? params.orden : 'nombre';
  const search = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.pagina) || 1);

  // La llave reinicia el Suspense en cada combinacion distinta. Sin ella React
  // mantendria la tabla anterior en pantalla mientras llega la nueva, y al
  // pulsar un filtro no pasaria nada visible durante medio segundo.
  const queryKey = `${filterKey}|${sortKey}|${search}|${page}`;

  return (
    <div>
      <PageHeader
        title="Productos"
        description={
          <Suspense
            // Un <div> dentro del <p> de la bajada no es HTML valido, asi que
            // este es el unico esqueleto que no usa el componente Skeleton.
            fallback={
              <span className="bg-muted inline-block h-4 w-40 animate-pulse rounded-md align-middle" />
            }
          >
            <TotalLabel filterKey={filterKey} search={search} page={page} />
          </Suspense>
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

      {/* Son navegacion, no un control de formulario: cada uno tiene su URL.
          Por eso son enlaces con el aspecto de boton y no un interruptor, que
          ademas perderia el poder abrirlos en otra pestaña. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <FilterLink filterKey="todos" active={filterKey} sortKey={sortKey} search={search} />
        {/* "Pendientes" solo existe cuando hay pendientes. Un boton que
            siempre devuelve cero se lee como que el panel esta roto, y fue
            justo la razon de recortar los nueve filtros que habia. Pero
            tampoco se borra: en cuanto alguien quite un precio, borre una
            categoria o cree un producto a medias, ese producto vuelve a estar
            pendiente y este es el unico sitio donde se encuentra.

            Va en su propio Suspense para no retrasar el resto de la barra por
            una cuenta, y con su numero al lado: si aparece, lo que importa es
            cuantos son. */}
        <Suspense fallback={null}>
          <PendingFilterLink active={filterKey} sortKey={sortKey} search={search} />
        </Suspense>
        <FilterLink filterKey="archivados" active={filterKey} sortKey={sortKey} search={search} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <form action="/productos" className="flex items-center gap-2">
          <input type="hidden" name="filtro" value={filterKey} />
          <input type="hidden" name="orden" value={sortKey} />
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar por nombre o SKU"
              className="bg-card w-72 pl-8"
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

        <form action="/productos" className="text-muted-foreground flex items-center gap-2 text-sm">
          <input type="hidden" name="filtro" value={filterKey} />
          {search && <input type="hidden" name="q" value={search} />}
          <label htmlFor="orden" className="whitespace-nowrap">
            Ordenar por
          </label>
          <NativeSelect id="orden" name="orden" defaultValue={sortKey} className="bg-card w-52">
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

      <Suspense key={queryKey} fallback={<ProductTableSkeleton />}>
        <ProductTable filterKey={filterKey} sortKey={sortKey} search={search} page={page} />
      </Suspense>
    </div>
  );
}
