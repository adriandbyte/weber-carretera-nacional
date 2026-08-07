'use client';

import { useRef, useTransition } from 'react';
import { ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FormState } from './actions';

interface ImageRecord {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
}

/// Gestor de imagenes.
///
/// Vive dentro del formulario principal, en la columna lateral, asi que no
/// puede usar <form> propios: anidar un formulario dentro de otro no es HTML
/// valido. Llama a los Server Actions directamente desde el cliente, que es lo
/// que ya hacian esos formularios, solo que sin el envio de por medio.
///
/// De paso desaparece el paso de dos tiempos "elegir archivo y luego pulsar
/// subir", y con el la caja nativa que decia "Choose File / No file chosen" en
/// ingles en un panel que esta todo en español: ese texto lo pone el navegador
/// y no se puede traducir.
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const data = new FormData();
    data.set('file', file);
    startTransition(async () => {
      const result = await uploadAction({ ok: false }, data);
      if (!result.message) return;
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function run(action: (formData: FormData) => Promise<void>, imageId: string) {
    const data = new FormData();
    data.set('imageId', imageId);
    startTransition(() => action(data));
  }

  return (
    <Card size="sm">
      <CardHeader>
        {/* CardTitle es un div sin flex, asi que un gap suelto no separaba
            nada y el asterisco quedaba pegado: "Imágenes*" frente al
            "Nombre *" del resto del formulario. */}
        <CardTitle className="flex items-center gap-0.5">
          Imágenes
          <span className="text-primary" aria-hidden>
            *
          </span>
        </CardTitle>
        <CardDescription>
          {images.length === 0
            ? 'Hace falta al menos una para publicar'
            : `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-2">
            {images.map((image) => (
              <li key={image.id}>
                <div
                  className={`bg-photo relative aspect-square overflow-hidden rounded-lg ring-2 ${
                    image.isPrimary ? 'ring-primary' : 'ring-border'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.alt ?? ''} className="size-full object-contain" />
                  {image.isPrimary && (
                    <span className="bg-primary text-primary-foreground absolute top-1 left-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.65rem] leading-none font-medium">
                      <Star className="size-2.5 fill-current" />
                      Portada
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending || image.isPrimary}
                    onClick={() => run(setPrimaryAction, image.id)}
                    title={image.isPrimary ? 'Ya es la portada' : 'Usar de portada'}
                    aria-label={image.isPrimary ? 'Ya es la portada' : 'Usar de portada'}
                    className="text-muted-foreground hover:text-primary disabled:opacity-30"
                  >
                    <Star className={image.isPrimary ? 'fill-current' : undefined} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    disabled={pending}
                    onClick={() => run(deleteAction, image.id)}
                    title="Eliminar imagen"
                    aria-label="Eliminar imagen"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Se limpia el input para que volver a elegir el mismo archivo
            // dispare el cambio otra vez, cosa que hace falta al reintentar
            // una subida que fallo.
            event.target.value = '';
            if (file) upload(file);
          }}
        />

        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
          className="w-full"
        >
          {pending ? <Loader2 className="animate-spin" /> : <ImagePlus data-icon="inline-start" />}
          {pending ? 'Subiendo…' : 'Subir imagen'}
        </Button>

        <p className="text-muted-foreground text-xs">PNG, JPG o WebP. Se reduce y optimiza sola.</p>
      </CardContent>
    </Card>
  );
}
