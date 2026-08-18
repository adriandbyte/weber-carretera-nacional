'use client';

// ---------------------------------------------------------------------------
// Un formulario dentro de una ventana, con el guardado ya resuelto.
//
// Existe porque editar dentro de la propia tabla no funcionaba: la fila se
// abria y los campos quedaban entre celdas, sin borde propio y con el resto de
// la tabla alrededor, asi que no se distinguia que era formulario y que era
// dato. En una ventana el formulario tiene principio y final.
//
// Cada pantalla pone sus campos; esto pone lo que se repetia en todas: abrir y
// cerrar, la accion de servidor, el aviso al terminar y el par de botones.
//
// Los errores del servidor viajan por contexto y no como argumento de una
// funcion hija: un `children` que es funcion no cruza la frontera de servidor a
// cliente, y Next lo reporta. Asi los campos los piden donde hagan falta.
// ---------------------------------------------------------------------------

import { createContext, useActionState, useContext, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useActionToast } from '@/hooks/use-action-toast';

/// Lo minimo que esta ventana necesita saber de una accion de servidor.
export interface DialogFormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export type DialogAction = (prev: DialogFormState, formData: FormData) => Promise<DialogFormState>;

const ErrorsContext = createContext<Record<string, string[] | undefined>>({});

/// Los errores por campo del ultimo intento. Vacio mientras no se haya enviado.
export function useDialogErrors() {
  return useContext(ErrorsContext);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? 'Guardando…' : label}
    </Button>
  );
}

/// El formulario en si. Va en su propio componente para que se monte de cero
/// cada vez que se abre la ventana: asi los errores del intento anterior no
/// reaparecen al volver a entrar.
function DialogForm({
  action,
  submitLabel,
  onDone,
  children,
}: {
  action: DialogAction;
  submitLabel: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  useActionToast(state);

  // Cerrar en efecto y no durante el render: cambiar el estado del padre
  // mientras se pinta el hijo es un error en React, no solo un aviso.
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="contents">
      {/* Scroll propio con tope de altura: la ficha de una categoria no cabe
          entera en la pantalla de un portatil, y sin esto los botones quedaban
          fuera de vista con la pagina de fondo desplazandose en su lugar. */}
      <div className="max-h-[65vh] space-y-5 overflow-y-auto px-1 py-1">
        <ErrorsContext.Provider value={state.errors ?? {}}>{children}</ErrorsContext.Provider>
      </div>

      <DialogFooter>
        {/* `outline` y no `ghost`: en modo oscuro un boton sin fondo ni borde es
            solo texto flotando, y cancelar deja de parecer un boton. */}
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton label={submitLabel} />
      </DialogFooter>
    </form>
  );
}

export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel = 'Guardar',
  wide = false,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: DialogAction;
  submitLabel?: string;
  /// Para formularios de dos columnas, como el de categorias.
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className={wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            // Radix avisa por consola si falta la descripcion. Cuando no hay
            // nada util que decir se repite el titulo para lectores de
            // pantalla, en vez de inventar una linea de relleno.
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>

        {/* Solo se monta con la ventana abierta: es lo que reinicia los campos
            y descarta los errores del intento anterior. */}
        {open && (
          <DialogForm action={action} submitLabel={submitLabel} onDone={() => setOpen(false)}>
            {children}
          </DialogForm>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {pending ? 'Eliminando…' : label}
    </Button>
  );
}

function ConfirmForm({
  action,
  confirmLabel,
  hidden,
  onDone,
}: {
  action: DialogAction;
  confirmLabel: string;
  hidden: Record<string, string>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, { ok: false });
  useActionToast(state);

  // Tambien se cierra cuando la accion se niega: el motivo ya salio en el
  // aviso, y dejar la ventana abierta invita a pulsar otra vez lo mismo.
  useEffect(() => {
    if (state.ok || state.message) onDone();
  }, [state.ok, state.message, onDone]);

  return (
    <form action={formAction} className="contents">
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <DeleteButton label={confirmLabel} />
      </DialogFooter>
    </form>
  );
}

/// Confirmacion de borrado.
///
/// Comparte ventana con el resto para que borrar no se sienta distinto de
/// editar, pero el boton es destructivo y el texto dice que se pierde.
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = 'Eliminar',
  action,
  hidden,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  action: DialogAction;
  /// Campos ocultos que la accion necesita, normalmente el id.
  hidden: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {open && (
          <ConfirmForm
            action={action}
            confirmLabel={confirmLabel}
            hidden={hidden}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
