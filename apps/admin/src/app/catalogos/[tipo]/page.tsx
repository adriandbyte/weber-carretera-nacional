import { notFound } from 'next/navigation';
import { pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import { CATALOGS } from '@/lib/catalogos';
import { createCatalogItem, deleteCatalogItem, updateCatalogItem } from '../actions';
import { CatalogTable, NewCatalogItemDialog } from './catalog-table';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  return { title: CATALOGS[tipo]?.label ?? 'Catálogo' };
}

export default async function CatalogoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const catalog = CATALOGS[tipo];
  // Sin `create` es que esa lista tiene pantalla propia, y su ruta estatica
  // deberia haber ganado antes de llegar aqui. Si se llega igual, la tabla
  // generica no sabe editarla: mejor un 404 que un formulario que pierde
  // campos al guardar.
  if (!catalog?.create) notFound();

  const rows = await catalog.list();
  const enUso = rows.filter((row) => row.usage > 0).length;

  return (
    <div>
      <PageHeader
        back={{ href: '/catalogos', label: 'Catálogos' }}
        title={catalog.label}
        description={catalog.description}
        actions={
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm tabular-nums">
              {pluralize(rows.length, 'opción', 'opciones')} · {enUso} en uso
            </span>
            <NewCatalogItemDialog
              singular={catalog.singular}
              hasHex={catalog.hasHex ?? false}
              action={createCatalogItem.bind(null, tipo)}
            />
          </div>
        }
      />

      <CatalogTable
        rows={rows}
        hasHex={catalog.hasHex ?? false}
        singular={catalog.singular}
        updateAction={updateCatalogItem.bind(null, tipo)}
        deleteAction={deleteCatalogItem.bind(null, tipo)}
      />
    </div>
  );
}
