import Link from 'next/link';
import { pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <PageHeader
        title="Catálogos"
        description="Son las listas que alimentan los menús desplegables de la ficha de producto. Si al limpiar el catálogo falta una serie o un color, se agrega aquí y aparece de inmediato."
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalogs.map((catalog) => {
          const inactive = catalog.rows.filter((row) => !row.active).length;
          return (
            <li key={catalog.key}>
              <Link href={`/catalogos/${catalog.key}`} className="group block h-full rounded-xl">
                <Card className="h-full transition-colors group-hover:ring-primary/40">
                  <CardHeader>
                    <CardTitle>{catalog.label}</CardTitle>
                    <CardDescription>{catalog.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto text-sm font-medium">
                    {pluralize(catalog.rows.length, 'opción', 'opciones')}
                    {inactive > 0 && (
                      <span className="font-normal text-muted-foreground"> · {inactive} ocultas</span>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
