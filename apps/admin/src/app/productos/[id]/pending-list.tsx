import { CircleCheck, Lightbulb, TriangleAlert } from 'lucide-react';
import type { PendingItem } from '@weber/core';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <Alert variant="success">
        <CircleCheck />
        <AlertTitle>Este producto está completo.</AlertTitle>
        <AlertDescription>
          Si ya lo revisaste, desmarca abajo &ldquo;Sigue pendiente de revisión&rdquo; y guarda.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {blocking.length > 0 && (
        <Card className="border border-warning-border bg-warning-muted ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <TriangleAlert className="size-4 shrink-0" />
              {blocking.length === 1
                ? 'Falta un campo obligatorio para publicar'
                : `Faltan ${blocking.length} campos obligatorios para publicar`}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {blocking.map((item) => (
                <li key={item.key}>
                  <p className="font-medium text-warning">{item.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{item.action}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-warning/80">
              Son los marcados con <span className="font-semibold">*</span> en el formulario.
            </p>
          </CardContent>
        </Card>
      )}

      {suggested.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Lightbulb className="size-4 shrink-0" />
              Recomendado, no impide publicar
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="space-y-3">
              {suggested.map((item) => (
                <li key={item.key}>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{item.action}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {blocking.length === 0 && (
        <Alert variant="success">
          <CircleCheck />
          <AlertTitle>Ya se puede publicar.</AlertTitle>
          <AlertDescription>
            Lo de arriba mejora la ficha, pero no es obligatorio.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
