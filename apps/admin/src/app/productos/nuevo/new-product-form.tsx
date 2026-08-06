'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { TextField } from '@/components/fields';
import type { NewProductState } from './actions';

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-carbon-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-carbon-700 disabled:opacity-50"
    >
      {pending ? 'Creando…' : 'Crear y completar ficha'}
    </button>
  );
}

export function NewProductForm({
  action,
}: {
  action: (prev: NewProductState, formData: FormData) => Promise<NewProductState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="rounded-card border border-carbon-200 bg-white p-6">
      {state.message && (
        <p
          role="status"
          className="mb-5 rounded-md border border-ember-300 bg-ember-100 px-3 py-2 text-sm text-ember-700"
        >
          {state.message}
        </p>
      )}

      <div className="space-y-5">
        <TextField
          name="sku"
          label="SKU"
          required
          errors={errors.sku}
          placeholder="1500010"
          hint="La clave de Weber. Es con la que se cruzan las listas de precios, así que tiene que ser exacta."
        />
        <TextField
          name="name"
          label="Nombre"
          required
          errors={errors.name}
          hint="Ejemplo: Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro"
        />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <CreateButton />
        <a href="/productos" className="text-sm text-carbon-500 hover:text-carbon-900">
          Cancelar
        </a>
      </div>
    </form>
  );
}
