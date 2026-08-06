import type { PendingItem } from '@weber/core';

/// Lo que le falta a este producto, en lenguaje de quien lo va a resolver.
///
/// Sustituye a la nota que dejaba el importador. Aquella decia "Nombre en
/// mayusculas, falta redaccion comercial": describia el sintoma, en el momento
/// de importar y con las palabras de quien escribio el importador. Alguien que
/// abre la ficha y ve el nombre lleno no entiende que se espera de el.
///
/// Se calcula sobre el estado actual, dice que hacer, y cada punto desaparece
/// al guardarlo resuelto.
///
/// Los dos grupos van separados a proposito. Cuando todo se listaba junto, un
/// punto recomendado se leia igual de obligatorio que uno que impide publicar,
/// y no cuadraba con los asteriscos del formulario.
export function PendingList({ items }: { items: PendingItem[] }) {
  const blocking = items.filter((item) => item.blocking);
  const suggested = items.filter((item) => !item.blocking);

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <span className="font-semibold">Este producto está completo.</span> Si ya lo revisaste,
        desmarca abajo &ldquo;Sigue pendiente de revisión&rdquo; y guarda.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {blocking.length > 0 && (
        <section className="rounded-card border border-ember-300 bg-ember-100 p-5">
          <h2 className="text-sm font-semibold text-ember-700">
            {blocking.length === 1
              ? 'Falta un campo obligatorio para publicar'
              : `Faltan ${blocking.length} campos obligatorios para publicar`}
          </h2>
          <p className="mt-0.5 text-xs text-ember-700/80">
            Son los marcados con <span className="font-semibold">*</span> en el formulario.
          </p>

          <ul className="mt-3 space-y-3">
            {blocking.map((item) => (
              <li key={item.key} className="text-sm">
                <p className="font-medium text-ember-700">{item.title}</p>
                <p className="mt-0.5 text-carbon-600">{item.action}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {suggested.length > 0 && (
        <section className="rounded-card border border-carbon-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-carbon-700">
            Recomendado, no impide publicar
          </h2>

          <ul className="mt-3 space-y-3">
            {suggested.map((item) => (
              <li key={item.key} className="text-sm">
                <p className="font-medium text-carbon-700">{item.title}</p>
                <p className="mt-0.5 text-carbon-500">{item.action}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {blocking.length === 0 && (
        <p className="rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span className="font-semibold">Ya se puede publicar.</span> Lo de arriba mejora la ficha,
          pero no es obligatorio.
        </p>
      )}
    </div>
  );
}
