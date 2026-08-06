'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { CatalogRow } from '@/lib/catalogos';
import type { CatalogState } from '../actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-carbon-900 px-3 py-1.5 text-sm text-white hover:bg-carbon-700 disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Guardar'}
    </button>
  );
}

function EditRow({
  row,
  hasHex,
  action,
  onDone,
}: {
  row: CatalogRow;
  hasHex: boolean;
  action: (id: string, prev: CatalogState, formData: FormData) => Promise<CatalogState>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action.bind(null, row.id), { ok: false });

  // Cerrar la fila en efecto y no durante el render: cambiar el estado del
  // padre mientras se pinta el hijo es un error en React, no solo un aviso.
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        defaultValue={row.name}
        aria-label="Nombre"
        className="w-52 rounded-md border border-carbon-300 px-2 py-1.5 text-sm"
      />
      {hasHex && (
        <input
          name="hex"
          type="color"
          defaultValue={row.hex ?? '#000000'}
          aria-label="Color"
          className="h-9 w-12 rounded-md border border-carbon-300"
        />
      )}
      <input
        name="position"
        type="number"
        min={0}
        defaultValue={row.position}
        aria-label="Orden"
        className="w-20 rounded-md border border-carbon-300 px-2 py-1.5 text-sm"
      />
      <label className="flex items-center gap-1.5 text-sm text-carbon-600">
        <input type="checkbox" name="active" defaultChecked={row.active} className="h-4 w-4" />
        Visible
      </label>
      <SaveButton />
      <button type="button" onClick={onDone} className="text-sm text-carbon-500 underline">
        Cancelar
      </button>
      {state.message && !state.ok && (
        <p className="w-full text-xs font-medium text-ember-600">{state.message}</p>
      )}
    </form>
  );
}

export function CatalogTable({
  rows,
  hasHex,
  singular,
  updateAction,
  deleteAction,
}: {
  rows: CatalogRow[];
  hasHex: boolean;
  singular: string;
  updateAction: (id: string, prev: CatalogState, formData: FormData) => Promise<CatalogState>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-card border border-carbon-200 bg-white">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="border-b border-carbon-200 text-left text-carbon-400">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="w-24 px-4 py-3 text-right font-medium">Orden</th>
            <th className="w-32 px-4 py-3 text-right font-medium">Productos</th>
            <th className="w-28 px-4 py-3 font-medium">Estado</th>
            <th className="w-40 px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-carbon-400">
                Todavía no hay ninguna opción. Agrega la primera abajo.
              </td>
            </tr>
          )}
          {rows.map((row) =>
            editing === row.id ? (
              <tr key={row.id} className="border-b border-carbon-100 bg-steel-100 last:border-0">
                <td colSpan={5} className="px-4 py-3">
                  <EditRow
                    row={row}
                    hasHex={hasHex}
                    action={updateAction}
                    onDone={() => setEditing(null)}
                  />
                </td>
              </tr>
            ) : (
              <tr key={row.id} className="border-b border-carbon-100 last:border-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium text-carbon-900">
                    {hasHex && (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-carbon-200"
                        style={{ backgroundColor: row.hex ?? 'transparent' }}
                      />
                    )}
                    {row.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-carbon-500">{row.position}</td>
                <td className="px-4 py-3 text-right tabular-nums text-carbon-500">{row.usage}</td>
                <td className="px-4 py-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${
                      row.active ? 'bg-green-100 text-green-800' : 'bg-carbon-100 text-carbon-500'
                    }`}
                  >
                    {row.active ? 'Visible' : 'Oculta'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditing(row.id)}
                      className="text-carbon-600 underline hover:text-carbon-900"
                    >
                      Editar
                    </button>
                    {row.usage === 0 ? (
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="text-ember-600 underline hover:text-ember-700"
                        >
                          Eliminar
                        </button>
                      </form>
                    ) : (
                      // Borrar dejaria a esos productos sin este dato. Se
                      // explica en vez de dejar un boton que falla en silencio.
                      <span
                        title={`Lo usan ${row.usage} productos. Ocúltalo con "Editar" si ya no debe aparecer en los menús.`}
                        className="cursor-help text-carbon-300"
                      >
                        En uso
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      <p className="border-t border-carbon-100 px-4 py-3 text-xs text-carbon-400">
        Un {singular} en uso no se puede eliminar: los productos que lo tienen se quedarían sin ese
        dato. Ocúltalo en su lugar y dejará de aparecer en los menús sin afectar lo ya capturado.
      </p>
    </div>
  );
}
