// ---------------------------------------------------------------------------
// Pasar a mayusculas y minusculas los nombres que llegaron gritando.
//
// Una parte del catalogo vino del inventario en MAYUSCULAS pero ya escrita en
// español y con sentido comercial: "GUANTES PARA ASAR DE SILICONA". No hay nada
// que decidir ahi, solo que se lea como un nombre y no como un codigo.
//
// Esto NO traduce, no reordena y no quita palabras. Solo cambia como se escribe
// lo que ya estaba. Los nombres en ingles y los que traen codigos de almacen se
// quedan fuera a proposito: esos necesitan criterio del cliente.
// ---------------------------------------------------------------------------

/// Palabras que van en minuscula salvo al principio del nombre.
///
/// Son las que en español no se capitalizan dentro de un titulo. Sin esto sale
/// "Guantes Para Asar De Silicona", que se lee como ingles mal traducido.
const ENLACES = new Set([
  'a',
  'con',
  'de',
  'del',
  'e',
  'el',
  'en',
  'la',
  'las',
  'lo',
  'los',
  'o',
  'para',
  'por',
  'sin',
  'y',
]);

/// Como se escribe cada nombre propio de Weber. La clave va sin acentos y en
/// minuscula; el valor es la forma buena.
///
/// Estan aqui porque la regla general los estropearia: "master-touch" saldria
/// "Master-touch", y "weber connect" perderia la mayuscula de Connect.
const PROPIOS = new Map(
  Object.entries({
    weber: 'Weber',
    'master-touch': 'Master-Touch',
    'weber works': 'Weber Works',
    'weber connect': 'Weber Connect',
    traveler: 'Traveler',
    kettle: 'Kettle',
    lumin: 'Lumin',
    genesis: 'Genesis',
    spirit: 'Spirit',
    summit: 'Summit',
    performer: 'Performer',
    slate: 'Slate',
    searwood: 'Searwood',
    ii: 'II',
    iii: 'III',
  }),
);

/// Unidades de medida. Van en minuscula: "20 lb", no "20 LB" ni "20 Lb".
const UNIDADES = new Set(['lb', 'lbs', 'kg', 'g', 'oz', 'ml', 'l', 'cm', 'mm', 'm', 'pc', 'pza']);

/// Palabras que en el inventario perdieron el acento. Se restituye porque un
/// nombre sin acentos en la tienda se lee como escrito con prisa, y ademas es
/// lo que alguien teclea al buscar.
const ACENTOS = new Map(
  Object.entries({
    carbon: 'carbón',
    portatil: 'portátil',
    portatiles: 'portátiles',
    electrico: 'eléctrico',
    electricos: 'eléctricos',
    plastico: 'plástico',
    aluminio: 'aluminio',
    bisagra: 'bisagra',
    bisagras: 'bisagras',
    limpieza: 'limpieza',
    proteccion: 'protección',
    protector: 'protector',
    recoleccion: 'recolección',
    version: 'versión',
    numero: 'número',
    articulo: 'artículo',
    plancha: 'plancha',
    utensilios: 'utensilios',
    modulo: 'módulo',
  }),
);

/// Como se escribe una sola secuencia de letras, sabiendo si abre el nombre.
///
/// Es importante que se decida por significado y no por como venia escrita: la
/// entrada esta toda en mayusculas, asi que "DE" y "KIT" se ven igual y no hay
/// forma de distinguir una sigla de una palabra mirando el texto. Por eso no
/// hay ninguna regla del tipo "tres letras en mayuscula es una sigla".
function escribirPalabra(letras: string, abreElNombre: boolean): string {
  const bajo = letras.toLocaleLowerCase('es');

  const propio = PROPIOS.get(bajo);
  if (propio) return propio;

  if (UNIDADES.has(bajo)) return bajo;

  // Los enlaces van en minuscula, menos si abren el nombre.
  if (!abreElNombre && ENLACES.has(bajo)) return bajo;

  const conAcento = ACENTOS.get(bajo) ?? bajo;
  return conAcento.charAt(0).toLocaleUpperCase('es') + conAcento.slice(1);
}

