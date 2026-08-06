/// Paginacion por enlaces, sin JavaScript de cliente. Cada pagina tiene su
/// propia URL, asi que el usuario puede compartirla o volver con el boton
/// atras del navegador y cae donde estaba, que es justo lo que hace falta
/// cuando alguien lleva dos horas limpiando productos.
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  // Ventana de paginas alrededor de la actual, siempre del mismo ancho para
  // que los botones no bailen de posicion al navegar.
  const window = 2;
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - window; p <= page + window; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const ordered = Array.from(pages).sort((a, b) => a - b);

  const linkClass = 'rounded-md border border-carbon-200 bg-white px-3 py-1.5 hover:bg-carbon-100';
  const mutedClass = 'rounded-md border border-carbon-100 px-3 py-1.5 text-carbon-300';

  return (
    <nav className="mt-5 flex flex-wrap items-center gap-1.5 text-sm" aria-label="Paginación">
      {page > 1 ? (
        <a href={hrefFor(page - 1)} className={linkClass}>
          Anterior
        </a>
      ) : (
        <span className={mutedClass}>Anterior</span>
      )}

      {ordered.map((p, index) => (
        <span key={p} className="flex items-center gap-1.5">
          {index > 0 && ordered[index - 1]! < p - 1 && <span className="px-1 text-carbon-300">…</span>}
          {p === page ? (
            <span
              aria-current="page"
              className="rounded-md bg-carbon-900 px-3 py-1.5 font-medium text-white"
            >
              {p}
            </span>
          ) : (
            <a href={hrefFor(p)} className={linkClass}>
              {p}
            </a>
          )}
        </span>
      ))}

      {page < totalPages ? (
        <a href={hrefFor(page + 1)} className={linkClass}>
          Siguiente
        </a>
      ) : (
        <span className={mutedClass}>Siguiente</span>
      )}
    </nav>
  );
}
