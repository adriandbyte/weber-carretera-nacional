import type { NextConfig } from 'next';

const config: NextConfig = {
  // El runtime de Prisma no debe empaquetarse en el bundle del servidor: Next
  // lo carga como dependencia externa. El adaptador va en la lista porque
  // arrastra `pg`, que hace requires dinamicos que webpack no sabe seguir.
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.public.blob.vercel-storage.com' }],
  },
};

export default config;
