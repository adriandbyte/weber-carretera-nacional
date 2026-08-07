// ---------------------------------------------------------------------------
// Lo minimo para correr las pruebas del panel en un solo proceso.
//
// Antes cada archivo era un `tsx` suelto encadenado con &&, y cada uno abria su
// propio PrismaClient. Cada cliente levanta un pool de varias conexiones, asi
// que tres archivos eran tres rafagas de conexiones seguidas contra el Postgres
// de Docker; su proxy en macOS a veces rechaza la siguiente y la prueba moria
// con "Can't reach database server", sin que nada estuviera mal.
//
// Con un solo proceso hay un solo cliente y una sola conexion. De paso el
// contador de fallos es uno para todas y el resumen sale al final, no tres
// veces "Todas las pruebas pasan".
// ---------------------------------------------------------------------------

let fallos = 0;

export function check(nombre: string, real: unknown, esperado: unknown): void {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALLA'} ${nombre}` +
      // El valor solo estorba cuando la prueba pasa: interesa al depurarla.
      (ok ? '' : `\n      real: ${JSON.stringify(real)}  esperado: ${JSON.stringify(esperado)}`),
  );
}

export function totalFallos(): number {
  return fallos;
}
