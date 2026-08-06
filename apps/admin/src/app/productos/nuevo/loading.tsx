import { LoadingRegion, PageHeaderSkeleton } from '@/components/skeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/// Esta pantalla no consulta nada, asi que el esqueleto dura lo que tarda en
/// llegar el codigo de la pagina. Existe igualmente porque sin el heredaria el
/// de la lista de productos, y ver dibujarse una tabla de cincuenta filas
/// camino de un formulario de dos campos desconcierta mas que un momento en
/// blanco.
export default function Loading() {
  return (
    <LoadingRegion className="max-w-xl">
      <PageHeaderSkeleton back />
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
    </LoadingRegion>
  );
}
