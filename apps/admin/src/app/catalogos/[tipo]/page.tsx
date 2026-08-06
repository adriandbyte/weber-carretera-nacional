import { notFound } from 'next/navigation';
import { pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import { CATALOGS } from '@/lib/catalogos';
import { createCatalogItem, deleteCatalogItem, updateCatalogItem } from '../actions';
import { CatalogTable } from './catalog-table';
import { NewItemForm } from './new-item-form';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  return { title: CATALOGS[tipo]?.label ?? 'Catálogo' };
}

export default async function CatalogoPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  const catalog = CATALOGS[tipo];
  if (!catalog) notFound();

  const rows = await catalog.list();
  const enUso = rows.filter((row) => row.usage > 0).length;

  return (
    <div>
      <PageHeader
        back={{ href: '/catalogos', label: 'Catálogos' }}
        title={catalog.label}
        description={catalog.description}
        actions={
          <span className="text-sm text-muted-foreground tabular-nums">
            {pluralize(rows.length, 'opción', 'opciones')} · {enUso} en uso
          </span>
        }
      />

      <CatalogTable
        rows={rows}
        hasHex={catalog.hasHex ?? false}
        singular={catalog.singular}
        updateAction={updateCatalogItem.bind(null, tipo)}
        deleteAction={deleteCatalogItem.bind(null, tipo)}
      />

      <div className="mt-6">
        <NewItemForm
          hasHex={catalog.hasHex ?? false}
          singular={catalog.singular}
          action={createCatalogItem.bind(null, tipo)}
        />
      </div>
    </div>
  );
}
