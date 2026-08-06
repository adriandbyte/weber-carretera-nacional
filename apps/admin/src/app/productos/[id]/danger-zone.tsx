'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
      <p className="mt-8 text-xs text-muted-foreground">
        Este producto ya estuvo publicado, así que no se puede eliminar. Cámbialo a Archivado si ya
        no debe aparecer en la tienda.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="mt-8 text-muted-foreground hover:text-destructive"
      >
        <Trash2 data-icon="inline-start" />
        Eliminar este producto
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm"
    >
      <p className="font-medium text-destructive">Eliminar definitivamente</p>
      <p className="mt-1 text-muted-foreground">
        Se borran también sus imágenes y no hay forma de recuperarlo. Escribe el SKU{' '}
        <strong className="font-mono text-xs text-foreground">{sku}</strong> para confirmar.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          name="sku"
          required
          autoComplete="off"
          placeholder={sku}
          aria-label="SKU de confirmación"
          className="w-40 bg-card font-mono text-xs"
        />
        <Button type="submit" variant="destructive">
          Eliminar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
