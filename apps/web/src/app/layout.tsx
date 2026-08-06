import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@weber/db';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Asadores Weber en Monterrey',
    template: '%s | Asadores Weber',
  },
  description:
    'Venta de asadores Weber de gas, carbón y eléctricos. Accesorios, cursos de asado y entrega en Monterrey.',
};

/// El header se arma con lo que hay en la base, no con una lista escrita
/// en el codigo. Asi el cliente reordena o esconde pestañas desde el admin.
async function Header() {
  const [menu, settings] = await Promise.all([
    prisma.menuItem.findMany({
      where: { location: 'HEADER', active: true, parentId: null },
      orderBy: { position: 'asc' },
      include: { category: true },
    }),
    prisma.siteSetting.findUnique({ where: { id: 'default' } }),
  ]);

  return (
    <header className="border-b border-carbon-200 bg-white">
      {settings?.announcement && (
        <div className="bg-carbon-900 px-4 py-2 text-center text-sm text-white">
          {settings.announcement}
        </div>
      )}
      <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
        <Link href="/" className="font-display text-xl font-bold text-carbon-900">
          {settings?.siteName ?? 'Weber Store'}
        </Link>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {menu.map((item) => (
            <li key={item.id}>
              <a
                href={item.category ? `/categoria/${item.category.slug}` : (item.url ?? '#')}
                className={
                  item.highlight
                    ? 'font-semibold text-ember-600 hover:text-ember-700'
                    : 'text-carbon-600 hover:text-carbon-900'
                }
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="bg-white text-carbon-800 antialiased">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
