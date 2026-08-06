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

/// Las cinco columnas de la tabla de catalogo. Doce filas: es lo que ocupa un
/// catalogo mediano como formatos o colores, asi que el alto de la pagina
/// apenas se mueve al llegar los datos.
export default function Loading() {
  return (
    <LoadingRegion>
      <PageHeaderSkeleton back actions />

      <Card className="gap-0 py-0">
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 text-muted-foreground">Nombre</TableHead>
              <TableHead className="w-24 px-4 text-right text-muted-foreground">Orden</TableHead>
              <TableHead className="w-32 px-4 text-right text-muted-foreground">Productos</TableHead>
              <TableHead className="w-28 px-4 text-muted-foreground">Estado</TableHead>
              <TableHead className="w-44 px-4 text-muted-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 12 }, (_, row) => (
              <TableRow key={row} className="hover:bg-transparent">
                <TableCell className="px-4 py-3">
                  <Skeleton className="h-8 w-52" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-8 w-20" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="ml-auto h-4 w-10" />
                </TableCell>
                <TableCell className="px-4">
                  <Skeleton className="h-5 w-16 rounded-md" />
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-6">
        <Skeleton className="h-9 w-48" />
      </div>
    </LoadingRegion>
  );
}
