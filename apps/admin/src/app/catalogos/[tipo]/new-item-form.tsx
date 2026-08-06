'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionToast } from '@/hooks/use-action-toast';
import type { CatalogState } from '../actions';

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Plus data-icon="inline-start" />}
      {pending ? 'Agregando…' : 'Agregar'}
    </Button>
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
  useActionToast(state);
  const formRef = useRef<HTMLFormElement>(null);

  // Limpiar tras agregar deja el formulario listo para el siguiente. Al dar de
  // alta varias opciones seguidas, tener que borrar a mano lo anterior es lo
  // que provoca duplicados.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Agregar {singular}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Nombre</Label>
            <Input
              id="new-name"
              name="name"
              required
              maxLength={80}
              placeholder={`Nombre del ${singular}`}
              className="w-56"
            />
          </div>

          {hasHex && (
            <div className="space-y-1.5">
              <Label htmlFor="new-hex">Color</Label>
              <Input
                id="new-hex"
                name="hex"
                type="color"
                defaultValue="#1A1A1A"
                className="w-16 cursor-pointer p-1"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-position">Orden</Label>
            <Input
              id="new-position"
              name="position"
              type="number"
              min={0}
              defaultValue={0}
              className="w-24 tabular-nums"
            />
          </div>

          <AddButton />
        </form>
      </CardContent>
    </Card>
  );
}
