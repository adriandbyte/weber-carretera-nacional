'use client';

import { useRef, useState, useTransition } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TextArea, TextField } from '@/components/fields';
import { ConfirmDialog, FormDialog, useDialogErrors } from '@/components/form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CategoryState } from './actions';

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  position: number;
  active: boolean;
  /// Cuantos productos hay dentro. Con uno solo ya no se puede eliminar.
  productCount: number;
}

interface Actions {
  create: (prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  update: (id: string, prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  remove: (prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  uploadImage: (id: string, prev: CategoryState, formData: FormData) => Promise<CategoryState>;
  removeImage: (prev: CategoryState, formData: FormData) => Promise<CategoryState>;
}

/// La imagen se sube sola, fuera del formulario de texto.
///
/// Va aparte porque un archivo no se puede guardar "en borrador": en cuanto se
/// elige, o se sube o no. Mezclarla con el resto obligaria a reenviar el
/// archivo cada vez que se corrige una coma de la descripcion.
function ImageBox({
  row,
  actions,
}: {
  row: CategoryRow;
  actions: Pick<Actions, 'uploadImage' | 'removeImage'>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  // La ventana no se entera de que el servidor revalido la pagina de detras,
  // asi que la miniatura se actualiza con lo que responde la accion.
  const [imageUrl, setImageUrl] = useState(row.imageUrl);

  function run(promise: Promise<CategoryState>, siguiente: string | null) {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        setImageUrl(siguiente);
        if (result.message) toast.success(result.message);
      } else if (result.message) {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label>Imagen de la sección</Label>

      <div className="flex items-start gap-3">
        <div className="bg-photo ring-border flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="text-muted-foreground/50 size-5" />
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Se limpia para que volver a elegir el mismo archivo dispare el
              // cambio otra vez, cosa que hace falta al reintentar.
              event.target.value = '';
              if (!file) return;
              const data = new FormData();
              data.set('file', file);
              startTransition(async () => {
                const result = await actions.uploadImage(row.id, { ok: false }, data);
                if (result.ok) {
                  setImageUrl(result.imageUrl ?? null);
                  if (result.message) toast.success(result.message);
                } else if (result.message) {
                  toast.error(result.message);
                }
              });
            }}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              {pending && <Loader2 className="animate-spin" />}
              {pending ? 'Subiendo…' : imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
            </Button>

            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const data = new FormData();
                  data.set('id', row.id);
                  run(actions.removeImage({ ok: false }, data), null);
                }}
              >
                Quitar
              </Button>
            )}
          </div>

          <p className="text-muted-foreground text-xs">
            PNG, JPG o WebP. Se reduce y optimiza sola. Es la foto que encabeza la sección en la
            tienda.
          </p>
        </div>
      </div>
    </div>
  );
}

/// Los campos de la ficha. Los comparten crear y editar: al crear llegan
/// vacios, y por eso `row` es opcional.
function CategoryFields({ row }: { row?: CategoryRow }) {
  const errors = useDialogErrors();
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="name"
          label="Nombre"
          required
          defaultValue={row?.name}
          errors={errors.name}
          hint="Como aparece en el menú de la tienda."
        />
        <TextField
          name="position"
          label="Orden en el menú"
          type="number"
          defaultValue={String(row?.position ?? 0)}
          errors={errors.position}
          hint="Menor número, más arriba."
        />
      </div>

      <TextArea
        name="description"
        label="Descripción"
        rows={3}
        defaultValue={row?.description}
        errors={errors.description}
        hint="El texto de entrada de la sección. Una o dos frases."
      />

      <Separator />

      {/* Los dos campos de buscadores van juntos y al final: se rellenan solos
          con el nombre y la descripcion, asi que casi nunca hay que tocarlos. */}
      <p className="text-muted-foreground text-xs">
        Si dejas estos dos en blanco se rellenan con el nombre y la descripción de arriba.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="metaTitle"
          label="Título para buscadores"
          defaultValue={row?.metaTitle}
          errors={errors.metaTitle}
          hint="El titular en Google. Máximo 70 caracteres."
        />
        <TextField
          name="metaDescription"
          label="Descripción para buscadores"
          defaultValue={row?.metaDescription}
          errors={errors.metaDescription}
          hint="El párrafo gris bajo el titular. Máximo 160."
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`active-${row?.id ?? 'nueva'}`}
          name="active"
          defaultChecked={row?.active ?? true}
        />
        <Label
          htmlFor={`active-${row?.id ?? 'nueva'}`}
          className="text-muted-foreground font-normal"
        >
          Visible en la tienda
        </Label>
      </div>
    </>
  );
}

