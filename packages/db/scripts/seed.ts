// ---------------------------------------------------------------------------
// Siembra el contenido del sitio: menu, colecciones, paginas y configuracion.
//
//   pnpm db:seed
//
// Todo sale de "Propuesta Menus Pagina Web.xlsx". La idea es que al abrir el
// admin por primera vez ya haya estructura que editar en lugar de una
// pantalla vacia. Es idempotente: upsert por slug.
//
// Los textos marcados como PENDIENTE son los que el cliente tiene que
// completar; se dejan visibles a proposito para que no se olviden.
// ---------------------------------------------------------------------------

import { PrismaClient, type Prisma } from '@prisma/client';
import { seedCatalogs } from './lib/catalogs.js';

const prisma = new PrismaClient();

/// Las pestañas del menu, en el orden exacto del Excel de propuesta.
/// Las que apuntan a una categoria se resuelven por slug; las demas son
/// paginas de contenido.
const MENU: { label: string; categorySlug?: string; url?: string; highlight?: boolean }[] = [
  { label: 'Cursos de Asado', url: '/grill-academy', highlight: true },
  { label: 'Ofertas de Temporada', url: '/ofertas', highlight: true },
  { label: 'Más Vendidos', url: '/mas-vendidos' },
  { label: 'Gas', categorySlug: 'gas' },
  { label: 'Carbón', categorySlug: 'carbon' },
  { label: 'Eléctricos', categorySlug: 'electricos' },
  { label: 'Planchas', categorySlug: 'planchas' },
  { label: 'Portátiles', categorySlug: 'portatiles' },
  { label: 'Empotrables', categorySlug: 'empotrables' },
  { label: 'Accesorios', categorySlug: 'accesorios' },
  { label: 'B2B - Mayoreo', url: '/mayoreo' },
  { label: 'Ubicación', url: '/ubicacion' },
  { label: 'Contacto', url: '/contacto' },
];

const COLLECTIONS: Prisma.CollectionCreateInput[] = [
  {
    slug: 'mas-vendidos',
    name: 'Más Vendidos',
    description: 'Los asadores que más salen de nuestra tienda.',
    kind: 'CURATED',
    position: 0,
    active: true,
  },
  {
    slug: 'ofertas',
    name: 'Ofertas de Temporada',
    description: 'Promociones vigentes. Cambian sin previo aviso.',
    kind: 'PROMO',
    position: 1,
    // Nace inactiva: el Excel pide que la seccion desaparezca cuando no hay
    // promociones. Se enciende desde el admin al cargar la primera oferta.
    active: false,
  },
  {
    slug: 'novedades',
    name: 'Novedades',
    description: 'Lo más nuevo de Weber.',
    kind: 'CURATED',
    position: 2,
    active: true,
  },
];

