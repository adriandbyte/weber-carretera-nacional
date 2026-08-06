import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/// Encabezado comun a todas las pantallas.
///
/// Antes cada pagina repetia el mismo bloque de titulo y volvia a decidir su
/// tamaño y su color. Bastaba con que una lo escribiera distinto para que el
/// panel pareciera hecho a pedazos.
export function PageHeader({
  back,
  title,
  description,
  actions,
}: {
  back?: { href: string; label: string };
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
