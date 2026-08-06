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

/// Nombre estable derivado del contenido. Reimportar el mismo Excel produce
/// exactamente las mismas rutas, asi que no se acumulan copias.
export function imageKey(sku: string, buffer: Buffer, extension: string, index: number): string {
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 10);
  return `productos/${sku}-${index}-${hash}.${extension}`;
}

export { contentTypeFor };