/// Las paginas de contenido y sus bloques iniciales. La estructura sale
/// directo de las viñetas del Excel de propuesta.
const PAGES: {
  slug: string;
  title: string;
  subtitle?: string;
  metaTitle: string;
  metaDescription: string;
  blocks: { type: Prisma.ContentBlockCreateManyPageInput['type']; data: Prisma.InputJsonValue }[];
}[] = [
  {
    slug: 'grill-academy',
    title: 'Grill Academy',
    subtitle: 'Cursos de asado para todos los niveles',
    metaTitle: 'Grill Academy | Cursos de asado en Monterrey',
    metaDescription:
      'Aprende a dominar tu asador Weber con nuestros cursos presenciales en Monterrey. Eventos privados y corporativos.',
    blocks: [
      {
        type: 'RICH_TEXT',
        data: {
          heading: 'Cotiza tu evento privado o corporativo',
          body: 'PENDIENTE: descripción de la Grill Academy.',
        },
      },
      {
        type: 'FEATURE_LIST',
        data: {
          heading: 'Por qué con nosotros',
          items: [
            { title: 'Espacio climatizado', description: 'Cómodo en cualquier temporada.' },
            { title: 'Pantallas de 65"', description: 'Para que no te pierdas ningún detalle.' },
            { title: 'Estacionamiento gratuito', description: 'Llega sin preocupaciones.' },
          ],
        },
      },
      { type: 'GALLERY', data: { heading: 'Así se vive un curso', tag: 'grill-academy' } },
      {
        type: 'FILE_DOWNLOAD',
        data: { label: 'Descargar presentación', url: '', note: 'PENDIENTE: subir el PDF' },
      },
      { type: 'CTA', data: { heading: 'Reserva tu lugar', buttonLabel: 'Cotizar', target: '#contacto' } },
      { type: 'CONTACT_FORM', data: { leadKind: 'COURSE', heading: 'Cotiza tu evento' } },
    ],
  },
  {
    slug: 'mayoreo',
    title: 'B2B - Mayoreo',
    subtitle: 'Precios especiales para distribuidores y proyectos',
    metaTitle: 'Venta de asadores Weber al mayoreo | B2B',
    metaDescription:
      'Precios de mayoreo en asadores Weber para distribuidores, hoteles, restaurantes y desarrollos inmobiliarios.',
    blocks: [
      {
        type: 'RICH_TEXT',
        data: {
          heading: 'Pregunta por precio de mayoreo',
          body: 'PENDIENTE: condiciones comerciales de mayoreo.',
        },
      },
      {
        type: 'CONTACT_FORM',
        data: {
          leadKind: 'WHOLESALE',
          heading: 'Solicita tu cotización',
          // El Excel pide que el formulario llegue a correo y a WhatsApp.
          notify: ['email', 'whatsapp'],
        },
      },
    ],
  },
  {
    slug: 'ubicacion',
    title: 'Ubicación',
    subtitle: 'Visítanos en Monterrey',
    metaTitle: 'Ubicación | Tienda Weber en Monterrey',
    metaDescription: 'Encuéntranos en Monterrey. Horarios, mapa y cómo llegar.',
    blocks: [
      { type: 'RICH_TEXT', data: { heading: 'Cómo llegar', body: 'PENDIENTE: dirección escrita.' } },
      { type: 'MAP', data: { embedUrl: '', note: 'PENDIENTE: embed de Google Maps' } },
      { type: 'VIDEO', data: { url: '', title: 'Recorrido de llegada', note: 'PENDIENTE: subir el video POV' } },
    ],
  },
  {
    slug: 'contacto',
    title: 'Contacto',
    metaTitle: 'Contacto | Tienda Weber',
    metaDescription: 'WhatsApp, teléfono, correo y redes sociales.',
    blocks: [
      { type: 'CONTACT_FORM', data: { leadKind: 'CONTACT', heading: 'Escríbenos' } },
    ],
  },
];

async function main() {
  console.log('Sembrando catalogos');
  const ids = await seedCatalogs(prisma);

  console.log('Sembrando menu');
  // El menu se reconstruye completo porque el orden importa y es corto.
  await prisma.menuItem.deleteMany({ where: { location: 'HEADER' } });
  for (const [index, item] of MENU.entries()) {
    await prisma.menuItem.create({
      data: {
        label: item.label,
        url: item.url ?? null,
        categoryId: item.categorySlug ? (ids.category.get(item.categorySlug) ?? null) : null,
        highlight: item.highlight ?? false,
        location: 'HEADER',
        position: index,
      },
    });
  }

  console.log('Sembrando colecciones');
  for (const collection of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      update: {},
      create: collection,
    });
  }

  console.log('Sembrando paginas');
  for (const page of PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: page.slug } });
    // Si la pagina ya existe se deja intacta: el admin pudo haberla editado
    // y volver a sembrar los bloques borraria ese trabajo.
    if (existing) {
      console.log(`  ${page.slug} ya existe, se deja como esta`);
      continue;
    }
    await prisma.page.create({
      data: {
        slug: page.slug,
        title: page.title,
        subtitle: page.subtitle,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        published: false,
        blocks: {
          create: page.blocks.map((block, index) => ({
            type: block.type,
            data: block.data,
            position: index,
          })),
        },
      },
    });
  }

  console.log('Sembrando configuracion del sitio');
  await prisma.siteSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      siteName: 'PENDIENTE: nombre de la tienda',
      city: 'Monterrey',
      state: 'Nuevo León',
      pickupEnabled: true,
      announcement: 'Compra en línea y recoge en tienda',
      openingHours: [
        { dia: 'Lunes a Viernes', abre: '10:00', cierra: '19:00' },
        { dia: 'Sábado', abre: '10:00', cierra: '17:00' },
        { dia: 'Domingo', abre: null, cierra: null },
      ],
    },
  });

  console.log('\nListo. Revisa en el admin los textos marcados como PENDIENTE.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
