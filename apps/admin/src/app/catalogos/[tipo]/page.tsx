import { notFound } from 'next/navigation';
import { pluralize } from '@weber/core';
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
      <a href="/catalogos" className="text-sm text-carbon-400 hover:text-carbon-700">
        ← Catálogos
      </a>
      <h1 className="mt-1 font-display text-2xl font-bold text-carbon-900">{catalog.label}</h1>
      <p className="mt-1 max-w-2xl text-sm text-carbon-400">{catalog.description}</p>

      <p className="mt-4 text-sm text-carbon-400">
        {pluralize(rows.length, 'opción', 'opciones')} · {enUso} en uso
      </p>

      <div className="mt-4">
        <CatalogTable
          rows={rows}
          hasHex={catalog.hasHex ?? false}
          singular={catalog.singular}
          updateAction={updateCatalogItem.bind(null, tipo)}
          deleteAction={deleteCatalogItem.bind(null, tipo)}
        />
      </div>

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
