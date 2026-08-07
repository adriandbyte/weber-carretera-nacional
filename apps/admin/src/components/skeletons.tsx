import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Esqueletos de carga.
//
// Cada pantalla del panel consulta la base antes de poder pintar nada, y hasta
// que responde el navegador se queda en la pagina anterior sin ninguna señal de
// que algo esta pasando. Con 331 productos eso es medio segundo largo en el que
// parece que el clic no funciono y se vuelve a hacer clic.
//
// Los esqueletos calcan la forma real de cada pantalla (mismas alturas, mismas
// columnas, mismo numero de tarjetas) para que el contenido no salte al llegar.
// Un esqueleto generico solo cambiaria una espera vacia por una espera gris.
//
// Viven aqui y no dentro de cada loading.tsx porque la lista de productos
// reutiliza el de la tabla en su propio Suspense al cambiar de filtro.
// ---------------------------------------------------------------------------

/// Envoltura comun. `role="status"` hace que un lector de pantalla anuncie que
/// se esta cargando en lugar de leer la nada; `aria-hidden` en las piezas evita
/// que ademas intente describir cada barra gris.
export function LoadingRegion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando" className={className}>
      <div aria-hidden>{children}</div>
    </div>
  );
}

/// Mismas medidas que PageHeader: enlace de vuelta, titulo de 2xl y bajada.
export function PageHeaderSkeleton({
  back = false,
  description = true,
  actions = false,
}: {
  back?: boolean;
  description?: boolean;
  actions?: boolean;
}) {
  return (
    <div className="mb-6">
      {back && <Skeleton className="mb-2 h-4 w-24" />}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-8 w-56" />
          {description && <Skeleton className="mt-2 h-4 w-full max-w-lg" />}
        </div>
        {actions && <Skeleton className="h-9 w-40 shrink-0" />}
      </div>
    </div>
  );
}

/// La tabla de productos: seis columnas de ancho fijo y la miniatura cuadrada
/// que marca la altura de la fila.
export function ProductTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
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
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row} className="hover:bg-transparent">
              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-md" />
                  {/* Anchos alternos: todas las filas del mismo largo se leen
                      como una tabla ya cargada y vacia, no como algo en camino. */}
                  <Skeleton className={row % 3 === 0 ? 'h-4 w-72' : 'h-4 w-56'} />
                </div>
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-3.5 w-16" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="ml-auto h-4 w-16" />
              </TableCell>
              <TableCell className="px-4">
                <Skeleton className="h-5 w-20 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/// Rejilla de tarjetas con titulo y bajada: la usan Catalogos y, con otra
/// cuenta de columnas, el resumen.
export function CardGridSkeleton({
  cards = 6,
  className = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
}: {
  cards?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: cards }, (_, card) => (
        <Card key={card} className="h-full">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
