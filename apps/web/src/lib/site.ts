/// Direccion publica del sitio. La necesitan el sitemap, el robots.txt y las
/// URLs canonicas, y las tres tienen que dar la misma respuesta: si el sitemap
/// anuncia un dominio y la canonica otro, Google se queda con el que quiera.
///
/// Vercel inyecta VERCEL_PROJECT_PRODUCTION_URL en cada despliegue, asi que las
/// vistas previas apuntan al dominio de produccion en lugar de indexarse solas.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return 'http://localhost:3000';
}
