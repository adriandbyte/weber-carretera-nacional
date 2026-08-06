import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Link from 'next/link';
import { prisma } from '@weber/db';
import { siteUrl } from '@/lib/site';
import './globals.css';

/// Con next/font el archivo se sirve desde el propio dominio: el navegador no
/// tiene que resolver fonts.googleapis.com antes de poder pintar el texto.
const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  // Base para que Next resuelva a absolutas las URLs canonicas y las de Open
  // Graph. Sin ella avisa en consola y las tarjetas al compartir salen rotas.
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Asadores Weber en Monterrey',
    template: '%s | Asadores Weber',
  },
  description:
    'Venta de asadores Weber de gas, carbón y eléctricos. Accesorios, cursos de asado y entrega en Monterrey.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: 'Asadores Weber',
    url: '/',
  },
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
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4"
      >
        <Link href="/" className="font-display text-xl font-bold text-carbon-900">
          {settings?.siteName ?? 'Weber Store'}
        </Link>
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {menu.map((item) => (
            <li key={item.id}>
              <Link
                href={item.category ? `/categoria/${item.category.slug}` : (item.url ?? '#')}
                className={
                  item.highlight
                    ? 'font-semibold text-ember-600 hover:text-ember-700'
                    : 'text-carbon-600 hover:text-carbon-900'
                }
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={sans.variable}>
      <body className="bg-white text-carbon-800 antialiased">
        {/* Primer elemento enfocable de la pagina. Invisible hasta que alguien
            llega con el tabulador, y entonces se salta el menu entero en lugar
            de obligar a recorrerlo pestaña por pestaña en cada carga. */}
        <a
          href="#contenido"
          className="sr-only rounded-card bg-carbon-900 text-sm text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2"
        >
          Saltar al contenido
        </a>
        <Header />
        <main id="contenido">{children}</main>
      </body>
    </html>
  );
}
