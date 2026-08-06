import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

/// Desplegable nativo con el aspecto del resto de los controles.
///
/// No usa el Select de Radix a proposito. Todos los formularios del panel se
/// envian con Server Actions y FormData, y un <select> nativo:
///   - viaja en el envio sin ningun input oculto de por medio,
///   - admite el valor vacio, que es justo lo que necesita "Sin especificar"
///     (Radix lo reserva para limpiar la seleccion),
///   - abre el selector del sistema en movil, que se maneja mucho mejor con
///     diecisiete series que una lista flotante.
/// El unico costo es que no se puede pintar la lista desplegada, y en un panel
/// interno eso no vale lo que cuesta.
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent py-1 pr-8 pl-2.5 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export { NativeSelect };
