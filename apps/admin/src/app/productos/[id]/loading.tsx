import { LoadingRegion, PageHeaderSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/// La ficha es la pantalla mas pesada del panel: trae el producto y los siete
/// catalogos de sus desplegables. Tambien es la que mas se abre y se cierra
/// durante una sesion de limpieza, asi que es donde mas se notaba la espera en
/// blanco.
function FieldSkeleton({ label = 'w-24' }: { label?: string }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className={`h-4 ${label}`} />
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export default function Loading() {
  return (
    <LoadingRegion>
      <PageHeaderSkeleton back actions />

      {/* Lo que falta por completar, arriba del formulario. */}
      <Card className="mb-6">
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-1 h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-5">
              <FieldSkeleton label="w-20" />
              <FieldSkeleton label="w-36" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-32 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-full max-w-md" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                {Array.from({ length: 6 }, (_, field) => (
                  <FieldSkeleton key={field} />
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {Array.from({ length: 9 }, (_, option) => (
                  <Skeleton key={option} className="h-5 w-32" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card size="sm">
            <CardHeader>
              <Skeleton className="h-3.5 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }, (_, image) => (
                  <Skeleton key={image} className="aspect-square w-full rounded-md" />
                ))}
              </div>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <Skeleton className="h-3.5 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
              <FieldSkeleton label="w-16" />
              <FieldSkeleton label="w-20" />
            </CardContent>
          </Card>
        </div>
      </div>
    </LoadingRegion>
  );
}
