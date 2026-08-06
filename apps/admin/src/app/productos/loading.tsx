import { LoadingRegion, PageHeaderSkeleton, ProductTableSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/// Solo se ve al entrar a la lista desde otra pantalla. Al cambiar de filtro o
/// de pagina ya no aparece: eso lo cubre el Suspense de la propia pagina, que
/// deja los filtros en su sitio y solo repinta la tabla.
export default function Loading() {
  return (
    <LoadingRegion>
      <PageHeaderSkeleton actions />

      {/* Los siete filtros, con el ancho aproximado de sus etiquetas. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[64, 88, 80, 96, 112, 88, 88].map((width, index) => (
          <Skeleton key={index} className="h-8 rounded-lg" style={{ width }} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      <ProductTableSkeleton />
    </LoadingRegion>
  );
}
