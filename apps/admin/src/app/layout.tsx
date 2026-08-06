import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Panel de administración', template: '%s | Admin' },
  // El admin nunca debe indexarse, ni ahora que esta abierto ni despues.
  robots: { index: false, follow: false },
};

/// Solo aparece cuando el panel esta sin contraseña. Al configurarla, el aviso
/// desaparece solo: un banner que sigue ahi cuando ya no aplica deja de leerse.
function AccessNotice() {
  if (process.env.ADMIN_PASSWORD) return null;
  return (
    <div className="bg-ember-500 px-6 py-2 text-sm font-medium text-white">
      Panel sin contraseña. Configura ADMIN_PASSWORD antes de ponerlo en una URL pública.
    </div>
  );
}

const NAV = [
  { href: '/', label: 'Resumen' },
  { href: '/productos', label: 'Productos' },
  { href: '/catalogos', label: 'Catálogos' },
  { href: '/contenido', label: 'Contenido' },
  { href: '/prospectos', label: 'Prospectos' },
  { href: '/configuracion', label: 'Configuración' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body className="bg-steel-100 text-carbon-800 antialiased">
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-carbon-200 bg-white">
            <div className="px-5 py-5 font-display text-lg font-bold text-carbon-900">Admin</div>
            <nav className="px-2">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm text-carbon-600 hover:bg-steel-100 hover:text-carbon-900"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <div className="min-w-0 flex-1">
            <AccessNotice />
            <main className="p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
