'use client';

import { ThemeProvider as NextThemes } from 'next-themes';

/// Envoltura minima sobre next-themes.
///
/// Existe porque el proveedor necesita estado de cliente y el layout raiz es
/// un componente de servidor: sin este archivo intermedio habria que volver
/// cliente todo el layout y con el la barra lateral entera.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      // Sin esto, cambiar de tema anima cada color a la vez durante ~150ms y
      // la pantalla parpadea en gris a medio camino.
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  );
}
