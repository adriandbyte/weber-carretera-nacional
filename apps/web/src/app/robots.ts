import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site';

/// Google descubre el sitemap por aqui. El panel vive en otro dominio y ya se
/// declara `noindex` en su propio layout, asi que no hay nada que bloquear:
/// una regla de mas invita a que alguien la copie donde si estorbe.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
