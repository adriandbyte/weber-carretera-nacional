import { LoadingRegion, PageHeaderSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/// Esqueleto del resumen.
///
/// Ojo: este archivo tambien hace de red para cualquier ruta nueva que no traiga
/// su propio loading.tsx. Al crear una pantalla, crea el suyo o el usuario vera
/// aparecer la barra de avance del resumen antes de su pagina.
export default function Loading() {
  return (
    <LoadingRegion className="max-w-4xl">
      <PageHeaderSkeleton />

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-1 h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="mt-2 h-9 w-44" />
        </CardContent>
      </Card>

      <section className="mt-6">
        <Skeleton className="h-3.5 w-20" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, card) => (
            <Card key={card} className="h-full">
              <CardContent className="space-y-1">
                <Skeleton className="size-4" />
                <Skeleton className="h-8 w-14" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3.5 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <Skeleton className="h-3.5 w-20" />
        <Card className="mt-3">
          <CardContent className="flex items-start gap-3">
            <Skeleton className="mt-0.5 size-4 shrink-0" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-3.5 w-full max-w-lg" />
            </div>
          </CardContent>
        </Card>
      </section>
    </LoadingRegion>
  );
}
