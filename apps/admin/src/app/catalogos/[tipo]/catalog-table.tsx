'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useActionToast } from '@/hooks/use-action-toast';
import type { CatalogRow } from '@/lib/catalogos';
import type { CatalogState } from '../actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? 'Guardando…' : 'Guardar'}
    </Button>
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
  useActionToast(state);

  // Cerrar la fila en efecto y no durante el render: cambiar el estado del
  // padre mientras se pinta el hijo es un error en React, no solo un aviso.
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Input name="name" defaultValue={row.name} aria-label="Nombre" className="w-52 bg-card" />
      {hasHex && (
        <Input
          name="hex"
          type="color"
          defaultValue={row.hex ?? '#000000'}
          aria-label="Color"
          className="w-12 cursor-pointer bg-card p-1"
        />
      )}
      <Input
        name="position"
        type="number"
        min={0}
        defaultValue={row.position}
        aria-label="Orden"
        className="w-20 bg-card tabular-nums"
      />
      <div className="flex items-center gap-2 px-1">
        <Checkbox id={`active-${row.id}`} name="active" defaultChecked={row.active} />
        <Label htmlFor={`active-${row.id}`} className="font-normal text-muted-foreground">
          Visible
        </Label>
      </div>
      <SaveButton />
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Cancelar
      </Button>
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
    <Card className="gap-0 py-0">
      <Table className="min-w-[40rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="px-4 text-muted-foreground">Nombre</TableHead>
            <TableHead className="w-24 px-4 text-right text-muted-foreground">Orden</TableHead>
            <TableHead className="w-32 px-4 text-right text-muted-foreground">Productos</TableHead>
            <TableHead className="w-28 px-4 text-muted-foreground">Estado</TableHead>
            <TableHead className="w-44 px-4 text-muted-foreground">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="px-4 py-14 text-center text-muted-foreground">
                Todavía no hay ninguna opción. Agrega la primera abajo.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) =>
            editing === row.id ? (
              <TableRow key={row.id} className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={5} className="px-4 py-3 whitespace-normal">
                  <EditRow
                    row={row}
                    hasHex={hasHex}
                    action={updateAction}
                    onDone={() => setEditing(null)}
                  />
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-3">
                  <span className="flex items-center gap-2 font-medium">
                    {hasHex && (
                      // Halo claro alrededor de la muestra: la mitad del
                      // catalogo son negros y grises, y sobre el fondo oscuro
                      // se confundian con la fila.
                      <span
                        className="size-4 shrink-0 rounded-full ring-2 ring-photo outline outline-foreground/20"
                        style={{ backgroundColor: row.hex ?? 'transparent' }}
                      />
                    )}
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                  {row.position}
                </TableCell>
                <TableCell className="px-4 text-right text-muted-foreground tabular-nums">
                  {row.usage}
                </TableCell>
                <TableCell className="px-4">
                  <Badge variant={row.active ? 'success' : 'secondary'}>
                    {row.active ? 'Visible' : 'Oculta'}
                  </Badge>
                </TableCell>
                <TableCell className="px-4">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(row.id)}
                    >
                      <Pencil data-icon="inline-start" />
                      Editar
                    </Button>
                    {row.usage === 0 ? (
                      <form action={deleteAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${row.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </form>
                    ) : (
                      // Borrar dejaria a esos productos sin este dato. Se
                      // explica en vez de dejar un boton que falla en silencio.
                      <span
                        title={`Lo usan ${row.usage} productos. Ocúltalo con "Editar" si ya no debe aparecer en los menús.`}
                        className="cursor-help px-2 text-xs text-muted-foreground"
                      >
                        En uso
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>

      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Un {singular} en uso no se puede eliminar: los productos que lo tienen se quedarían sin ese
        dato. Ocúltalo en su lugar y dejará de aparecer en los menús sin afectar lo ya capturado.
      </p>
    </Card>
  );
}
