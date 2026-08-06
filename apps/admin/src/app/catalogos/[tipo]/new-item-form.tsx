'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import type { CatalogState } from '../actions';

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-carbon-900 px-4 py-2 text-sm font-medium text-white hover:bg-carbon-700 disabled:opacity-50"
    >
      {pending ? 'Agregando…' : 'Agregar'}
    </button>
  );
}

export function NewItemForm({
  hasHex,
  singular,
  action,
}: {
  hasHex: boolean;
  singular: string;
  action: (prev: CatalogState, formData: FormData) => Promise<CatalogState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  const formRef = useRef<HTMLFormElement>(null);

  // Limpiar tras agregar deja el formulario listo para el siguiente. Al dar de
  // alta varias opciones seguidas, tener que borrar a mano lo anterior es lo
  // que provoca duplicados.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <section className="rounded-card border border-carbon-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-carbon-400">
        Agregar {singular}
      </h2>

      <form ref={formRef} action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block font-medium text-carbon-700">Nombre</span>
          <input
            name="name"
            required
            maxLength={80}
            placeholder={`Nombre del ${singular}`}
            className="mt-1 w-56 rounded-md border border-carbon-200 px-3 py-2 text-sm"
          />
        </label>

        {hasHex && (
          <label className="text-sm">
            <span className="block font-medium text-carbon-700">Color</span>
            <input
              name="hex"
              type="color"
              defaultValue="#1A1A1A"
              className="mt-1 h-10 w-16 rounded-md border border-carbon-200"
            />
          </label>
        )}

        <label className="text-sm">
          <span className="block font-medium text-carbon-700">Orden</span>
          <input
            name="position"
            type="number"
            min={0}
            defaultValue={0}
            className="mt-1 w-24 rounded-md border border-carbon-200 px-3 py-2 text-sm"
          />
        </label>

        <AddButton />
      </form>

      {state.message && (
        <p
          role="status"
          className={`mt-3 text-sm ${state.ok ? 'text-green-700' : 'font-medium text-ember-600'}`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
