import { CardGridSkeleton, LoadingRegion, PageHeaderSkeleton } from '@/components/skeletons';

/// Siete tarjetas, las mismas siete que siempre hay: el numero de catalogos no
/// depende de la consulta, asi que el esqueleto puede clavarlo y la rejilla no
/// se reacomoda al llegar los datos.
export default function Loading() {
  return (
    <LoadingRegion>
      <PageHeaderSkeleton />
      <CardGridSkeleton cards={7} />
    </LoadingRegion>
  );
}
