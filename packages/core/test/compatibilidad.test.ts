// Prueba de la regla de compatibilidad y, sobre todo, de que el esquema sepa
// distinguir "no marque ninguna casilla" de "esta pantalla no tenia casillas".
//
// Vale la pena fijarlo porque el fallo era mudo: al marcar un accesorio como
// plancha, el bloque "Compatible con" desaparecia, el navegador dejaba de
// enviar el campo y el guardado borraba las series ya capturadas mostrando
// "Cambios guardados." Nadie podia notarlo hasta abrir la base.
import { acceptsCompatibility } from '../src/compatibilidad';
import { productSchema } from '../src/schemas';

let fallos = 0;
function check(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'ok  ' : 'FALLA'} ${nombre}${ok ? '' : ` (real ${JSON.stringify(real)}, esperado ${JSON.stringify(esperado)})`}`,
  );
}

// --- Que tipos admiten compatibilidad -------------------------------------
for (const equipo of ['asador', 'ahumador', 'plancha']) {
  check(`${equipo} es equipo, no declara compatibilidad`, acceptsCompatibility(equipo), false);
}
for (const accesorio of ['accesorio', 'combustible', 'sazonador', 'paquete']) {
  check(`${accesorio} si declara compatibilidad`, acceptsCompatibility(accesorio), true);
}
// Sin tipo elegido todavia no se ha decidido que es: esconder el campo seria
// decidirlo por quien captura.
check('sin tipo: se muestra', acceptsCompatibility(null), true);
check('tipo vacio: se muestra', acceptsCompatibility(''), true);

// --- El marcador del formulario -------------------------------------------
const base = {
  name: 'Plancha para Genesis II',
  shortDescription: '',
  description: '',
  status: 'DRAFT' as const,
  price: '',
  compareAtPrice: '',
  productTypeId: '',
  fuelTypeId: '',
  seriesId: '',
  formatId: '',
  colorId: '',
  sizeId: '',
  categoryIds: [],
  needsReview: false,
};

// El caso del bug: la pantalla escondio el bloque, asi que no mandó ni el
// marcador ni las casillas. La ausencia no debe interpretarse como borrado.
const oculto = productSchema.safeParse({ ...base, compatibleSeriesIds: [] });
check(
  'sin marcador: el guardado no debe tocar la compatibilidad',
  oculto.success && oculto.data.compatibilityEditable,
  false,
);

// La pantalla si mostro el bloque y la persona desmarco todo: aqui vaciar si
// es lo que se pidio.
const vaciadoAdrede = productSchema.safeParse({
  ...base,
  compatibilityEditable: true,
  compatibleSeriesIds: [],
});
check(
  'con marcador y lista vacia: vaciar es lo pedido',
  vaciadoAdrede.success && vaciadoAdrede.data.compatibilityEditable,
  true,
);

const conSeries = productSchema.safeParse({
  ...base,
  compatibilityEditable: true,
  compatibleSeriesIds: ['serie-genesis', 'serie-spirit'],
});
check(
  'con marcador y series: se guardan las dos',
  conSeries.success && conSeries.data.compatibleSeriesIds.length,
  2,
);

console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