export function NewCategoryDialog({ action }: { action: Actions['create'] }) {
  return (
    <FormDialog
      wide
      trigger={
        <Button size="lg">
          <Plus data-icon="inline-start" />
          Nueva categoría
        </Button>
      }
      title="Nueva categoría"
      description="Una sección del menú de la tienda. La imagen se sube después, al editarla."
      action={action}
      submitLabel="Crear categoría"
    >
      <CategoryFields />
    </FormDialog>
  );
}

function EditCategoryDialog({ row, actions }: { row: CategoryRow; actions: Actions }) {
  return (
    <FormDialog
      wide
      trigger={
        <Button type="button" variant="ghost" size="sm">
          <Pencil data-icon="inline-start" />
          Editar
        </Button>
      }
      title={row.name}
      description="Lo que se ve de esta sección en la tienda."
      action={actions.update.bind(null, row.id)}
      submitLabel="Guardar cambios"
    >
      <CategoryFields row={row} />
      <Separator />
      {/* Fuera del guardado del formulario: la imagen se sube sola en cuanto
          se elige, no al pulsar Guardar. */}
      <ImageBox row={row} actions={actions} />
    </FormDialog>
  );
}

export function CategoryTable({ rows, actions }: { rows: CategoryRow[]; actions: Actions }) {
  return (
    <Card className="gap-0 py-0">
      <Table className="min-w-[46rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground px-4">Categoría</TableHead>
            <TableHead className="text-muted-foreground w-24 px-4 text-right">Orden</TableHead>
            <TableHead className="text-muted-foreground w-32 px-4 text-right">Productos</TableHead>
            <TableHead className="text-muted-foreground w-28 px-4">Estado</TableHead>
            <TableHead className="text-muted-foreground w-40 px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="text-muted-foreground px-4 py-14 text-center">
                Todavía no hay ninguna categoría.
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => (
            // Ver el comentario de la tabla de productos: celdas arriba y con
            // el mismo relleno para que la primera linea de cada columna caiga
            // en el mismo renglon.
            <TableRow key={row.id} className="[&>td]:align-top [&>td:not(:last-child)]:py-3">
              <TableCell className="px-4 whitespace-normal">
                <div className="flex items-start gap-3">
                  <div className="bg-photo ring-border flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <ImagePlus className="text-muted-foreground/40 size-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="block font-medium">{row.name}</span>
                    <span className="text-muted-foreground line-clamp-1 block text-xs">
                      {row.description ?? 'Sin descripción'}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground px-4 text-right tabular-nums">
                {row.position}
              </TableCell>
              <TableCell className="text-muted-foreground px-4 text-right tabular-nums">
                {row.productCount}
              </TableCell>
              <TableCell className="px-4">
                <Badge variant={row.active ? 'success' : 'secondary'}>
                  {row.active ? 'Visible' : 'Oculta'}
                </Badge>
              </TableCell>
              {/* Menos relleno que el resto: los botones son mas altos que una
                  linea de texto, y con el mismo py su etiqueta caia por debajo
                  del renglon de las demas columnas. La fila excluye esta celda
                  de su regla de relleno para no pisar este py. */}
              <TableCell className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <EditCategoryDialog row={row} actions={actions} />

                  {row.productCount === 0 ? (
                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${row.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      }
                      title={`¿Eliminar "${row.name}"?`}
                      description="Se borra la categoría y su imagen. No hay forma de recuperarla."
                      action={actions.remove}
                      hidden={{ id: row.id }}
                    />
                  ) : (
                    <span
                      title={`Hay ${row.productCount} productos en esta categoría. Edítala y desmarca "Visible" si ya no debe aparecer.`}
                      className="text-muted-foreground cursor-help px-2 text-xs"
                    >
                      En uso
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="border-border text-muted-foreground border-t px-4 py-3 text-xs">
        Una categoría con productos dentro no se puede eliminar: esos productos se quedarían sin
        sección en la tienda. Ocúltala en su lugar.
      </p>
    </Card>
  );
}
