// ---------------------------------------------------------------------------
// Destino de las imagenes extraidas del Excel.
//
// Hay dos estrategias detras de la misma interfaz para que el importador no
// sepa donde acaban los archivos:
//
//   blob   Vercel Blob, lo que corre en produccion.
//   local  carpeta data/imagenes, para poder importar y revisar sin
//          credenciales ni gastar cuota.
//
// Se elige con BLOB_READ_WRITE_TOKEN: si esta, se sube; si no, se escribe
// en disco y se avisa.
// ---------------------------------------------------------------------------

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

export interface StoredImage {
  url: string;
  blobPath: string;
}

export interface ImageStore {
  readonly kind: 'blob' | 'local';
  save(key: string, buffer: Buffer, contentType: string): Promise<StoredImage>;
}

const contentTypeFor = (extension: string): string =>
  ({
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  })[extension.toLowerCase()] ?? 'application/octet-stream';

class LocalImageStore implements ImageStore {
  readonly kind = 'local' as const;

  constructor(private readonly root: string) {}

  async save(key: string, buffer: Buffer): Promise<StoredImage> {
    const target = path.join(this.root, key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
    return { url: `/imagenes/${key}`, blobPath: key };
  }
}

class BlobImageStore implements ImageStore {
  readonly kind = 'blob' as const;

  async save(key: string, buffer: Buffer, contentType: string): Promise<StoredImage> {
    const { put } = await import('@vercel/blob');
    const result = await put(key, buffer, {
      access: 'public',
      contentType,
      // El nombre ya trae el hash del contenido, asi que un sufijo aleatorio
      // solo estorbaria: rompe la idempotencia al reimportar.
      addRandomSuffix: false,
    });
    return { url: result.url, blobPath: result.pathname };
  }
}

export function createImageStore(localRoot: string): ImageStore {
  return process.env.BLOB_READ_WRITE_TOKEN ? new BlobImageStore() : new LocalImageStore(localRoot);
}

/// Medidas reales del archivo.
///
/// Sin ancho y alto, el navegador no sabe cuanto espacio reservar y la pagina
/// da un salto cuando la imagen termina de cargar. Eso cuenta como error de
/// experiencia en Google (Cumulative Layout Shift) y castiga el
/// posicionamiento, que es justo lo que se busca ganar con este sitio.
///
/// Guardarlas tambien es lo que permite servir la version del tamano correcto
/// para cada pantalla en vez del archivo completo siempre.
export async function readDimensions(
  buffer: Buffer,
): Promise<{ width: number | null; height: number | null }> {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    // Un archivo ilegible no debe tumbar una importacion de 331 productos.
    return { width: null, height: null };
  }
}

/// Decide si una imagen ya registrada sirve tal cual o hay que volver a
/// guardarla en el almacenamiento actual.
///
/// La ruta (blobPath) es identica en disco y en la nube, asi que no distingue
/// nada: lo que cambia es la URL. Una imagen local apunta a /imagenes/... , que
/// no existe en un servidor desplegado. Sin esta comprobacion, configurar el
/// token y reimportar dejaria las 322 imagenes apuntando a una ruta muerta.
export function isInStore(url: string, storeKind: 'blob' | 'local'): boolean {
  return url.startsWith('https://') === (storeKind === 'blob');
}

/// Nombre estable derivado del contenido. Reimportar el mismo Excel produce
/// exactamente las mismas rutas, asi que no se acumulan copias.
export function imageKey(sku: string, buffer: Buffer, extension: string, index: number): string {
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 10);
  return `productos/${sku}-${index}-${hash}.${extension}`;
}

export { contentTypeFor };
