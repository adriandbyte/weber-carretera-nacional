import type { PendingItem } from '@weber/core';

/// Lo que le falta a este producto, en lenguaje de quien lo va a resolver.
///
/// Sustituye a la nota que dejaba el importador. Aquella decia "Nombre en
/// mayusculas, falta redaccion comercial": describia el sintoma, en el momento
/// de importar y con las palabras de quien escribio el importador. Alguien que
/// abre la ficha y ve el nombre lleno no entiende que se espera de el.
///
/// Esta lista se calcula sobre el estado actual, dice que hacer, y cada punto
/// desaparece al guardarlo resuelto.
export function PendingList({ items }: { items: PendingItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <span className="font-semibold">Este producto está completo.</span> Si ya lo revisaste,
        desmarca abajo &ldquo;Sigue pendiente de revisión&rdquo; y guarda.
      </p>
    );
  }

  return (
    <section className="rounded-card border border-ember-300 bg-ember-100 p-5">
      <h2 className="text-sm font-semibold text-ember-700">
        {items.length === 1 ? 'Falta una cosa' : `Faltan ${items.length} cosas`} en este producto
      </h2>

      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.key} className="text-sm">
            <p className="font-medium text-ember-700">
              {item.title}
              {item.blocking && (
                <span className="ml-2 rounded-full bg-ember-600 px-2 py-0.5 text-xs font-normal text-white">
                  impide publicar
                </span>
              )}
            </p>
            <p className="mt-0.5 text-carbon-600">{item.action}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
