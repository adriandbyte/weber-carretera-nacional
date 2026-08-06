import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TriangleAlert } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
/// Solo para SKUs y claves. Un codigo como 14505601 se lee y se compara mejor
/// cuando todos los digitos ocupan lo mismo.
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

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
    <div className="flex items-center gap-2 border-b border-warning-border bg-warning-muted px-8 py-2 text-sm text-warning">
      <TriangleAlert className="size-4 shrink-0" />
      <span>
        <span className="font-medium">Panel sin contraseña.</span> Configura{' '}
        <code className="font-mono text-xs">ADMIN_PASSWORD</code> antes de ponerlo en una URL
        pública.
      </span>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: next-themes escribe la clase del tema en <html>
    // antes de que React hidrate, asi que el servidor y el cliente difieren ahi
    // a proposito. Es el precio de no ver un parpadeo blanco al cargar.
    <html lang="es-MX" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <div className="min-w-0 flex-1">
              <AccessNotice />
              <main className="mx-auto max-w-[88rem] px-8 py-8">{children}</main>
            </div>
          </div>
          {/* Arriba y no abajo: la ficha de producto lleva una barra fija de
              acciones pegada al borde inferior, y ahi el aviso caia justo
              encima del boton de guardar durante los segundos siguientes a
              pulsarlo. */}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
