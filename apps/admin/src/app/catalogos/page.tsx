import { pluralize } from '@weber/core';
import { CATALOGS } from '@/lib/catalogos';

export const metadata = { title: 'Catálogos' };
export const dynamic = 'force-dynamic';

export default async function CatalogosPage() {
  const catalogs = await Promise.all(
    Object.values(CATALOGS).map(async (catalog) => ({
      key: catalog.key,
      label: catalog.label,
      description: catalog.description,
      rows: await catalog.list(),
    })),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-carbon-900">Catálogos</h1>
      <p className="mt-1 max-w-2xl text-sm text-carbon-400">
        Son las listas que alimentan los menús desplegables de la ficha de producto. Si al limpiar
        el catálogo falta una serie o un color, se agrega aquí y aparece de inmediato.
      </p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogs.map((catalog) => {
          const inactive = catalog.rows.filter((row) => !row.active).length;
          return (
            <li key={catalog.key}>
              <a
                href={`/catalogos/${catalog.key}`}
                className="block h-full rounded-card border border-carbon-200 bg-white p-5 transition hover:border-ember-500"
              >
                <span className="block font-display text-lg font-semibold text-carbon-900">
                  {catalog.label}
                </span>
                <span className="mt-1 block text-sm text-carbon-400">{catalog.description}</span>
                <span className="mt-3 block text-sm font-medium text-carbon-700">
                  {pluralize(catalog.rows.length, 'opción', 'opciones')}
                  {inactive > 0 && (
                    <span className="font-normal text-carbon-400"> · {inactive} ocultas</span>
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
