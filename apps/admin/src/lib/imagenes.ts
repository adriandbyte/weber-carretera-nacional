// ---------------------------------------------------------------------------
// Subida de imagenes: validar, optimizar y guardar.
//
// Vive aqui y no dentro de una pantalla porque lo usan las fotos de producto y
// la imagen de categoria, y son exactamente las mismas reglas. Duplicarlas
// terminaria con dos limites de peso distintos y dos calidades de WebP.
// ---------------------------------------------------------------------------

import { del, put } from '@vercel/blob';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/// Lado maximo que se guarda. Una foto de celular llega con 4000 px o mas y
/// nadie va a ver un asador a ese tamaño ni en pantalla completa. Guardarla
/// tal cual solo hace lenta la pagina y cara la factura de almacenamiento.
const MAX_EDGE = 2000;

/// Comprueba que el archivo sirva. Devuelve el mensaje para la persona, o null
/// si todo esta bien.
///
/// Se devuelve el texto en vez de lanzar: quien captura tiene que leer que
/// hacer, no una excepcion.
export function validateImage(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) return 'Elige un archivo de imagen.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Solo se aceptan imágenes PNG, JPG o WebP.';
  if (file.size > MAX_IMAGE_BYTES) return 'La imagen no debe pesar más de 12 MB.';
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return 'Falta configurar el almacenamiento de imágenes (BLOB_READ_WRITE_TOKEN).';
  }
  return null;
}

export interface PreparedImage {
  buffer: Buffer;
  width: number | null;
  height: number | null;
}

/// Se normaliza todo a WebP: pesa alrededor de un tercio menos que JPEG con la
/// misma calidad visible y lo entienden todos los navegadores actuales. Ademas
/// deja un solo formato en la tienda en vez de una mezcla de PNG y JPEG.
export async function prepareImage(file: File): Promise<PreparedImage> {
  const sharp = (await import('sharp')).default;
  const original = Buffer.from(await file.arrayBuffer());

  const pipeline = sharp(original)
    // withoutEnlargement: una imagen que ya es chica no se estira, porque
    // agrandar no agrega detalle, solo peso.
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 });

  const buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? null, height: meta.height ?? null };
}

/// Guarda el WebP ya preparado y devuelve donde quedo.
export async function storeImage(path: string, buffer: Buffer) {
  const stored = await put(path, buffer, {
    access: 'public',
    contentType: 'image/webp',
    addRandomSuffix: false,
  });
  return { url: stored.url, blobPath: stored.pathname };
}

/// Borra el archivo real, solo si vive en Blob.
///
/// Las rutas locales del importador se dejan en disco a proposito: son la copia
/// de respaldo del Excel y no cuestan almacenamiento en la nube.
export async function removeStoredImage(url: string | null): Promise<void> {
  if (!url?.startsWith('https://') || !process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(url).catch(() => undefined);
}

/// Cuanto se ahorro al optimizar, en porcentaje entero.
export function savedPercent(originalBytes: number, finalBytes: number): number {
  return Math.round((1 - finalBytes / originalBytes) * 100);
}
