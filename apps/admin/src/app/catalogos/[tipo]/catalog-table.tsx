'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TextField } from '@/components/fields';
import { ConfirmDialog, FormDialog, useDialogErrors } from '@/components/form-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CatalogRow } from '@/lib/catalogos';
import type { CatalogState } from '../actions';

type CreateAction = (prev: CatalogState, formData: FormData) => Promise<CatalogState>;
type UpdateAction = (id: string, prev: CatalogState, formData: FormData) => Promise<CatalogState>;
type DeleteAction = (prev: CatalogState, formData: FormData) => Promise<CatalogState>;

/// Los campos de una opcion de catalogo. Los comparten crear y editar.
///
/// Son cuatro y siempre los mismos: lo unico que cambia entre los seis
/// catalogos es si llevan muestra de color.
function CatalogFields({ row, hasHex }: { row?: CatalogRow; hasHex: boolean }) {
  const errors = useDialogErrors();

  return (
    <>
      <TextField
        name="name"
        label="Nombre"
        required
        defaultValue={row?.name}
        errors={errors.name}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="position"
          label="Orden en el menú"
          type="number"
          defaultValue={String(row?.position ?? 0)}
          errors={errors.position}
          hint="Menor número, más arriba."
        />

        {hasHex && (
          <div className="space-y-1.5">
            <Label htmlFor="hex">Color</Label>
            <p className="text-muted-foreground text-xs">La muestra que se ve en la tienda.</p>
            <Input
              id="hex"
              name="hex"
              type="color"
              defaultValue={row?.hex ?? '#000000'}
              className="bg-card h-9 w-full cursor-pointer p-1"
            />
          </div>
        )}
      </div>

      {/* Solo al editar: una opcion recien creada nace visible, y ofrecer
          crearla oculta es una decision que nadie necesita tomar ahi. */}
      {row && (
        <div className="flex items-center gap-2">
          <Checkbox id="active" name="active" defaultChecked={row.active} />
          <Label htmlFor="active" className="text-muted-foreground font-normal">
            Visible en los menús de la ficha de producto
          </Label>
        </div>
      )}
    </>
  );
}

export function NewCatalogItemDialog({
  singular,
  hasHex,
  action,
}: {
  singular: string;
  hasHex: boolean;
  action: CreateAction;
}) {
  return (
    <FormDialog
      trigger={
        <Button size="lg">
          <Plus data-icon="inline-start" />
          Agregar {singular}
        </Button>
      }
      title={`Nuevo ${singular}`}
      description="Aparecerá de inmediato en los menús de la ficha de producto."
      action={action}
      submitLabel="Agregar"
    >
      <CatalogFields hasHex={hasHex} />
    </FormDialog>
  );
}

function EditCatalogItemDialog({
  row,
  hasHex,
  singular,
  action,
}: {
  row: CatalogRow;
  hasHex: boolean;
  singular: string;
  action: UpdateAction;
}) {
  return (
    <FormDialog
      trigger={
        <Button type="button" variant="ghost" size="sm">
          <Pencil data-icon="inline-start" />
          Editar
        </Button>
      }
      title={row.name}
      description={
        row.usage > 0
          ? `Lo usan ${row.usage} productos. Cambiar el nombre no los afecta.`
          : `Este ${singular} todavía no lo usa ningún producto.`
      }
      action={action.bind(null, row.id)}
      submitLabel="Guardar cambios"
    >
      <CatalogFields row={row} hasHex={hasHex} />
    </FormDialog>
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
  updateAction: UpdateAction;
  deleteAction: DeleteAction;
}) {
  return (
    <Card className="gap-0 py-0">
      <Table className="min-w-[40rem]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground px-4">Nombre</TableHead>
            <TableHead className="text-muted-foreground w-24 px-4 text-right">Orden</TableHead>
            <TableHead className="text-muted-foreground w-32 px-4 text-right">Productos</TableHead>
            <TableHead className="text-muted-foreground w-28 px-4">Estado</TableHead>
            <TableHead className="text-muted-foreground w-44 px-4">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={5} className="text-muted-foreground px-4 py-14 text-center">
                Todavía no hay ninguna opción. Agrega la primera con el botón de arriba.
              </TableCell>
            </TableRow>
          )}

          {rows.map((row) => (
            // Ver el comentario de la tabla de productos: celdas arriba y con
            // el mismo relleno para que la primera linea de cada columna caiga
            // en el mismo renglon.
            <TableRow key={row.id} className="[&>td]:align-top [&>td:not(:last-child)]:py-3">
              <TableCell className="px-4">
                <span className="flex items-center gap-2 font-medium">
                  {hasHex && (
                    // Halo claro alrededor de la muestra: la mitad del catalogo
                    // son negros y grises, y sobre el fondo oscuro se
                    // confundian con la fila.
                    <span
                      className="ring-photo outline-foreground/20 size-4 shrink-0 rounded-full ring-2 outline"
                      style={{ backgroundColor: row.hex ?? 'transparent' }}
                    />
                  )}
                  {row.name}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground px-4 text-right tabular-nums">
                {row.position}
              </TableCell>
              <TableCell className="text-muted-foreground px-4 text-right tabular-nums">
                {row.usage}
              </TableCell>
              <TableCell className="px-4">
                <Badge variant={row.active ? 'success' : 'secondary'}>
                  {row.active ? 'Visible' : 'Oculta'}
                </Badge>
              </TableCell>
              {/* Menos relleno que el resto: los botones son mas altos que una
                  linea de texto, y con el mismo py su etiqueta caia por debajo
                  del renglon de las demas columnas. La fila excluye esta celda
                  de su regla de relleno para no pisar este py. */}
              <TableCell className="px-4 py-2">
                <div className="flex items-center gap-1">
                  <EditCatalogItemDialog
                    row={row}
                    hasHex={hasHex}
                    singular={singular}
                    action={updateAction}
                  />

                  {row.usage === 0 ? (
                    <ConfirmDialog
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${row.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      }
                      title={`¿Eliminar "${row.name}"?`}
                      description={`Ningún producto usa este ${singular}, así que se puede quitar sin consecuencias. No hay forma de recuperarlo.`}
                      action={deleteAction}
                      hidden={{ id: row.id }}
                    />
                  ) : (
                    // Borrar dejaria a esos productos sin este dato. Se explica
                    // en vez de dejar un boton que falla en silencio.
                    <span
                      title={`Lo usan ${row.usage} productos. Ocúltalo con "Editar" si ya no debe aparecer en los menús.`}
                      className="text-muted-foreground cursor-help px-2 text-xs"
                    >
                      En uso
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="border-border text-muted-foreground border-t px-4 py-3 text-xs">
        Un {singular} en uso no se puede eliminar: los productos que lo tienen se quedarían sin ese
        dato. Ocúltalo en su lugar y dejará de aparecer en los menús sin afectar lo ya capturado.
      </p>
    </Card>
  );
}
