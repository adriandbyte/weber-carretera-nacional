import type { NextConfig } from 'next';

const config: NextConfig = {
  // El cliente de Prisma es CommonJS y no debe empaquetarse en el bundle
  // del servidor: Next lo carga como dependencia externa.
  serverExternalPackages: ['@prisma/client'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default config;
