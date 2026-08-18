import { LoadingRegion, PageHeaderSkeleton } from '@/components/skeletons';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/// Calca la tabla de categorias: siete filas, que son las que hay, y la
/// miniatura de la imagen a la izquierda del nombre. Sin este esqueleto propio
/// se heredaria el de /catalogos/[tipo], que dibuja doce filas sin miniatura y
/// se ve reacomodarse la pantalla entera al llegar los datos.
export default function Loading() {
  return (
    <LoadingRegion>
      <PageHeaderSkeleton back actions />

      <Card className="gap-0 py-0">
        <Table className="min-w-[46rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground px-4">Categoría</TableHead>
              <TableHead className="text-muted-foreground w-24 px-4 text-right">Orden</TableHead>
              <TableHead className="text-muted-foreground w-32 px-4 text-right">
                Productos
              </TableHead>
              <TableHead className="text-muted-foreground w-28 px-4">Estado</TableHead>
              <TableHead className="text-muted-foreground w-40 px-4">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 7 }, (_, row) => (
              <TableRow key={row} className="hover:bg-transparent">
                <TableCell className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <Skeleton className="size-10 shrink-0 rounded-md" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-4 w-6" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-4 w-8" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-8 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </LoadingRegion>
  );
}
