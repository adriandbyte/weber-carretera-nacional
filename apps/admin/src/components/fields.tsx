'use client';

/// Campos de formulario. Existen para que el error de validacion aparezca
/// siempre pegado a su input y con el mismo aspecto en todas las pantallas:
/// cuando cada formulario resuelve eso por su cuenta, tarde o temprano alguno
/// se traga el error y el usuario cree que guardo.

import { useId } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

interface BaseProps {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
}

function Wrapper({
  name,
  controlId,
  label,
  hint,
  errors,
  required,
  group = false,
  children,
}: BaseProps & {
  /// El id real del control que hay debajo. No es el `name`: dos formularios en
  /// la misma pagina pueden tener los dos un campo "name", y con el nombre como
  /// id las dos etiquetas apuntarian al primer input. Pasaba en Categorias:
  /// pulsar "Nombre" en el alta enfocaba el nombre de la fila que se editaba
  /// arriba, y los lectores de pantalla leian el campo dos veces.
  controlId?: string;
  /// Cierto cuando debajo hay varios controles y no uno solo. En ese caso el
  /// titulo no puede ser un <label for>: apuntaria a un id que no existe (el
  /// nombre del grupo no es el de ningun elemento) y el navegador lo reporta
  /// como etiqueta rota. Pasa a ser el nombre accesible del conjunto.
  group?: boolean;
  children: React.ReactNode;
}) {
  const titleId = `${controlId ?? name}-label`;
  const title = (
    <>
      {label}
      {required && (
        <span className="text-primary" aria-hidden>
          *
        </span>
      )}
    </>
  );

  return (
    <div className="space-y-1.5">
      {group ? (
        <p id={titleId} className="flex items-center gap-0.5 text-sm leading-none font-medium">
          {title}
        </p>
      ) : (
        <Label htmlFor={controlId ?? name} className="gap-0.5">
          {title}
        </Label>
      )}

      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}

      {group ? (
        <div role="group" aria-labelledby={titleId}>
          {children}
        </div>
      ) : (
        children
      )}

      {errors?.map((error) => (
        <p key={error} className="text-destructive text-xs font-medium">
          {error}
        </p>
      ))}
    </div>
  );
}

/// aria-invalid es lo que pinta el borde rojo en los primitivos de shadcn, y
/// de paso es lo que anuncia el error a un lector de pantalla. Un solo dato
/// para las dos cosas, asi que no pueden desincronizarse.
const invalid = (errors?: string[]) => (errors?.length ? true : undefined);

export function TextField({
  defaultValue,
  placeholder,
  type = 'text',
  onValueChange,
  after,
  ...props
}: BaseProps & {
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
  /// Solo para los campos de los que depende algo que se ve al lado mientras
  /// se escribe. El campo sigue siendo no controlado: esto avisa, no manda.
  onValueChange?: (value: string) => void;
  /// Va debajo del input y encima de los errores. Para lo que acompaña al
  /// campo sin ser una pista: por ejemplo la direccion que va a tener el
  /// producto en la tienda.
  after?: React.ReactNode;
}) {
  const controlId = useId();
  return (
    <Wrapper {...props} controlId={controlId}>
      <>
        <Input
          id={controlId}
          name={props.name}
          type={type}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          onChange={onValueChange && ((event) => onValueChange(event.target.value))}
          aria-invalid={invalid(props.errors)}
          // Nada de aqui es un dato de la persona que captura: son campos del
          // producto. Sin esto el navegador ofrece su propio historial encima
          // del campo, que aqui solo estorba.
          autoComplete="off"
        />
        {after}
      </>
    </Wrapper>
  );
}

export function TextArea({
  defaultValue,
  rows = 4,
  placeholder,
  ...props
}: BaseProps & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  const controlId = useId();
  return (
    <Wrapper {...props} controlId={controlId}>
      <Textarea
        id={controlId}
        name={props.name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        aria-invalid={invalid(props.errors)}
        autoComplete="off"
        // El Textarea de shadcn viene con field-sizing-content, que ajusta la
        // altura al contenido e ignora `rows`. En un campo vacio eso deja una
        // caja de dos lineas donde se espera media pagina de texto, y el
        // tamaño del hueco es justo lo que dice cuanto hay que escribir.
        className="field-sizing-fixed"
      />
    </Wrapper>
  );
}

export interface Option {
  id: string;
  name: string;
}

/// Acepta las dos formas: sin control (defaultValue) para la mayoria, y
/// controlado (value + onChange) cuando otra parte del formulario reacciona
/// a lo que se elige aqui.
export function SelectField({
  options,
  defaultValue,
  value,
  onChange,
  emptyLabel = 'Sin especificar',
  ...props
}: BaseProps & {
  options: Option[];
  defaultValue?: string | null;
  value?: string;
  onChange?: (value: string) => void;
  emptyLabel?: string;
}) {
  const controlId = useId();
  const controlled = value !== undefined;
  return (
    <Wrapper {...props} controlId={controlId}>
      <NativeSelect
        id={controlId}
        name={props.name}
        aria-invalid={invalid(props.errors)}
        {...(controlled
          ? { value, onChange: (event) => onChange?.(event.target.value) }
          : { defaultValue: defaultValue ?? '' })}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </NativeSelect>
    </Wrapper>
  );
}

/// Seleccion multiple con casillas en vez de un <select multiple>, que en la
/// practica nadie sabe usar (hay que dejar Ctrl presionado).
export function CheckboxGroup({
  options,
  selected,
  columns = 2,
  ...props
}: BaseProps & { options: Option[]; selected: string[]; columns?: number }) {
  // Los ids tienen que ser unicos en toda la pagina: "Categorias del menu" y
  // "Compatible con" comparten opciones, y con ids repetidos hacer clic en una
  // etiqueta marcaria la casilla del otro grupo.
  const groupId = useId();

  return (
    <Wrapper {...props} group>
      <div
        className={`grid gap-x-4 gap-y-2.5 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {options.map((option) => {
          const id = `${groupId}-${option.id}`;
          return (
            <div key={option.id} className="flex items-center gap-2">
              <Checkbox
                id={id}
                name={props.name}
                value={option.id}
                defaultChecked={selected.includes(option.id)}
              />
              <Label htmlFor={id} className="text-muted-foreground font-normal">
                {option.name}
              </Label>
            </div>
          );
        })}
      </div>
    </Wrapper>
  );
}

/// Una sola casilla con su explicacion debajo.
export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox id={name} name={name} defaultChecked={defaultChecked} className="mt-0.5" />
      <div className="space-y-0.5">
        <Label htmlFor={name}>{label}</Label>
        {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      </div>
    </div>
  );
}
