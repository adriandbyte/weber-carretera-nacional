// ---------------------------------------------------------------------------
// Configuracion de ESLint compartida por las dos apps.
//
// Antes el script de lint era `next lint`, que Next 16 ya no trae. Sin archivo
// de configuracion, el comando abria un asistente interactivo y terminaba en
// error: `pnpm lint` fallaba siempre y por eso nadie lo miraba.
//
// eslint-config-next todavia se publica en el formato antiguo, asi que hace
// falta FlatCompat para leerlo desde la configuracion plana de ESLint 9.
// ---------------------------------------------------------------------------

import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

/// `dirname` es la carpeta de la app, para que las rutas ignoradas se
/// resuelvan donde toca y no en la raiz del monorepo.
export function nextConfig() {
  return [
    {
      // src/generated es el cliente de Prisma: codigo que nadie escribe a mano
      // y que se rehace en cada generate. Revisarlo solo produce ruido.
      ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', 'src/generated/**'],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
      // Los componentes de shadcn se copian tal cual del registro. Marcarlos
      // aqui evita el impulso de "arreglarlos" y perder la actualizacion la
      // proxima vez que se vuelvan a bajar.
      files: ['src/components/ui/**'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ];
}
