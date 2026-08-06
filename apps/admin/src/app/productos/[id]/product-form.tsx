'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
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

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador (no se ve en la tienda)' },
  { value: 'ACTIVE', label: 'Publicado' },
  { value: 'ARCHIVED', label: 'Archivado' },
  { value: 'DISCONTINUED', label: 'Descontinuado' },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? 'Guardando…' : 'Guardar cambios'}
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
  const isEquipment = equipmentTypeIds.includes(productTypeId);

  return (
    <form action={formAction} className="pb-24">
      <p className="mb-4 text-xs text-muted-foreground">
        Los campos marcados con <span className="font-medium text-primary">*</span> son obligatorios
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

              {!isEquipment && (
                <CheckboxGroup
                  name="compatibleSeriesIds"
                  label="Compatible con"
                  options={catalogs.series}
                  selected={values.compatibleSeriesIds}
                  errors={errors.compatibleSeriesIds}
                  columns={3}
                  hint="Con qué asadores sirve este accesorio."
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* --- Columna lateral -------------------------------------------- */}
        <div className="space-y-6">
          {media}

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
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
                  <p key={error} className="text-xs font-medium text-destructive">
                    {error}
                  </p>
                ))}
                <p className="text-xs text-muted-foreground">
                  Para publicar hacen falta todos los campos marcados con{' '}
                  <span className="font-medium text-primary">*</span>.
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
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Precio
              </CardTitle>
              <CardDescription className="text-xs">
                Opcional por ahora. Déjalo vacío hasta que llegue la lista de precios.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <TextField
                name="price"
                label="Precio de venta"
                defaultValue={values.price}
                errors={errors.price}
                placeholder="12499.00"
              />
              <TextField
                name="compareAtPrice"
                label="Precio de lista"
                defaultValue={values.compareAtPrice}
                errors={errors.compareAtPrice}
                placeholder="14999.00"
                hint="El que se muestra tachado en una oferta."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Barra fija: con un formulario tan largo, un boton al final del todo
          obliga a bajar cada vez para guardar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/85 px-8 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[88rem] items-center justify-end gap-2">
          <Button asChild variant="ghost" size="lg">
            <Link href="/productos">Volver a la lista</Link>
          </Button>
          <SaveButton />
        </div>
      </div>
    </form>
  );
}
