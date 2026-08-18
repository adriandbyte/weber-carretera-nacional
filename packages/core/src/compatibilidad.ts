// ---------------------------------------------------------------------------
// Que productos pueden declarar compatibilidad con una serie.
//
// "Compatible con Genesis" solo significa algo en lo que acompaña a un asador:
// una plancha suelta, una funda, una piedra. El asador no es compatible con la
// serie, es la serie.
//
// La regla vivia escrita a mano en la ficha de producto, que la usaba para
// decidir si pintaba las casillas. El guardado no sabia nada de ella, y esa
// distancia entre las dos era justo el hueco por donde se perdian los datos:
// la pantalla escondia las casillas, el navegador dejaba de enviarlas y el
// guardado leia esa ausencia como "quitale todas las compatibilidades".
// ---------------------------------------------------------------------------

/// Tipos que son el equipo en si, no algo que se le pone encima.
const EQUIPMENT_SLUGS = ['asador', 'ahumador', 'plancha'];

/// Cierto cuando tiene sentido preguntar "¿con que asadores sirve?".
///
/// Sin tipo todavia se responde que si: mientras nadie ha decidido que es el
/// producto, esconder el campo seria decidirlo por el.
export function acceptsCompatibility(productTypeSlug: string | null | undefined): boolean {
  if (!productTypeSlug) return true;
  return !EQUIPMENT_SLUGS.includes(productTypeSlug);
}
