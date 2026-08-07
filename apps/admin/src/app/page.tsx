import Link from 'next/link';
import { ArrowRight, FileText, FolderTree, ImageOff, PencilLine, Tags } from 'lucide-react';
import { prisma } from '@weber/db';
import { findPending, pluralize } from '@weber/core';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export const dynamic = 'force-dynamic';

/// Pantalla de entrada. El trabajo de estos meses es uno solo: dejar los 331
/// productos listos para publicar. Todo lo que se muestra aqui responde a
/// "cuánto falta" y lleva de un clic a la lista filtrada correspondiente.
export default async function DashboardPage() {
  const [productos, publicados, catalogos] = await Promise.all([
    // Los 331 productos se traen enteros a proposito. Contar con un `where`
    // propio seria escribir una segunda definicion de "listo", y es justo lo
    // que estaba pasando: la barra media descripcion completa e imagen,
    // mientras el guardado exigia descripcion corta, categoria y tipo. Los dos
    // numeros hablaban de cosas distintas y ninguno era el que importa.
    //
    // Con esta consulta la unica regla es findPending, la misma que ve la
    // persona en la ficha y la misma que decide si se puede publicar.
    prisma.product.findMany({
      select: {
        name: true,
        shortDescription: true,
        description: true,
        productTypeId: true,
        needsReview: true,
        _count: { select: { images: true, categories: true } },
      },
    }),
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

  const total = productos.length;
  const revisados = productos.map((producto) => ({
    needsReview: producto.needsReview,
    faltantes: findPending({
      name: producto.name,
      shortDescription: producto.shortDescription,
      description: producto.description,
      imageCount: producto._count.images,
      categoryCount: producto._count.categories,
      hasProductType: producto.productTypeId !== null,
    }),
  }));

  /// Cuantos productos arrastran este pendiente concreto.
  const cuantosFalta = (key: string) =>
    revisados.filter((producto) => producto.faltantes.some((item) => item.key === key)).length;

  const publicables = revisados.filter(
    (producto) => !producto.faltantes.some((item) => item.blocking),
  ).length;
  // Listo es publicable y ademas revisado a mano: que la ficha este completa no
  // significa que alguien la haya leido.
  const listos = revisados.filter(
    (producto) => !producto.needsReview && !producto.faltantes.some((item) => item.blocking),
  ).length;

  const avance = total === 0 ? 0 : Math.round((listos / total) * 100);
  const porRevisar = revisados.filter((producto) => producto.needsReview).length;
  const opciones = catalogos.reduce((sum, count) => sum + count, 0);

  // Cada tarjeta es un pendiente que impide publicar, en el orden en que
  // conviene atacarlos: primero lo que se redacta, luego lo que se clasifica.
  const pendientes = [
    {
      label: 'Sin descripción corta',
      value: cuantosFalta('descripcion-corta'),
      icon: FileText,
      href: '/productos?filtro=sin-descripcion-corta',
      note: 'Es la que sale en las listas',
    },
    {
      label: 'Sin imagen',
      value: cuantosFalta('imagen'),
      icon: ImageOff,
      href: '/productos?filtro=sin-imagen',
      note: 'No venían en el Excel',
    },
    {
      label: 'Sin categoría',
      value: cuantosFalta('categoria'),
      icon: FolderTree,
      href: '/productos?filtro=sin-categoria',
      note: 'No aparecen en ninguna sección',
    },
    {
      label: 'Por revisar',
      value: porRevisar,
      icon: PencilLine,
      href: '/productos?filtro=revision',
      note: 'Nombre crudo del sistema de Weber',
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
            Un producto cuenta como listo cuando ya no le falta ningún campo obligatorio y alguien
            lo dio por revisado. Es la misma regla que decide si se puede publicar.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-heading text-3xl font-semibold tabular-nums">{avance}%</span>
            <span className="text-muted-foreground text-sm tabular-nums">
              {listos} de {total} listos para publicar
            </span>
          </div>

          <Progress value={avance} aria-label="Avance de limpieza" className="h-2" />

          {/* Los dos numeros se separan porque responden a preguntas distintas:
              cuanto trabajo queda, y cuanto de lo hecho falta por dar el visto
              bueno. Cuando solo se veia uno, un producto completo pero sin
              revisar se leia como trabajo pendiente. */}
          {publicables > listos && (
            <p className="text-muted-foreground text-sm">
              Otros{' '}
              <span className="text-foreground font-medium tabular-nums">
                {publicables - listos}
              </span>{' '}
              ya tienen todo lo obligatorio y solo esperan que los des por revisados.
            </p>
          )}

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
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Qué falta
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pendientes.map((item) => (
            <li key={item.label}>
              <Link href={item.href} className="group block h-full rounded-xl">
                <Card className="group-hover:ring-primary/40 h-full transition-colors">
                  <CardContent className="space-y-1">
                    <item.icon className="text-muted-foreground size-4" />
                    <span className="font-heading block text-2xl font-semibold tabular-nums">
                      {item.value}
                    </span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="text-muted-foreground block text-xs">{item.note}</span>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Catálogos
        </h2>
        <Link href="/catalogos" className="group mt-3 block rounded-xl">
          <Card className="group-hover:ring-primary/40 transition-colors">
            <CardContent className="flex items-start gap-3">
              <Tags className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <span className="block font-medium">
                  {pluralize(opciones, 'opción', 'opciones')} en 7 listas
                </span>
                <span className="text-muted-foreground block text-xs">
                  Series, colores, tamaños y demás menús de la ficha de producto. Si al revisar
                  falta una opción, se agrega aquí.
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <p className="text-muted-foreground mt-8 text-xs">
        Los precios llegan con la lista del proveedor. Un producto se puede publicar sin precio y
        sin la descripción larga, pero no sin nombre redactado, descripción corta, imagen, categoría
        y tipo.
      </p>
    </div>
  );
}
