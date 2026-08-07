'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { TextField } from '@/components/fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useActionToast } from '@/hooks/use-action-toast';
import type { NewProductState } from './actions';

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? 'Creando…' : 'Crear y completar ficha'}
    </Button>
  );
}

export function NewProductForm({
  action,
}: {
  action: (prev: NewProductState, formData: FormData) => Promise<NewProductState>;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  useActionToast(state);
  const errors = state.errors ?? {};

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
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

          <div className="flex items-center gap-2 pt-1">
            <CreateButton />
            <Button asChild variant="outline" size="lg">
              <Link href="/productos">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
