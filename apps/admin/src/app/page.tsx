import { prisma } from '@weber/db';

/// Panel de arranque. Lo que importa aqui es que el cliente vea de un
/// vistazo cuanto trabajo de captura le falta antes de poder publicar.
export default async function DashboardPage() {
  const [total, byStatus, sinPrecio, sinImagen, paraRevisar, prospectos] = await Promise.all([
    prisma.product.count(),
    prisma.product.groupBy({ by: ['status'], _count: true }),
    prisma.product.count({ where: { price: null } }),
    prisma.product.count({ where: { images: { none: {} } } }),
    prisma.product.count({ where: { needsReview: true } }),
    prisma.lead.count({ where: { status: 'NEW' } }),
  ]);

  const pendientes = [
    { label: 'Sin precio', value: sinPrecio, href: '/productos?filtro=sin-precio' },
    { label: 'Sin imagen', value: sinImagen, href: '/productos?filtro=sin-imagen' },
    { label: 'Marcados para revisión', value: paraRevisar, href: '/productos?filtro=revision' },
    { label: 'Prospectos nuevos', value: prospectos, href: '/prospectos' },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-carbon-900">Resumen</h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
          Catálogo ({total} productos)
        </h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {byStatus.map((group) => (
            <li
              key={group.status}
              className="rounded-card border border-carbon-200 bg-white px-5 py-4"
            >
              <span className="block text-2xl font-bold text-carbon-900">{group._count}</span>
              <span className="text-sm text-carbon-400">{group.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">Pendientes</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pendientes.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="block rounded-card border border-carbon-200 bg-white px-5 py-4 transition hover:border-ember-500"
              >
                <span className="block text-2xl font-bold text-carbon-900">{item.value}</span>
                <span className="text-sm text-carbon-400">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
