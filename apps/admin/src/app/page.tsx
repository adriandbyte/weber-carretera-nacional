import Link from 'next/link';
import { ArrowRight, FileText, ImageOff, PencilLine, Tags } from 'lucide-react';
import { prisma } from '@weber/db';
import { pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const dynamic = 'force-dynamic';

/// Pantalla de entrada. El trabajo de estos meses es uno solo: dejar los 331
/// productos listos para publicar. Todo lo que se muestra aqui responde a
/// "cuánto falta" y lleva de un clic a la lista filtrada correspondiente.
export default async function DashboardPage() {
  const [total, listos, porRevisar, sinDescripcion, sinImagen, publicados, catalogos] =
    await Promise.all([
      prisma.product.count(),
      // "Listo" es lo que ya se puede publicar, no lo que el importador no
      // marco. Contar needsReview:false daria 227 de 331 y un avance del 69%
      // cuando en realidad ninguno esta terminado: el importador solo marco los
      // nombres en mayusculas, no los 331 que no tienen descripcion.
      prisma.product.count({
        where: { needsReview: false, description: { not: null }, images: { some: {} } },
      }),
      prisma.product.count({ where: { needsReview: true } }),
      prisma.product.count({ where: { description: null } }),
      prisma.product.count({ where: { images: { none: {} } } }),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      Promise.all([
        prisma.productType.count(),
        prisma.fuelType.count(),
        prisma.series.count(),
        prisma.format.count(),
        prisma.color.count(),
        prisma.sizeOption.count(),
        prisma.category.count(),
      ]),
    ]);

  const avance = total === 0 ? 0 : Math.round((listos / total) * 100);
  const opciones = catalogos.reduce((sum, count) => sum + count, 0);

  const pendientes = [
    {
      label: 'Por revisar',
      value: porRevisar,
      icon: PencilLine,
      href: '/productos?filtro=revision',
      note: 'Nombre crudo del sistema de Weber',
    },
    {
      label: 'Sin descripción',
      value: sinDescripcion,
      icon: FileText,
      href: '/productos?filtro=sin-descripcion',
      note: 'No se pueden publicar así',
    },
    {
      label: 'Sin imagen',
      value: sinImagen,
      icon: ImageOff,
      href: '/productos?filtro=sin-imagen',
      note: 'No venían en el Excel',
    },
  ];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Resumen"
        description={`${pluralize(total, 'producto')} en el catálogo, ${publicados} publicados en la tienda.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Avance de limpieza</CardTitle>
          <CardDescription>
            Un producto cuenta como listo cuando tiene descripción, imagen y ya no está marcado
            para revisar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-heading text-3xl font-semibold tabular-nums">{avance}%</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {listos} de {total} listos para publicar
            </span>
          </div>

          <Progress value={avance} aria-label="Avance de limpieza" className="h-2" />

          {porRevisar > 0 && (
            <Button asChild size="lg" className="mt-2">
              <Link href="/productos?filtro=revision">
                Continuar revisando
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Qué falta
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {pendientes.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="group block h-full rounded-xl">
                <Card className="h-full transition-colors group-hover:ring-primary/40">
                  <CardContent className="space-y-1">
                    <item.icon className="size-4 text-muted-foreground" />
                    <span className="block font-heading text-2xl font-semibold tabular-nums">
                      {item.value}
                    </span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{item.note}</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Catálogos
        </h2>
        <Link href="/catalogos" className="group mt-3 block rounded-xl">
          <Card className="transition-colors group-hover:ring-primary/40">
            <CardContent className="flex items-start gap-3">
              <Tags className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="space-y-1">
                <span className="block font-medium">
                  {pluralize(opciones, 'opción', 'opciones')} en 7 listas
                </span>
                <span className="block text-xs text-muted-foreground">
                  Series, colores, tamaños y demás menús de la ficha de producto. Si al revisar
                  falta una opción, se agrega aquí.
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <p className="mt-8 text-xs text-muted-foreground">
        Los precios llegan con la lista del proveedor. Un producto se puede publicar sin precio,
        pero no sin descripción e imagen.
      </p>
    </div>
  );
}
