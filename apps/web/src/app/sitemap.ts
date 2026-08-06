import type { MetadataRoute } from 'next';
import { prisma } from '@weber/db';
import { siteUrl } from '@/lib/site';

/// Se regenera cada hora, igual que el resto de la tienda. Un sitemap estatico
/// generado en el despliegue no incluiria lo que se publique despues, que es
/// justo como se trabaja aqui: el catalogo se limpia desde el panel, no
/// desplegando.
export const revalidate = 3600;

/// Solo entra lo que un visitante puede abrir: productos publicados, categorias
/// activas y paginas publicadas. Anunciar en el sitemap una URL que responde
/// 404 es la forma mas rapida de que Google deje de fiarse del archivo.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    ...categories.map((category) => ({
      url: `${base}/categoria/${category.slug}`,
      lastModified: category.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${base}/producto/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...pages.map((page) => ({
      url: `${base}/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
