'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, LayoutDashboard, Package, Tags } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';
import { cn } from '@/lib/utils';

/// Solo lo que existe. Contenido, Prospectos y Configuracion se agregan
/// cuando tengan pantalla: un enlace que lleva a un 404 hace dudar de todo lo
/// demas que hay alrededor.
const NAV = [
  { href: '/', label: 'Resumen', icon: LayoutDashboard },
  { href: '/productos', label: 'Productos', icon: Package },
  { href: '/catalogos', label: 'Catálogos', icon: Tags },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Flame className="size-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block font-heading text-sm leading-tight font-semibold text-sidebar-foreground">
            Weber
          </span>
          <span className="block text-xs leading-tight text-muted-foreground">Administración</span>
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV.map((item) => {
          // Coincidencia por prefijo para que la ficha de un producto siga
          // marcando "Productos": si la barra se apaga al entrar al detalle,
          // se pierde la referencia de donde esta uno.
          const active =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between border-t border-sidebar-border px-4 py-3">
        <span className="text-xs text-muted-foreground">Tema</span>
        <ModeToggle />
      </div>
    </aside>
  );
}
