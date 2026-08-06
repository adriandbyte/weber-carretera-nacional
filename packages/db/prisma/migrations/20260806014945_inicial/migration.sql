-- CreateEnum
CREATE TYPE "CollectionKind" AS ENUM ('CURATED', 'PROMO');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "MenuLocation" AS ENUM ('HEADER', 'FOOTER');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('RICH_TEXT', 'IMAGE', 'GALLERY', 'VIDEO', 'MAP', 'FILE_DOWNLOAD', 'FEATURE_LIST', 'FAQ', 'CTA', 'CONTACT_FORM', 'PRODUCT_GRID');

-- CreateEnum
CREATE TYPE "CourseKind" AS ENUM ('PUBLIC', 'PRIVATE', 'CORPORATE');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO', 'PDF');

-- CreateEnum
CREATE TYPE "BannerSlot" AS ENUM ('HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'PROMO_BAR');

-- CreateEnum
CREATE TYPE "LeadKind" AS ENUM ('CONTACT', 'WHOLESALE', 'COURSE', 'PRODUCT');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "marcas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_producto" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "combustibles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "combustibles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formatos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formatos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colores" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hex" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tamanos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inches" DECIMAL(5,2),
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tamanos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "parentId" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colecciones" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "kind" "CollectionKind" NOT NULL DEFAULT 'CURATED',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colecciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(10,2),
    "compareAtPrice" DECIMAL(10,2),
    "cost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "allowBackorder" BOOLEAN NOT NULL DEFAULT false,
    "brandId" TEXT,
    "productTypeId" TEXT,
    "fuelTypeId" TEXT,
    "seriesId" TEXT,
    "formatId" TEXT,
    "colorId" TEXT,
    "sizeId" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "rawCategory" TEXT,
    "rawSubcategory" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_categoria" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "producto_categoria_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "producto_coleccion" (
    "productId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "producto_coleccion_pkey" PRIMARY KEY ("productId","collectionId")
);

-- CreateTable
CREATE TABLE "producto_compatibilidad" (
    "productId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "producto_compatibilidad_pkey" PRIMARY KEY ("productId","seriesId")
);

-- CreateTable
CREATE TABLE "producto_imagenes" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "blobPath" TEXT,

    CONSTRAINT "producto_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producto_especificaciones" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "group" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "producto_especificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "categoryId" TEXT,
    "parentId" TEXT,
    "location" "MenuLocation" NOT NULL DEFAULT 'HEADER',
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paginas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "heroImageUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paginas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloques_contenido" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" "BlockType" NOT NULL,
    "data" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "bloques_contenido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "startsAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "capacity" INTEGER,
    "price" DECIMAL(10,2),
    "kind" "CourseKind" NOT NULL DEFAULT 'PUBLIC',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'IMAGE',
    "title" TEXT,
    "alt" TEXT,
    "tag" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "blobPath" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT NOT NULL,
    "mobileImageUrl" TEXT,
    "linkUrl" TEXT,
    "location" "BannerSlot" NOT NULL DEFAULT 'HOME_HERO',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospectos" (
    "id" TEXT NOT NULL,
    "kind" "LeadKind" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "message" TEXT,
    "extra" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospectos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'Weber Store',
    "whatsapp" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "googleMapsUrl" TEXT,
    "googleMapsEmbed" TEXT,
    "openingHours" JSONB,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "announcement" TEXT,
    "localDeliveryFee" DECIMAL(10,2),
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marcas_slug_key" ON "marcas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_producto_slug_key" ON "tipos_producto"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "combustibles_slug_key" ON "combustibles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "formatos_slug_key" ON "formatos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "colores_slug_key" ON "colores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tamanos_slug_key" ON "tamanos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "categorias_parentId_idx" ON "categorias"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "colecciones_slug_key" ON "colecciones"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "productos_sku_key" ON "productos"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "productos_status_idx" ON "productos"("status");

-- CreateIndex
CREATE INDEX "productos_seriesId_idx" ON "productos"("seriesId");

-- CreateIndex
CREATE INDEX "productos_fuelTypeId_idx" ON "productos"("fuelTypeId");

-- CreateIndex
CREATE INDEX "productos_productTypeId_idx" ON "productos"("productTypeId");

-- CreateIndex
CREATE INDEX "producto_categoria_categoryId_idx" ON "producto_categoria"("categoryId");

-- CreateIndex
CREATE INDEX "producto_coleccion_collectionId_idx" ON "producto_coleccion"("collectionId");

-- CreateIndex
CREATE INDEX "producto_compatibilidad_seriesId_idx" ON "producto_compatibilidad"("seriesId");

-- CreateIndex
CREATE INDEX "producto_imagenes_productId_idx" ON "producto_imagenes"("productId");

-- CreateIndex
CREATE INDEX "producto_especificaciones_productId_idx" ON "producto_especificaciones"("productId");

-- CreateIndex
CREATE INDEX "menu_parentId_idx" ON "menu"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "paginas_slug_key" ON "paginas"("slug");

-- CreateIndex
CREATE INDEX "bloques_contenido_pageId_idx" ON "bloques_contenido"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "cursos_slug_key" ON "cursos"("slug");

-- CreateIndex
CREATE INDEX "media_tag_idx" ON "media"("tag");

-- CreateIndex
CREATE INDEX "prospectos_kind_status_idx" ON "prospectos"("kind", "status");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "marcas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "tipos_producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_fuelTypeId_fkey" FOREIGN KEY ("fuelTypeId") REFERENCES "combustibles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "formatos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "colores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "tamanos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_categoria" ADD CONSTRAINT "producto_categoria_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_categoria" ADD CONSTRAINT "producto_categoria_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_coleccion" ADD CONSTRAINT "producto_coleccion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_coleccion" ADD CONSTRAINT "producto_coleccion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "colecciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_compatibilidad" ADD CONSTRAINT "producto_compatibilidad_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_compatibilidad" ADD CONSTRAINT "producto_compatibilidad_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_imagenes" ADD CONSTRAINT "producto_imagenes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "producto_especificaciones" ADD CONSTRAINT "producto_especificaciones_productId_fkey" FOREIGN KEY ("productId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu" ADD CONSTRAINT "menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloques_contenido" ADD CONSTRAINT "bloques_contenido_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "paginas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
