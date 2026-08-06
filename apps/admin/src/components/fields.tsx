'use client';

/// Campos de formulario. Existen para que el error de validacion aparezca
/// siempre pegado a su input y con el mismo aspecto en todas las pantallas:
/// cuando cada formulario resuelve eso por su cuenta, tarde o temprano alguno
/// se traga el error y el usuario cree que guardo.

interface BaseProps {
  name: string;
  label: string;
  hint?: string;
  errors?: string[];
  required?: boolean;
}

function Wrapper({
  name,
  label,
  hint,
  errors,
  required,
  children,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-carbon-700">
        {label}
        {required && <span className="ml-0.5 text-ember-600">*</span>}
      </label>
      {hint && <p className="mt-0.5 text-xs text-carbon-400">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {errors?.map((error) => (
        <p key={error} className="mt-1 text-xs font-medium text-ember-600">
          {error}
        </p>
      ))}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-md border px-3 py-2 text-sm text-carbon-900 outline-none transition focus:ring-2 ${
    hasError
      ? 'border-ember-500 focus:ring-ember-100'
      : 'border-carbon-200 focus:border-carbon-400 focus:ring-carbon-100'
  }`;

export function TextField({
  defaultValue,
  placeholder,
  type = 'text',
  ...props
}: BaseProps & { defaultValue?: string | null; placeholder?: string; type?: string }) {
  return (
    <Wrapper {...props}>
      <input
        id={props.name}
        name={props.name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className={inputClass(Boolean(props.errors?.length))}
      />
    </Wrapper>
  );
}

export function TextArea({
  defaultValue,
  rows = 4,
  placeholder,
  ...props
}: BaseProps & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  return (
    <Wrapper {...props}>
      <textarea
        id={props.name}
        name={props.name}
        rows={rows}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className={inputClass(Boolean(props.errors?.length))}
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
  const controlled = value !== undefined;
  return (
    <Wrapper {...props}>
      <select
        id={props.name}
        name={props.name}
        {...(controlled
          ? { value, onChange: (event) => onChange?.(event.target.value) }
          : { defaultValue: defaultValue ?? '' })}
        className={inputClass(Boolean(props.errors?.length))}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
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
  return (
    <Wrapper {...props}>
      <div
        className={`grid gap-x-4 gap-y-2 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        {options.map((option) => (
          <label key={option.id} className="flex items-center gap-2 text-sm text-carbon-700">
            <input
              type="checkbox"
              name={props.name}
              value={option.id}
              defaultChecked={selected.includes(option.id)}
              className="h-4 w-4 rounded border-carbon-300 text-carbon-900"
            />
            {option.name}
          </label>
        ))}
      </div>
    </Wrapper>
  );
}
