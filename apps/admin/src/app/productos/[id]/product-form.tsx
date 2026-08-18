'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { slugify } from '@weber/core';
import {
  CheckboxField,
  CheckboxGroup,
  SelectField,
  TextArea,
  TextField,
  type Option,
} from '@/components/fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Separator } from '@/components/ui/separator';
import { useActionToast } from '@/hooks/use-action-toast';
import type { FormState } from './actions';

interface Catalogs {
  productTypes: Option[];
  fuelTypes: Option[];
  series: Option[];
  formats: Option[];
  colors: Option[];
  sizes: Option[];
  categories: Option[];
}

export interface ProductFormValues {
  name: string;
  /// La direccion que ya tiene guardada. Es la que manda cuando el producto
  /// esta publicado: ahi el slug ya no se recalcula.
  slug: string;
  published: boolean;
  shortDescription: string | null;
  description: string | null;
  status: string;
  price: string | null;
  compareAtPrice: string | null;
  productTypeId: string | null;
  fuelTypeId: string | null;
  seriesId: string | null;
  formatId: string | null;
  colorId: string | null;
  sizeId: string | null;
  categoryIds: string[];
  compatibleSeriesIds: string[];
  needsReview: boolean;
  reviewNote: string | null;
}

/// La direccion que va a tener el producto en la tienda, debajo del nombre.
///
/// Es de lectura, no un campo: quien captura no decide la direccion, la decide
/// el nombre. Pero sin verla nadie entiende por que el nombre importa tanto ni
/// que significa que se congele al publicar, y esas dos cosas se explican solas
/// viendo la linea cambiar al escribir.
///
/// Mientras es borrador es una prevision: si al publicar el slug ya lo tiene
/// otro producto, el servidor le pega el SKU para desempatar.
function StoreAddress({ name, slug, frozen }: { name: string; slug: string; frozen: boolean }) {
  const preview = frozen ? slug : slugify(name) || slug;

  return (
    <p className="text-muted-foreground text-xs">
      Dirección en la tienda:{' '}
      <span className="text-foreground font-mono break-all">/productos/{preview}</span>
      <span className="block">
        {frozen
          ? 'Ya está publicada, así que no cambia aunque edites el nombre.'
          : 'Se calcula con el nombre y se congela al publicar.'}
      </span>
    </p>
  );
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador (no se ve en la tienda)' },
  { value: 'ACTIVE', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Archivado' },
  { value: 'DISCONTINUED', label: 'Descontinuado' },
];

/// Los botones de la barra comparten formulario y se distinguen por el valor
/// que envian en `intent`. Los tres guardan; solo cambia a donde llevan
/// despues: quedarse, salir a la lista o abrir la siguiente ficha.
///
/// useFormStatus da un unico `pending` para todo el formulario, asi que sin
/// esto los tres se pondrian a girar a la vez y no se sabria cual se pulso.
/// `formData` dice cual fue.
function SubmitButton({
  intent,
  label,
  pendingLabel,
  variant,
  children,
}: {
  intent: 'save' | 'exit' | 'next';
  label: string;
  pendingLabel: string;
  variant?: 'outline';
  children?: React.ReactNode;
}) {
  const { pending, data } = useFormStatus();
  const isThisOne = data?.get('intent') === intent;

  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      size="lg"
      variant={variant}
      disabled={pending}
    >
      {pending && isThisOne && <Loader2 className="animate-spin" />}
      {pending && isThisOne ? pendingLabel : label}
      {!(pending && isThisOne) && children}
    </Button>
  );
}

