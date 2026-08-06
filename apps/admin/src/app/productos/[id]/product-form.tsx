'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckboxGroup, SelectField, TextArea, TextField, type Option } from '@/components/fields';
import type { FormState } from './actions';

interface Catalogs {
  brands: Option[];
  productTypes: Option[];
  fuelTypes: Option[];
  series: Option[];
  formats: Option[];
  colors: Option[];
  sizes: Option[];
  categories: Option[];
}

export interface ProductFormValues {
  sku: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  status: string;
  price: string | null;
  compareAtPrice: string | null;
  stock: number;
  brandId: string | null;
  productTypeId: string | null;
  fuelTypeId: string | null;
  seriesId: string | null;
  formatId: string | null;
  colorId: string | null;
  sizeId: string | null;
  categoryIds: string[];
  compatibleSeriesIds: string[];
  metaTitle: string | null;
  metaDescription: string | null;
  needsReview: boolean;
  reviewNote: string | null;
  rawCategory: string | null;
  rawSubcategory: string | null;
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
  action,
}: {
  values: ProductFormValues;
  catalogs: Catalogs;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const errors = state.errors ?? {};

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
              <TextField
                name="slug"
                label="URL"
                required
                defaultValue={values.slug}
                errors={errors.slug}
                hint="Aparece en la dirección del producto. Si ya está publicado, cambiarla rompe los enlaces existentes."
              />
              <TextArea
                name="shortDescription"
                label="Descripción corta"
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
                options={catalogs.productTypes}
                defaultValue={values.productTypeId}
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
              <SelectField
                name="brandId"
                label="Marca"
                options={catalogs.brands}
                defaultValue={values.brandId}
                errors={errors.brandId}
              />
            </div>

            <div className="mt-6 space-y-5 border-t border-carbon-100 pt-6">
              <CheckboxGroup
                name="categoryIds"
                label="Categorías del menú"
                options={catalogs.categories}
                selected={values.categoryIds}
                errors={errors.categoryIds}
                columns={3}
                hint="La primera que marques manda para la dirección del producto."
              />
              <CheckboxGroup
                name="compatibleSeriesIds"
                label="Compatible con"
                options={catalogs.series}
                selected={values.compatibleSeriesIds}
                errors={errors.compatibleSeriesIds}
                columns={3}
                hint="Solo para accesorios: con qué asadores sirve."
              />
            </div>
          </section>

          <section className="rounded-card border border-carbon-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-carbon-900">
              Buscadores (SEO)
            </h2>
            <p className="mt-1 text-sm text-carbon-400">
              Lo que aparece como título y resumen en los resultados de Google. Si lo dejas vacío se
              usa el nombre del producto.
            </p>

            <div className="mt-5 space-y-5">
              <TextField
                name="metaTitle"
                label="Título para buscadores"
                defaultValue={values.metaTitle}
                errors={errors.metaTitle}
                hint="Máximo 70 caracteres. Incluye lo que la gente busca: tipo, marca, modelo."
              />
              <TextArea
                name="metaDescription"
                label="Resumen para buscadores"
                rows={3}
                defaultValue={values.metaDescription}
                errors={errors.metaDescription}
                hint="Máximo 160 caracteres."
              />
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
                  Para publicar hace falta descripción e imagen.
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
              <TextField
                name="stock"
                label="Existencias"
                type="number"
                defaultValue={String(values.stock)}
                errors={errors.stock}
              />
            </div>
          </section>

          <section className="rounded-card border border-carbon-200 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
              Datos del Excel
            </h2>
            <p className="mt-1 text-xs text-carbon-400">
              Como venía el producto en el archivo original. Solo de consulta.
            </p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-carbon-400">SKU</dt>
                <dd className="font-medium text-carbon-700">{values.sku}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-carbon-400">Categoría</dt>
                <dd className="text-right text-carbon-700">{values.rawCategory ?? '-'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-carbon-400">Subcategoría</dt>
                <dd className="text-right text-carbon-700">{values.rawSubcategory ?? '-'}</dd>
              </div>
            </dl>
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