/// Quita el punto con el que acaban algunos nombres del inventario.
///
/// Un nombre de producto no es una frase: el punto sobra siempre. Va aparte de
/// la capitalizacion porque no depende del idioma del nombre, asi que se le
/// puede aplicar tambien a los que siguen esperando al cliente.
export function quitarPuntoFinal(nombre: string): string {
  return nombre.replace(/\s*\.+\s*$/, '');
}

/// El nombre escrito como se lee, no como lo guarda el almacen.
export function capitalizarNombre(nombre: string): string {
  const limpio = quitarPuntoFinal(nombre).trim().replace(/\s+/g, ' ');

  // Los nombres propios de varias palabras se resuelven antes de partir, o
  // "WEBER WORKS" se veria como dos palabras sueltas.
  let texto = limpio;
  for (const [clave, forma] of PROPIOS) {
    if (!clave.includes(' ')) continue;
    texto = texto.replace(new RegExp(`\\b${clave}\\b`, 'gi'), forma);
  }

  const yaResueltas = new Set([...PROPIOS.values()].flatMap((f) => f.split(' ')));
  let esPrimera = true;

  return texto
    .split(' ')
    .map((token) => {
      if (yaResueltas.has(token)) {
        esPrimera = false;
        return token;
      }

      // Medidas y cantidades se quedan como estan: 18.5", 22.5", 5PC, 2.
      if (/\d/.test(token)) {
        esPrimera = false;
        return token;
      }

      // Se reescribe cada tramo de letras y se conserva todo lo demas en su
      // sitio: guiones, barras, comillas y parentesis. Asi "C/BISAGRAS" sale
      // "C/Bisagras" y no se queda intacto por no encajar en ningun molde.
      return token.replace(/[\p{L}\p{M}]+/gu, (letras) => {
        const escrita = escribirPalabra(letras, esPrimera);
        esPrimera = false;
        return escrita;
      });
    })
    .join(' ');
}

/// Si el nombre es de los que solo hay que reescribir, sin decidir nada.
///
/// Dos condiciones: viene gritado, y no arrastra ingles ni codigos de almacen.
/// Los que si los arrastran necesitan el criterio del cliente y quedan fuera.
export function soloNecesitaCapitalizarse(nombre: string): boolean {
  const letras = nombre.replace(/[^\p{L}]/gu, '');
  if (letras.length === 0) return false;

  const mayusculas = nombre.replace(/[^\p{Lu}]/gu, '');
  const gritado = mayusculas.length / letras.length > 0.7;
  if (!gritado) return false;

  return !CODIGOS.test(nombre) && !INGLES.test(nombre);
}

/// Codigos del almacen de Weber. Su significado lo tiene que confirmar el
/// cliente, asi que cualquier nombre que los lleve queda fuera.
const CODIGOS =
  /\b(US\/CA|US\/MX|CA\/MX|USA\/CA\/MX|US\/CA\/MX|AMER|LP|SS|BLK|CVR|PREM|FT|NG|MDNT|SMK|CH|GBS|PECI|GEN|SP|CS|OT)\b/i;

/// Palabras en ingles que hay que traducir, no capitalizar.
const INGLES =
  /\b(GRILL|GRIDDLE|CHARCOAL|PELLET|COVER|SCOOP|SPATULA|SCRAPER|DOME|BASTING|CLEANER|POLISH|REMOVER|STAIN|STAINLESS|STEEL|SCRUBBER|GRATE|GRATES|CUTTING|BOARD|HANDLE|LIGHT|INSERT|FRAME|SKEWERS|ROTISSERIE|LARGE|FORMAT|SEAR|STONE|FLATTOP|BASKET|DUTCH|OVEN|DUO|INFRARED|THERMOMETER|RACK|SMASHED|BURGER|CADDY|TRAY|LID|DEEP|WOK|STEAMER|SERIES|STUBBORN|EXTERIOR|WORKS|RESISTANT|RUST|CENTER|BLUE|OCEAN|IVORY|STEALTH)\b/i;
