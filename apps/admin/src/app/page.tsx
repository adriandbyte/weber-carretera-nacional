import { prisma } from '@weber/db';
import { pluralize } from '@weber/core';

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
      href: '/productos?filtro=revision',
      note: 'Nombre crudo del sistema de Weber',
    },
    {
      label: 'Sin descripción',
      value: sinDescripcion,
      href: '/productos?filtro=sin-descripcion',
      note: 'No se pueden publicar así',
    },
    {
      label: 'Sin imagen',
      value: sinImagen,
      href: '/productos?filtro=sin-imagen',
      note: 'No venían en el Excel',
    },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-2xl font-bold text-carbon-900">Resumen</h1>
      <p className="mt-1 text-sm text-carbon-400">
        {pluralize(total, 'producto')} en el catálogo, {publicados} publicados en la tienda.
      </p>

      <section className="mt-6 rounded-card border border-carbon-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-carbon-900">Avance de limpieza</h2>
          <p className="text-sm text-carbon-400">
            {listos} de {total} listos para publicar
          </p>
        </div>

        <div
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Avance de limpieza"
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-carbon-100"
        >
          <div
            className="h-full rounded-full bg-ember-500 transition-all"
            style={{ width: `${avance}%` }}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-carbon-700">{avance}% completado</p>
        <p className="mt-1 text-xs text-carbon-400">
          Un producto cuenta como listo cuando tiene descripción, imagen y ya no está marcado
          para revisar.
        </p>

        {porRevisar > 0 && (
          <a
            href="/productos?filtro=revision"
            className="mt-4 inline-block rounded-md bg-carbon-900 px-4 py-2 text-sm font-medium text-white hover:bg-carbon-700"
          >
            Continuar revisando
          </a>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
          Qué falta
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {pendientes.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="block h-full rounded-card border border-carbon-200 bg-white px-5 py-4 transition hover:border-ember-500"
              >
                <span className="block text-2xl font-bold text-carbon-900">{item.value}</span>
                <span className="block text-sm font-medium text-carbon-700">{item.label}</span>
                <span className="mt-1 block text-xs text-carbon-400">{item.note}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">Catálogos</h2>
        <a
          href="/catalogos"
          className="mt-3 block rounded-card border border-carbon-200 bg-white px-5 py-4 transition hover:border-ember-500"
        >
          <span className="block text-sm font-medium text-carbon-700">
            {pluralize(opciones, 'opción', 'opciones')} en 7 listas
          </span>
          <span className="mt-1 block text-xs text-carbon-400">
            Series, colores, tamaños y demás menús de la ficha de producto. Si al revisar falta una
            opción, se agrega aquí.
          </span>
        </a>
      </section>

      <p className="mt-8 text-xs text-carbon-300">
        Los precios llegan con la lista del proveedor. Un producto se puede publicar sin precio, pero
        no sin descripción e imagen.
      </p>
    </div>
  );
}
