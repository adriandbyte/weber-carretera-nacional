'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckboxGroup, SelectField, TextArea, TextField, type Option } from '@/components/fields';
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
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-carbon-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-carbon-700 disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Guardar cambios'}
    </button>
  );
}

export function ProductForm({
  values,
  catalogs,
  equipmentTypeIds,
  action,
}: {
  values: ProductFormValues;
  catalogs: Catalogs;
  equipmentTypeIds: string[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const errors = state.errors ?? {};

  // Se sigue el tipo elegido para esconder la compatibilidad en cuanto deja de
  // aplicar, sin esperar a guardar.
  const [productTypeId, setProductTypeId] = useState(values.productTypeId ?? '');
  const isEquipment = equipmentTypeIds.includes(productTypeId);

  return (
    <form action={formAction} className="pb-24">
      {state.message && (
        <div
          role="status"
          className={`mb-6 rounded-card border px-4 py-3 text-sm ${
            state.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-ember-300 bg-ember-100 text-ember-700'
          }`}
        >
          {state.message}
        </div>
      )}

      <p className="mb-4 text-xs text-carbon-400">
        Los campos marcados con <span className="font-medium text-ember-600">*</span> son
        obligatorios para publicar. Sin ellos el producto se puede guardar como borrador, pero no
        sale a la tienda.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* --- Columna principal ------------------------------------------ */}
        <div className="space-y-6">
          <section className="rounded-card border border-carbon-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-carbon-900">Contenido</h2>
            <p className="mt-1 text-sm text-carbon-400">
              Lo que el cliente lee en la tienda. Escríbelo como se lo explicarías a alguien en
              mostrador, no con el código interno de Weber.
            </p>

            <div className="mt-5 space-y-5">
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
            </div>
          </section>

          <section className="rounded-card border border-carbon-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-carbon-900">Clasificación</h2>
            <p className="mt-1 text-sm text-carbon-400">
              Define en qué filtros y secciones aparece el producto. Si falta una opción, se agrega
              en Catálogos.
            </p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
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

            <div className="mt-6 space-y-5 border-t border-carbon-100 pt-6">
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
            </div>
          </section>

        </div>

        {/* --- Columna lateral -------------------------------------------- */}
        <div className="space-y-6">
          <section className="rounded-card border border-carbon-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
              Publicación
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-carbon-700">
                  Estado
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue={values.status}
                  className="mt-1.5 w-full rounded-md border border-carbon-200 px-3 py-2 text-sm"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.status?.map((error) => (
                  <p key={error} className="mt-1 text-xs font-medium text-ember-600">
                    {error}
                  </p>
                ))}
                <p className="mt-1.5 text-xs text-carbon-400">
                  Para publicar hacen falta todos los campos marcados con{' '}
                  <span className="font-medium text-ember-600">*</span>.
                </p>
              </div>

              <label className="flex items-start gap-2 border-t border-carbon-100 pt-4 text-sm text-carbon-700">
                <input
                  type="checkbox"
                  name="needsReview"
                  defaultChecked={values.needsReview}
                  className="mt-0.5 h-4 w-4 rounded border-carbon-300"
                />
                <span>
                  Sigue pendiente de revisión
                  <span className="mt-0.5 block text-xs text-carbon-400">
                    Desmárcalo cuando ya lo hayas limpiado.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-card border border-carbon-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
              Precio
            </h2>
            <p className="mt-1 text-xs text-carbon-400">
              Opcional por ahora. Déjalo vacío hasta que llegue la lista de precios.
            </p>

            <div className="mt-4 space-y-4">
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
            </div>
          </section>

        </div>
      </div>

      {/* Barra fija: con un formulario tan largo, un boton al final del todo
          obliga a bajar cada vez para guardar. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-carbon-200 bg-white/95 px-8 py-3 backdrop-blur">
        <div className="flex items-center justify-end gap-3">
          <a href="/productos" className="text-sm text-carbon-500 hover:text-carbon-900">
            Volver a la lista
          </a>
          <SaveButton />
        </div>
      </div>
    </form>
  );
}
