'use client';

import { useState } from 'react';

/// Baja definitiva de un producto.
///
/// Va escondida detras de un enlace y pide teclear el SKU. No es para hacer
/// dificil el borrado por gusto: en una pantalla que alguien recorre 331 veces,
/// un boton rojo permanente termina pulsado por accidente tarde o temprano.
export function DangerZone({
  sku,
  canDelete,
  action,
}: {
  sku: string;
  canDelete: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!canDelete) {
    return (
      <p className="mt-8 text-xs text-carbon-300">
        Este producto ya estuvo publicado, así que no se puede eliminar. Cámbialo a Archivado si ya
        no debe aparecer en la tienda.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 text-xs text-carbon-300 underline hover:text-ember-600"
      >
        Eliminar este producto
      </button>
    );
  }

  return (
    <form
      action={action}
      className="mt-8 rounded-card border border-ember-300 bg-ember-100 p-5 text-sm text-ember-700"
    >
      <p className="font-semibold">Eliminar definitivamente</p>
      <p className="mt-1">
        Se borran también sus imágenes y no hay forma de recuperarlo. Escribe el SKU{' '}
        <strong>{sku}</strong> para confirmar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="sku"
          required
          autoComplete="off"
          placeholder={sku}
          className="w-40 rounded-md border border-ember-300 px-3 py-2 text-sm text-carbon-900"
        />
        <button
          type="submit"
          className="rounded-md bg-ember-600 px-4 py-2 text-sm font-medium text-white hover:bg-ember-700"
        >
          Eliminar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm underline"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