export function ProductForm({
  values,
  catalogs,
  equipmentTypeIds,
  action,
  media,
}: {
  values: ProductFormValues;
  catalogs: Catalogs;
  equipmentTypeIds: string[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  /// El gestor de imagenes, que la pagina pasa ya construido. Llega como pieza
  /// y no como datos porque tiene que quedar dentro de este <form> para
  /// ocupar la columna lateral, y no hay nada que el formulario necesite saber
  /// de el.
  media: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  useActionToast(state);
  const errors = state.errors ?? {};

  // Se sigue el tipo elegido para esconder la compatibilidad en cuanto deja de
  // aplicar, sin esperar a guardar.
  const [productTypeId, setProductTypeId] = useState(values.productTypeId ?? '');
  // Y el nombre, para que la direccion de debajo se actualice mientras se
  // escribe: es lo que hace evidente que el nombre no es solo un titulo.
  const [name, setName] = useState(values.name);
  const isEquipment = equipmentTypeIds.includes(productTypeId);

  return (
    <form action={formAction} className="pb-24">
      <p className="text-muted-foreground mb-4 text-xs">
        Los campos marcados con <span className="text-primary font-medium">*</span> son obligatorios
        para publicar. Sin ellos el producto se puede guardar como borrador, pero no sale a la
        tienda.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* --- Columna principal ------------------------------------------ */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contenido</CardTitle>
              <CardDescription>
                Lo que el cliente lee en la tienda. Escríbelo como se lo explicarías a alguien en
                mostrador, no con el código interno de Weber.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <TextField
                name="name"
                label="Nombre"
                required
                defaultValue={values.name}
                errors={errors.name}
                hint="Ejemplo: Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro"
                onValueChange={setName}
                after={<StoreAddress name={name} slug={values.slug} frozen={values.published} />}
              />
              <TextArea
                name="shortDescription"
                label="Descripción corta"
                required
                rows={3}
                defaultValue={values.shortDescription}
                errors={errors.shortDescription}
                hint="Una o dos frases. Es lo que se ve en las listas de productos."
              />
              <TextArea
                name="description"
                label="Descripción completa"
                rows={10}
                defaultValue={values.description}
                errors={errors.description}
                hint="Materiales, medidas, para cuántas personas, qué incluye, garantía."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clasificación</CardTitle>
              <CardDescription>
                Define en qué filtros y secciones aparece el producto. Si falta una opción, se
                agrega en Catálogos.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  name="productTypeId"
                  label="Tipo de producto"
                  required
                  options={catalogs.productTypes}
                  value={productTypeId}
                  onChange={setProductTypeId}
                  errors={errors.productTypeId}
                />
                <SelectField
                  name="fuelTypeId"
                  label="Combustible"
                  options={catalogs.fuelTypes}
                  defaultValue={values.fuelTypeId}
                  errors={errors.fuelTypeId}
                  emptyLabel="No aplica"
                />
                <SelectField
                  name="seriesId"
                  label="Serie"
                  options={catalogs.series}
                  defaultValue={values.seriesId}
                  errors={errors.seriesId}
                  emptyLabel="No aplica"
                />
                <SelectField
                  name="formatId"
                  label="Formato"
                  options={catalogs.formats}
                  defaultValue={values.formatId}
                  errors={errors.formatId}
                  emptyLabel="No aplica"
                />
                <SelectField
                  name="colorId"
                  label="Color"
                  options={catalogs.colors}
                  defaultValue={values.colorId}
                  errors={errors.colorId}
                  emptyLabel="No aplica"
                />
                <SelectField
                  name="sizeId"
                  label="Tamaño"
                  options={catalogs.sizes}
                  defaultValue={values.sizeId}
                  errors={errors.sizeId}
                  emptyLabel="No aplica"
                />
              </div>

              <Separator />

              <CheckboxGroup
                name="categoryIds"
                label="Categorías del menú"
                required
                options={catalogs.categories}
                selected={values.categoryIds}
                errors={errors.categoryIds}
                columns={3}
                hint="Marca todas donde deba aparecer. La primera es la principal."
              />

              {/* El marcador viaja solo cuando las casillas estan en pantalla.
                  Sin el, el guardado no puede saber si la lista llego vacia
                  porque nadie marco nada o porque el bloque ni se pinto, y
                  confundir las dos cosas borraba compatibilidades ya
                  capturadas. */}
              {isEquipment ? (
                values.compatibleSeriesIds.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Este producto guarda{' '}
                    <span className="text-foreground font-medium">
                      {values.compatibleSeriesIds.length}{' '}
                      {values.compatibleSeriesIds.length === 1 ? 'serie' : 'series'} compatibles
                    </span>{' '}
                    de cuando era un accesorio. No se muestran porque su tipo actual es un equipo, y
                    se conservan por si el tipo se eligió por error: vuelve a marcarlo como
                    accesorio y reaparecen.
                  </p>
                )
              ) : (
                <>
                  <input type="hidden" name="compatibilityEditable" value="1" />
                  <CheckboxGroup
                    name="compatibleSeriesIds"
                    label="Compatible con"
                    options={catalogs.series}
                    selected={values.compatibleSeriesIds}
                    errors={errors.compatibleSeriesIds}
                    columns={3}
                    hint="Con qué asadores sirve este accesorio."
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- Columna lateral -------------------------------------------- */}
        <div className="space-y-6">
          {media}

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Publicación
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">Estado</Label>
                <NativeSelect id="status" name="status" defaultValue={values.status}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
                {errors.status?.map((error) => (
                  <p key={error} className="text-destructive text-xs font-medium">
                    {error}
                  </p>
                ))}
                <p className="text-muted-foreground text-xs">
                  Para publicar hacen falta todos los campos marcados con{' '}
                  <span className="text-primary font-medium">*</span>.
                </p>
              </div>

              <Separator />

              <CheckboxField
                name="needsReview"
                label="Sigue pendiente de revisión"
                hint="Desmárcalo cuando ya lo hayas limpiado."
                defaultChecked={values.needsReview}
              />
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Precio
              </CardTitle>
              <CardDescription className="text-xs">
                Opcional por ahora. Déjalo vacío hasta que llegue la lista de precios.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Sin placeholder de ejemplo: un "12499.00" en gris se confunde
                  con un precio ya capturado, y el campo vacio es justamente el
                  estado normal mientras no llega la lista. El formato va en la
                  pista, que no se puede leer como valor. */}
              <TextField
                name="price"
                label="Precio de venta"
                defaultValue={values.price}
                errors={errors.price}
                hint="Solo el número, sin $ ni comas."
              />
              <TextField
                name="compareAtPrice"
                label="Precio de lista"
                defaultValue={values.compareAtPrice}
                errors={errors.compareAtPrice}
                hint="El que se muestra tachado en una oferta."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barra fija: con un formulario tan largo, un boton al final del todo
          obliga a bajar cada vez para guardar. */}
      <div className="border-border bg-background/85 fixed inset-x-0 bottom-0 z-10 border-t px-8 py-3 backdrop-blur">
        {/* Los tres guardan. Ya no hay en la barra ningun "Volver a la lista"
            que se lleve por delante lo escrito: estaba pegado al boton de
            guardar y en un formulario tan largo era cuestion de tiempo perder
            una descripcion recien redactada. Para salir sin guardar sigue
            estando el enlace "Productos" de arriba, lejos de aqui. */}
        <div className="mx-auto flex max-w-[88rem] items-center justify-end gap-2">
          <SubmitButton
            intent="save"
            label="Guardar cambios"
            pendingLabel="Guardando…"
            variant="outline"
          />
          <SubmitButton
            intent="exit"
            label="Guardar y salir"
            pendingLabel="Guardando…"
            variant="outline"
          />
          {/* El principal es este: con 331 fichas por limpiar, lo normal es
              encadenar una tras otra y salir a la lista es la excepcion. */}
          <SubmitButton intent="next" label="Guardar y seguir" pendingLabel="Guardando…">
            <ArrowRight data-icon="inline-end" />
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
