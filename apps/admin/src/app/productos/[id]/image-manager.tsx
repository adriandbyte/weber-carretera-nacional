'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { FormState } from './actions';

interface ImageRecord {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-carbon-300 px-3 py-2 text-sm text-carbon-700 transition hover:bg-carbon-100 disabled:opacity-50"
    >
      {pending ? 'Subiendo…' : 'Subir imagen'}
    </button>
  );
}

/// Gestor de imagenes. Vive fuera del formulario principal porque subir y
/// borrar archivos son acciones inmediatas, y anidar un <form> dentro de otro
/// no es HTML valido.
///
/// Es componente de cliente para poder mostrar el resultado de la subida: sin
/// eso, un fallo (archivo muy grande, almacenamiento sin configurar) no
/// dejaria ningun rastro en pantalla y el usuario creeria que funciono.
export function ImageManager({
  images,
  uploadAction,
  deleteAction,
  setPrimaryAction,
}: {
  images: ImageRecord[];
  uploadAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  deleteAction: (formData: FormData) => Promise<void>;
  setPrimaryAction: (formData: FormData) => Promise<void>;
}) {
  const [state, formAction] = useActionState(uploadAction, { ok: false });

  return (
    <section className="rounded-card border border-carbon-200 bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-carbon-900">Imágenes</h2>
        <p className="text-sm text-carbon-400">
          {images.length === 0
            ? 'Sin imágenes'
            : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
        </p>
      </div>

      {images.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-4">
          {images.map((image) => (
            <li key={image.id} className="w-40">
              <div
                className={`relative aspect-square overflow-hidden rounded-card border-2 bg-steel-100 ${
                  image.isPrimary ? 'border-carbon-900' : 'border-carbon-100'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt={image.alt ?? ''} className="h-full w-full object-contain" />
                {image.isPrimary && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-carbon-900 px-2 py-0.5 text-xs font-medium text-white">
                    Portada
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                {image.isPrimary ? (
                  <span className="text-carbon-300">Portada</span>
                ) : (
                  <form action={setPrimaryAction}>
                    <input type="hidden" name="imageId" value={image.id} />
                    <button type="submit" className="text-carbon-500 underline hover:text-carbon-900">
                      Usar de portada
                    </button>
                  </form>
                )}
                <form action={deleteAction}>
                  <input type="hidden" name="imageId" value={image.id} />
                  <button type="submit" className="text-ember-600 underline hover:text-ember-700">
                    Eliminar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.message && (
        <p
          role="status"
          className={`mt-5 rounded-md border px-3 py-2 text-sm ${
            state.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-ember-300 bg-ember-100 text-ember-700'
          }`}
        >
          {state.message}
        </p>
      )}

      <form
        action={formAction}
        className="mt-5 flex flex-wrap items-center gap-3 border-t border-carbon-100 pt-5"
      >
        <input
          type="file"
          name="file"
          accept="image/png,image/jpeg,image/webp"
          required
          className="text-sm text-carbon-600 file:mr-3 file:rounded-md file:border-0 file:bg-carbon-100 file:px-3 file:py-2 file:text-sm file:text-carbon-700 hover:file:bg-carbon-200"
        />
        <UploadButton />
        <p className="text-xs text-carbon-400">PNG, JPG o WebP. Máximo 8 MB.</p>
      </form>
    </section>
  );
}
