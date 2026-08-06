import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Pagination as Root,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';

/// Paginacion por enlaces. Cada pagina tiene su propia URL, asi que el usuario
/// puede compartirla o volver con el boton atras del navegador y cae donde
/// estaba, que es justo lo que hace falta cuando alguien lleva dos horas
/// limpiando productos.
///
/// Envuelve al componente de shadcn para resolver aqui, en un solo sitio, la
/// ventana de paginas y los extremos deshabilitados.
///
/// Anterior y Siguiente se arman con PaginationLink en vez de con
/// PaginationPrevious y PaginationNext: esos dos fijan sus propios hijos (el
/// icono y la palabra), asi que no dejan sitio para el <Link> de Next.
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

  // Deshabilitado y no oculto: si el boton desaparece en la primera pagina,
  // los numeros se corren y el que se queria pulsar cambia de sitio.
  const off = 'pointer-events-none opacity-40';

  return (
    <Root className="mt-5 justify-start" aria-label="Paginación">
      <PaginationContent>
        <PaginationItem>
          {page > 1 ? (
            <PaginationLink asChild size="default" className="pl-1.5!">
              <Link href={hrefFor(page - 1)} aria-label="Página anterior">
                <ChevronLeft data-icon="inline-start" />
                Anterior
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink size="default" aria-disabled tabIndex={-1} className={`pl-1.5! ${off}`}>
              <ChevronLeft data-icon="inline-start" />
              Anterior
            </PaginationLink>
          )}
        </PaginationItem>

        {ordered.map((p, index) => (
          <PaginationItem key={p} className="flex items-center gap-0.5">
            {index > 0 && ordered[index - 1]! < p - 1 && <PaginationEllipsis />}
            <PaginationLink asChild isActive={p === page} className="tabular-nums">
              <Link href={hrefFor(p)} aria-label={`Página ${p}`}>
                {p}
              </Link>
            </PaginationLink>
          </PaginationItem>
        ))}

        <PaginationItem>
          {page < totalPages ? (
            <PaginationLink asChild size="default" className="pr-1.5!">
              <Link href={hrefFor(page + 1)} aria-label="Página siguiente">
                Siguiente
                <ChevronRight data-icon="inline-end" />
              </Link>
            </PaginationLink>
          ) : (
            <PaginationLink size="default" aria-disabled tabIndex={-1} className={`pr-1.5! ${off}`}>
              Siguiente
              <ChevronRight data-icon="inline-end" />
            </PaginationLink>
          )}
        </PaginationItem>
      </PaginationContent>
    </Root>
  );
}
