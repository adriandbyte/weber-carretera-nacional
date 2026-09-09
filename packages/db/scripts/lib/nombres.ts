// ---------------------------------------------------------------------------
// Genera el nombre comercial de un producto aplicando el criterio que el
// cliente aprobo en el cuestionario del catalogo
// (data/fuentes/Cuestionario catalogo Weber.docx).
//
// La plantilla aprobada, para equipo:
//
//   Tipo [Formato] de Combustible Weber Serie Modelo [Medida][, Color]
//   "Asador Portatil de Gas Weber Q1200, Negro"
//
// Y para lo que acompaña al equipo, el sustantivo abre el nombre:
//
//   Sustantivo Weber [Linea] [para Equipo] [Cantidad][, Color]
//   "Funda Premium Weber para Asador Genesis Serie 300"
//
// El tipo, el combustible, la serie, el formato, la medida y el color no se
// deducen del texto: ya viven normalizados en la base desde la importacion. De
// la cadena original solo se saca el modelo, que es lo unico sin columna.
//
// Los dos casos se resuelven distinto a proposito:
//
//   Equipo      el nombre se reconstruye desde las columnas, asi que da igual
//               como venga el original. Son 30 productos y la plantilla los
//               cubre completos.
//   Accesorio   el nombre ES el texto original traducido, y traducir palabra
//               por palabra da resultados que nadie firmaria ("Parrilla
//               Limpiador 16OZ Weber"). Por eso el sustantivo sale de un
//               diccionario de frases, y lo que no esta en el diccionario no
//               se reescribe: se marca y se queda como estaba.
//
// Nada se adivina. Cuando falta una traduccion o un codigo de almacen sin
// significado confirmado, el producto sale marcado con lo que le falta.
// ---------------------------------------------------------------------------

/// Datos que hacen falta para nombrar un producto: las columnas que la
/// importacion ya normalizo, mas el nombre tal como llego del inventario.
export interface ProductoANombrar {
  sku: string;
  name: string;
  productTypeSlug: string | null;
  fuelTypeSlug: string | null;
  seriesSlug: string | null;
  /// Solo en accesorios: series con las que el producto es compatible. Un
  /// accesorio no pertenece a una serie, la menciona.
  compatibleSeriesSlugs: string[];
  formatSlug: string | null;
  /// Nombre de la medida tal como se muestra: 22", 18.5".
  sizeName: string | null;
  colorSlug: string | null;
}

export interface NombreGenerado {
  nombre: string;
  /// Que quedo pendiente o que decision se tomo. Va a la tabla de revision.
  notas: string[];
  /// False cuando algo del nombre depende de una respuesta que no tenemos.
  confiable: boolean;
}

// ===========================================================================
// Diccionarios
// ===========================================================================

/// Codigos de region: dicen en que paises distribuye Weber el modelo y no
/// describen el producto. El cliente pidio quitarlos de todos los nombres,
/// incluido el "(Tahilandia)" que se habia colado como pais de fabricacion.
const REGIONES =
  /\s*[(]?\s*\b(USA?\/CA\/MX|US\/CA\/MX|USA?\/CA|US\/MX|CA\/MX|US\s+CA\s+MX|AMER|USA|TAHILANDIA|TAILANDIA)\b\s*[)]?|\s+\b(US|CA|MX)\b/gi;

/// Codigos del almacen que salen del nombre sin dejar nada en su lugar.
///
/// FT y CS eran las dos abreviaturas que nadie sabia descifrar -mi lectura era
/// Flat Top y Carbon Steel, de la linea Slate y los accesorios Crafted-, y por
/// eso los 14 productos que las llevaban salian marcados. El cliente contesto
/// el 2026-09-07 que se pueden quitar sin problema, asi que se quitan y ya no
/// se marca nada: los nombres nunca las incluyeron.
const SOBRAN = new Set(['FT', 'CS']);

/// Ingles y codigos del almacen que describen el producto, con el significado
/// que confirmo el cliente. Lo que es marca registrada de Weber no esta aqui:
/// se respeta tal cual. Los que se resuelven en otra columna tampoco: LP y NG
/// los decide el combustible, BLK y SS el color.
const TRADUCCIONES = new Map<string, string>([
  ['GRILL', 'Asador'],
  ['CHARCOAL', 'Carbón'],
  ['PELLET', 'Pellets'],
  ['COVER', 'Funda'],
  ['CVR', 'Funda'],
  ['PREMIUM', 'Premium'],
  ['PREM', 'Premium'],
  ['OT', 'One-Touch'],
  ['PECI', 'Porcelana Esmaltada'],
  ['GRT', 'Parrillas'],
  ['SERIES', 'Serie'],
  ['RUST-RESISTANT', 'Antioxidante'],
  ['RESISTANT', 'Antioxidante'],
  ['TABLETOP', 'de Mesa'],
  // "Charcoal Grill Center" es el Kamado con su mesa de trabajo. Weber lo vende
  // asi y el nombre tiene que decirlo, porque cuesta $20,000 mas que el Kamado
  // solo. Va como propuesta hasta que el cliente lo confirme.
  ['CENTER', 'con Centro de Trabajo'],
]);

/// Nombre dictado producto por producto, para los pares que llegaron del
/// almacen con el nombre identico letra por letra.
///
/// Ninguna regla puede resolverlos: si el texto de origen es el mismo, el
/// diccionario de frases devuelve el mismo nombre por definicion. Lo que los
/// separa solo lo sabe el cliente, y lo dijo el 2026-09-08 cuando se le
/// pregunto por los siete nombres repetidos. La redaccion es nuestra; el
/// criterio, suyo.
const NOMBRE_POR_SKU = new Map<string, string>([
  // "Son diferentes productos, descripcion similar", con los dos nombres que
  // ellos mismos escribieron.
  ['3400213', 'Juego Portátil Weber de 2 Utensilios de Asado'],
  ['6645', 'Set Premium de Herramientas Weber'],

  // "Diferente calidad (estandar (de entrada), premium)". Cual es cual lo dice
  // el precio: $999 el premium, $539 el de entrada.
  ['6771', 'Set Premium de Pinzas y Espátula Weber para Asador'],
  ['3401326', 'Set Estándar de Pinzas y Espátula Weber para Asador'],

  // "Diferentes tamanos (Grande, Chica)". Igual que arriba, el precio decide:
  // $699 el grande, $499 el chico.
  ['7416', 'Encendedor de Carbón Weber Grande'],
  ['7447', 'Encendedor de Carbón Weber Chico'],
]);

/// Palabras inglesas que hay que traducir, no capitalizar. Sirven de alarma:
/// si una sobrevive al diccionario, el producto sale marcado en vez de salir
/// medio en ingles.
const INGLES =
  /^(GRILL|GRILLS|GRIDDLE|CHARCOAL|PELLET|COVER|SCOOP|SPATULA|SCRAPER|SCRUBBER|DOME|BASTING|CLEANER|POLISH|REMOVER|STAIN|STAINLESS|STEEL|GRATE|GRATES|CUTTING|BOARD|HANDLE|LIGHT|INSERT|FRAME|SKEWERS|ROTISSERIE|LARGE|FORMAT|SEAR|STONE|FLATTOP|BASKET|DUTCH|OVEN|DUO|INFRARED|THERMOMETER|RACK|SMASHED|BURGER|CADDY|TRAY|LID|DEEP|WOK|STEAMER|STUBBORN|EXTERIOR|WORKS|RESISTANT|RUST|CENTER|WITH|AND|FOR|SET|BLACK|GREEN|BLUE|ICE|ELECTRIC|WAY|TO|KEEP|WARM|PRESS|ROASTING|TRIVET|PACK|COOKING|COMPATIBLE)$/i;

/// El sustantivo con el que abre el nombre de cada accesorio, por el texto que
/// queda del nombre original una vez quitado todo lo que ya vive en una
/// columna: Weber, la linea, la serie, la medida, el color y la cantidad.
///
/// Es un diccionario de frases y no de palabras porque el ingles del almacen no
/// se traduce palabra por palabra: "GRATE GRILL CLEANER" no es "Parrilla Asador
/// Limpiador", es un limpiador para las parrillas del asador.
///
/// Diecisiete de estas frases eran propuestas mias -productos cuyo nombre en
/// ingles no describe nada: TACO RACK, DUTCH OVEN DUO, LARGE FORMAT SEAR- y
/// salian marcadas para que el cliente las leyera. Las aprobo todas el
/// 2026-09-07, asi que ya no lleva ninguna la marca `propuesta`.
///
/// El campo se queda para lo que venga: cuando haya que inventar un nombre
/// nuevo, se marca y el producto sale señalado en la tabla de revision hasta
/// que alguien lo confirme.
const FRASES: Map<string, { frase: string; propuesta?: boolean }> = new Map([
  // Herramientas y utensilios
  ['INFRARED THERMOMETER', { frase: 'Termómetro Infrarrojo' }],
  ['SMASHED BURGER SET', { frase: 'Juego {marca} para Hamburguesa Smash' }],
  ['TACO RACK', { frase: 'Portataquero' }],
  ['DUTCH OVEN DUO', { frase: 'Olla Dúo de Hierro Fundido' }],
  ['ROTISSERIE SKEWERS', { frase: 'Brochetas {marca} para Rosticero' }],
  ['LOGO CUTTING BOARD', { frase: 'Tabla para Picar con Logo' }],
  ['HANDLE LIGHT', { frase: 'Lámpara {marca} para el Asa del Asador' }],
  ['SCOOP', { frase: 'Pala' }],
  ['SPATULA SET', { frase: 'Juego de Espátulas' }],
  ['PORTATIL TOOL SET', { frase: 'Juego de Herramientas Portátil' }],
  ['SMASHED BURGER PRESS', { frase: 'Prensa {marca} para Hamburguesa Smash' }],
  ['PRESS', { frase: 'Prensa' }],
  ['KEEP WARM RACK', { frase: 'Rejilla Calientaplatos' }],
  ['ROASTING TRAYS COMPATIBLE WITH Q 2800N+ GAS GRILLS', {
    frase: 'Bandejas para Asar {marca} para Asador Q2800',
  }],
  ['TRAY AND TRIVET ROASTING PACK COMPATIBLE WITH Q 2800N+ GAS GRILLS', {
    frase: 'Juego de Bandeja y Rejilla para Asar {marca} para Asador Q2800',
  }],
  ['TERMÓMETRO I GRILL MINI', { frase: 'Termómetro iGrill Mini' }],
  ['RECETARIO "WAY TO GRILL"', { frase: 'Recetario {marca} "Way to Grill"' }],
  ['RECETARIO WAY TO GRILL', { frase: 'Recetario {marca} "Way to Grill"' }],
  ['SONDA ALIMENTOS I GRILL', { frase: 'Sonda para Alimentos iGrill' }],
  ['SONDA AMBIENTAL I GRILL', { frase: 'Sonda Ambiental iGrill' }],
  ['MEDIA PLANCHA Q', { frase: 'Media Plancha {marca} para Asador Q Serie 1000' }],
  ['SPATULA DURABLE', { frase: 'Espátula Rígida' }],
  ['SPATULA FLEXIBLE', { frase: 'Espátula Flexible' }],
  ['SCRAPER', { frase: 'Rasqueta' }],
  ['BOTELLAS', { frase: 'Botellas Dosificadoras' }],
  ['BASTING DOME', { frase: 'Campana para Cocción' }],
  ['XL BASTING DOME', { frase: 'Campana XL para Cocción' }],
  ['SET HERRAMIENTAS ESSENTIAL', { frase: 'Juego de Herramientas Esencial' }],
  ['SET DE HERRAMIENTAS STARTER SET', { frase: 'Juego de Herramientas Inicial' }],
  ['KIT DESAYUNO', { frase: 'Kit para Desayuno' }],
  ['CAJA PARA AHUMADOR', { frase: 'Caja Ahumadora de Acero Inoxidable' }],
  // Limpieza
  ['DEEP CLEANER', { frase: 'Limpiador Profundo' }],
  ['EXTERIOR CLEANER', { frase: 'Limpiador {marca} para Exteriores' }],
  ['EXTERIOR GRILL CLEANER', { frase: 'Limpiador {marca} para el Exterior del Asador' }],
  ['GRATE GRILL CLEANER', { frase: 'Limpiador {marca} para Parrillas de Asador' }],
  ['GRILL GRATE SCRUBBER', { frase: 'Estropajo {marca} para Parrillas de Asador' }],
  ['STAINLESS POLISH', { frase: 'Abrillantador {marca} para Acero Inoxidable' }],
  ['STAINLESS STEEL POLISH', { frase: 'Abrillantador {marca} para Acero Inoxidable' }],
  ['POLISH', { frase: 'Abrillantador {marca} para Acero Inoxidable' }],
  ['STAIN REMOVER', { frase: 'Quitamanchas' }],
  ['STUBBORN STAIN REMOVER', { frase: 'Quitamanchas {marca} para Manchas Difíciles' }],
  ['SISTEMA DE LIMPIEZA OT', { frase: 'Sistema de Limpieza One-Touch' }],
  // Parrillas y planchas de repuesto
  ['REJILLA 3B', { frase: 'Rejilla de Acero Inoxidable de 7 mm {marca} {equipo} de 3 Quemadores' }],
  ['3B PECI GRATES', { frase: 'Parrillas de Porcelana Esmaltada {marca} {equipo} de 3 Quemadores' }],
  ['4B PECI GRATES', { frase: 'Parrillas de Porcelana Esmaltada {marca} {equipo} de 4 Quemadores' }],
  ['3B SF EX4 PECI GRT', { frase: 'Parrillas de Porcelana Esmaltada {marca} {equipo} de 3 Quemadores' }],
  ['WOK STEAMER PECI', { frase: 'Wok Vaporera de Porcelana Esmaltada' }],
  ['PLANCHA COMPLETA', { frase: 'Plancha Completa' }],
  ['LARGE FORMAT SEAR', { frase: 'Plancha de Sellado de Formato Grande' }],
  ['LARGE FORMAT STONE', { frase: 'Piedra para Pizza de Formato Grande' }],
  ['LARGE FORMAT FLATTOP', { frase: 'Plancha Lisa de Formato Grande' }],
  ['LARGE FORMAT BASKET', { frase: 'Canasta de Formato Grande' }],
  ['INSERT FRAME', { frase: 'Marco Adaptador' }],
  // Fundas y muebles
  ['PREMIUM GRILL COVER 600', { frase: 'Funda Premium {marca} para Ahumador Searwood 600' }],
  ['PREMIUM GRILL COVER XL 600', { frase: 'Funda Premium {marca} para Ahumador Searwood XL 600' }],
  ['PREM GRILL CVR', { frase: 'Funda Premium' }],
  ['PREMIUM GRILL COVER', { frase: 'Funda Premium' }],
  ['GRILL COVER COMPATIBLE WITH CHARCOAL GRILLS', { frase: 'Funda {marca} para Asador de Carbón' }],
  ['PREMIUM COVER COMPATIBLE WITH SLATE RUST-RESISTANT', {
    frase: 'Funda Premium {marca} para Plancha Slate 30" Antioxidante',
  }],
  ['PREMIUM GRILL COVER COMPATIBLE WITH PORTATIL GAS GRILL', {
    frase: 'Funda Premium {marca} para Asador Traveler Compact',
  }],
  ['FUNDA PREMIUM SERIES 400', { frase: 'Funda Premium {marca} para Asador Summit Serie 400' }],
  ['FUNDA PREMIUM SERIES 600', { frase: 'Funda Premium {marca} para Asador Summit Serie 600' }],
  ['COOKING GRATES COMPATIBLE WITH 210, 325', {
    frase: 'Parrillas de Cocción {marca} para Asador Spirit 210 y 325',
  }],
  ['TABLA MADERA', { frase: 'Tabla de Madera' }],
  ['CADDY WITH TRAY LID', { frase: 'Organizador con Tapa Bandeja' }],
  ['MESA LATERAL Y KETTLE', { frase: 'Mesa Lateral {weber} para Asador de Carbón 18" y 22"' }],
  ['PREMIUM GRILL COVER – SMOQUE', { frase: 'Funda Premium {weber} para Asador Smoque 22"' }],
  // "Smoke" se queda tal como lo escribio Weber. En la lista de precios el
  // asador de esta linea se llama "Smoque" y la tabla "Smoke", asi que uno de
  // los dos trae una errata: mientras no se sepa cual, no se corrige ninguno.
  ['TABLA LATERAL', { frase: 'Tabla Lateral {marca} Smoke' }],
  ['FUNDA PARA ASADOR A CARBÓN GRILL CENTER', {
    frase: 'Funda {marca} para Asador de Carbón Summit Kamado con Centro de Trabajo',
  }],
  // El nombre original es la lista de con que sirve, con un "Gril l/" partido a
  // la mitad: "Piedra para asar Spirit II 200/300 en adelante Asadores de
  // carbon Original Kettle y Performer 22" Summit Charcoal Gril l/ Grilling
  // Center". Esa lista es compatibilidad y ya vive en su tabla; el nombre dice
  // que es el producto.
  ['PIEDRA PARA ASAR II 200/300 EN ADELANTE ASADORES DE CARBÓN Y CHARCOAL GRIL L/ GRILLING CENTER', {
    frase: 'Piedra para Asar {marca} GBS',
  }],
  ['GRILL & STATION PARRILLA,', { frase: 'Estación {weber} para Asador y Plancha' }],
  // Consumibles y refacciones
  ['PAQ 10 BANDEJAS RECOLECTORAS PELLET', {
    frase: 'Paquete de 10 Bandejas Recolectoras {marca} para Searwood y Summit',
  }],
]);

// ===========================================================================
// Piezas de la plantilla
// ===========================================================================

/// El tipo, con su genero: el color tiene que concordar. "Plancha ... Negra" y
/// "Asador ... Negro", que es como lo escribio el cliente en el cuestionario.
const TIPOS = new Map<string, { nombre: string; femenino: boolean }>([
  ['asador', { nombre: 'Asador', femenino: false }],
  ['ahumador', { nombre: 'Ahumador', femenino: false }],
  ['plancha', { nombre: 'Plancha', femenino: true }],
]);

/// El combustible dentro del nombre. Casi todos entran con "de", pero el
/// electrico es adjetivo: "Asador Electrico Weber Lumin", no "de Electrico".
const COMBUSTIBLES = new Map<string, { frase: string; adjetivo?: { m: string; f: string } }>([
  ['carbon', { frase: 'de Carbón' }],
  ['gas', { frase: 'de Gas' }],
  ['pellet', { frase: 'de Pellets' }],
  ['electrico', { frase: '', adjetivo: { m: 'Eléctrico', f: 'Eléctrica' } }],
]);

/// Solo estos dos formatos entran al nombre. "De carro" y "de pedestal"
/// describen el mueble, no como se usa el asador: alargan el nombre sin ayudar
/// a elegir y siguen sirviendo como filtro.
const FORMATOS = new Map<string, string>([
  ['portatil', 'Portátil'],
  ['empotrable', 'Empotrable'],
]);

/// Como se escribe cada serie, y con que palabras aparece en el inventario.
/// Las variantes hacen falta para poder quitarlas del texto: el nombre no debe
/// repetir la serie que ya sale de su columna.
const SERIES = new Map<string, { nombre: string; variantes: string[] }>([
  ['spirit', { nombre: 'Spirit', variantes: ['SPIRIT', 'SP'] }],
  ['genesis', { nombre: 'Genesis', variantes: ['GENESIS', 'GEN'] }],
  ['summit', { nombre: 'Summit', variantes: ['SUMMIT'] }],
  ['searwood', { nombre: 'Searwood', variantes: ['SEARWOOD'] }],
  ['lumin', { nombre: 'Lumin', variantes: ['LUMIN'] }],
  ['traveler', { nombre: 'Traveler', variantes: ['TRAVELER'] }],
  ['smokey-mountain', { nombre: 'Smokey Mountain', variantes: ['SMOKEY MOUNTAIN'] }],
  ['smokey-joe', { nombre: 'Smokey Joe', variantes: ['SMOKEY JOE'] }],
  ['jumbo-joe', { nombre: 'Jumbo Joe', variantes: ['JUMBO JOE'] }],
  ['go-anywhere', { nombre: 'Go-Anywhere', variantes: ['GO-ANYWHERE', 'GO ANYWHERE'] }],
  ['master-touch', { nombre: 'Master-Touch', variantes: ['MASTER-TOUCH', 'MASTER TOUCH'] }],
  ['performer', { nombre: 'Performer', variantes: ['PERFORMER'] }],
  ['ranch-kettle', { nombre: 'Ranch Kettle', variantes: ['RANCH KETTLE'] }],
  ['original-kettle', { nombre: 'Original Kettle', variantes: ['ORIGINAL KETTLE', 'ORIG KETTLE'] }],
  ['compact', { nombre: 'Compact', variantes: ['COMPACT'] }],
  ['kamado', { nombre: 'Kamado', variantes: ['KAMADO'] }],
  ['q', { nombre: 'Q', variantes: [] }],
]);

/// Lineas propias de accesorios de Weber: son marca, no equipo, asi que van
/// pegadas al nombre y sin "para". "Pala Weber Griddle".
///
/// Griddle esta aqui por decision del cliente: se respeta como nombre de linea
/// en el producto, y la seccion del menu se sigue llamando Planchas.
const LINEAS = new Map<string, string>([
  ['GRIDDLE', 'Griddle'],
  ['CRAFTED', 'Crafted'],
  ['WORKS', 'Works'],
  ['CONNECT', 'Connect'],
  ['GBS', 'GBS'],
]);

/// El color como lo escribio el cliente al corregir el cuestionario. El orden
/// importa: los patrones largos van antes para que "DEEP OCEAN BLUE" no se
/// resuelva como "BLUE".
const COLORES: { patron: RegExp; slug: string; m: string; f: string }[] = [
  { patron: /\bDEEP OCEAN BLUE\b/i, slug: 'deep-ocean-blue', m: 'Azul Deep Ocean', f: 'Azul Deep Ocean' },
  { patron: /\b(DEEP )?SLATE BLUE\b/i, slug: 'slate-blue', m: 'Azul Slate', f: 'Azul Slate' },
  { patron: /\bNEGRO MATE\b|\bMATTE BLACK\b/i, slug: 'negro-mate', m: 'Negro Mate', f: 'Negra Mate' },
  // Los tres colores de la generacion nueva del Q1200 se respetan con su
  // nombre oficial, como los escribio el cliente el 2026-09-07: "Midnight
  // Black, Flame Red y Charcoal Grey, modelos nuevos que acaba de sacar Weber".
  //
  // En el cuestionario habia contestado "Rojo Carmesi" y "Grey", y su ejemplo
  // del Q1200 dejaba MDNT BLK en "Negro". Manda lo ultimo que dijo, y ademas
  // hace falta: el Q1200 negro existe en las dos generaciones a dos precios
  // distintos, y llamar "Negro" a los dos deja dos productos con el mismo
  // nombre y $500 de diferencia.
  { patron: /\bFLAME RED\b/i, slug: 'flame-red', m: 'Flame Red', f: 'Flame Red' },
  { patron: /\bCH GREY\b|\bCHARCOAL GREY\b/i, slug: 'charcoal-grey', m: 'Charcoal Grey', f: 'Charcoal Grey' },
  { patron: /\b(DEEP )?SMOKE\b|\bSMK GREY\b/i, slug: 'smoke', m: 'Humo', f: 'Humo' },
  { patron: /\bTITANIO\b|\bTITANIUM\b/i, slug: 'titanio', m: 'Titanio', f: 'Titanio' },
  { patron: /\bSPRING GREEN\b/i, slug: 'spring-green', m: 'Verde', f: 'Verde' },
  { patron: /\bICE BLUE\b/i, slug: 'azul', m: 'Azul Hielo', f: 'Azul Hielo' },
  { patron: /\bIVORY\b/i, slug: 'ivory', m: 'Marfil', f: 'Marfil' },
  { patron: /\bCRIMSON\b/i, slug: 'crimson', m: 'Crimson', f: 'Crimson' },
  { patron: /\bCOBRE\b|\bCOPPER\b/i, slug: 'cobre', m: 'Cobre', f: 'Cobre' },
  { patron: /\bVERDE\b|\bGREEN\b/i, slug: 'verde', m: 'Verde', f: 'Verde' },
  { patron: /\bNARANJA\b|\bORANGE\b/i, slug: 'naranja', m: 'Naranja', f: 'Naranja' },
  { patron: /\bROJO\b|\bRED\b/i, slug: 'rojo', m: 'Rojo', f: 'Roja' },
  { patron: /\bAZUL\b|\bBLUE\b/i, slug: 'azul', m: 'Azul', f: 'Azul' },
  { patron: /\bSS\b|\bSTAINLESS STEEL\b|\bINOXIDABLE\b/i, slug: 'acero-inoxidable', m: 'Acero Inoxidable', f: 'Acero Inoxidable' },
  { patron: /\bMDNT( BLK)?\b|\bMIDNIGHT( BLACK)?\b/i, slug: 'midnight-black', m: 'Midnight Black', f: 'Midnight Black' },
  { patron: /\bBLK\b|\bBLACK\b|\bNEGRO\b/i, slug: 'negro', m: 'Negro', f: 'Negra' },
];

/// Stealth es edicion, no color, pero se comporta igual: cierra el nombre.
const EDICIONES = /\bSTEALTH\b/i;

/// Palabras del nombre original que ya estan resueltas en otra columna.
const YA_RESUELTO = new Set(['WEBER', 'LP', 'NG', 'IN']);

/// Lo que dice que es el producto y con que funciona. Solo se quita en el
/// equipo, donde la plantilla lo vuelve a poner desde las columnas. En un
/// accesorio esas palabras son parte del sustantivo -"GRATE GRILL CLEANER" es
/// el limpiador de las parrillas del asador- y quitarlas dejaria dos productos
/// distintos con la misma clave en el diccionario.
const YA_RESUELTO_EQUIPO = new Set([
  'ASADOR',
  'ASADORES',
  'AHUMADOR',
  'PLANCHA',
  'GRILL',
  'GRILLS',
  'CHARCOAL',
  'PELLET',
  'ELECTRIC',
  'PORTATIL',
  'PORTÁTIL',
  'EMPOTRABLE',
  'GAS',
  'ELECTRICO',
  'ELÉCTRICO',
  'CARBON',
  'CARBÓN',
]);

const MEDIDA = /^\d{1,2}(?:[.,]\d)?(?:IN|"|CM|MM)$/i;
const CANTIDAD = /^\d{1,3}(?:OZ|PC|PZ|PZS|LB|KG|G|ML)$/i;

// ===========================================================================
// Desmontar el nombre original
// ===========================================================================

interface Desmontado {
  /// Lo que queda del original: modelo y adjetivos, en su orden.
  tokens: string[];
  /// Lineas propias de Weber que aparecieron: Griddle, Crafted, Works.
  lineas: string[];
  /// "Serie 300" cuando el nombre dice "300 SERIES".
  serieSufijo: string | null;
  /// Series nombradas en el texto de un accesorio. La importacion las guarda
  /// aparte, en compatibilidad, pero no reconoce las abreviadas -GEN, SP-, y
  /// son justo las que traen los repuestos.
  seriesMencionadas: string[];
  /// Cantidades como 16OZ o 5PC, que cierran el nombre.
  cantidad: string | null;
  /// La medida tal como venia en el texto. Sirve de respaldo: el catalogo de
  /// tamaños no tiene 17", 30" ni 36", las medidas de la linea Slate, asi que
  /// sin esto el nombre perderia la unica pulgada que traia.
  medida: string | null;
  color: string | null;
  edicion: string | null;
  notas: string[];
}

/// Quita del nombre todo lo que ya vive en una columna y devuelve el resto.
function desmontar(producto: ProductoANombrar, femenino: boolean, esEquipo: boolean): Desmontado {
  const notas: string[] = [];
  // Espacios dobles y el punto final con el que acaban algunos nombres del
  // inventario: si no se quitan aqui, el punto viaja pegado a la ultima palabra
  // y sale un "Grill." que ninguna lista reconoce.
  let texto = ` ${producto.name
    .replace(/\s*\.+\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/[®™]/g, ' ')
    .replace(/["”″]/g, '"')} `;

  // El color se resuelve sobre el texto y no sobre el slug del catalogo: la
  // importacion mando "FLAME RED" y "ROJO" al mismo color y el cliente los
  // quiere distintos. Se quita como frase completa, o "NEGRO MATE" dejaria
  // "MATE" suelto en el nombre.
  let color: string | null = null;
  for (const candidato of COLORES) {
    if (!candidato.patron.test(texto)) continue;
    // El primero que coincide da el nombre, pero se quitan todos: "MDNT BLK"
    // es un solo color escrito con dos palabras del almacen, y si BLK se
    // quedara, el nombre saldria con un "Blk" suelto.
    color ??= femenino ? candidato.f : candidato.m;
    texto = texto.replace(candidato.patron, ' ');
  }
  if (!color && producto.colorSlug) {
    const porSlug = COLORES.find((c) => c.slug === producto.colorSlug);
    if (porSlug) color = femenino ? porSlug.f : porSlug.m;
  }

  const edicion = EDICIONES.test(texto) ? 'Stealth' : null;
  if (edicion) texto = texto.replace(EDICIONES, ' ');

  texto = texto.replace(REGIONES, ' ');
  // "37 1/2"" son tres palabras para una sola medida, y la columna de tamaño ya
  // la trae como 37.5". Sin esto el nombre sale con las dos.
  texto = texto.replace(/\b(\d{2})\s+1\/2\s*"?/g, (_, enteros) =>
    producto.sizeName ? ' ' : ` ${enteros}.5" `,
  );
  // El inventario escribe "RUST RESISTANT" y "RUST-RESISTANT" indistintamente.
  texto = texto.replace(/\bRUST[\s-]+RESISTANT\b/gi, ' RUST-RESISTANT ');

  // La serie tambien se quita como frase: "MASTER TOUCH" son dos palabras. Las
  // compatibles cuentan igual: el nombre de un accesorio no repite la serie que
  // la plantilla vuelve a poner detras de "para".
  const seriesMencionadas: string[] = [];
  const slugsSerie = [producto.seriesSlug, ...producto.compatibleSeriesSlugs].filter(Boolean);
  // En un accesorio cualquier serie nombrada es la del equipo con el que sirve,
  // asi que tambien sale del texto. En el equipo no: "Summit Kamado E6" nombra
  // dos series y las dos son parte de su nombre.
  if (!esEquipo) {
    for (const [slug, serie] of SERIES) {
      if (serie.variantes.some((v) => new RegExp(`\\b${v}\\b`, 'i').test(texto))) {
        seriesMencionadas.push(slug);
      }
    }
  }
  for (const slug of [...slugsSerie, ...seriesMencionadas]) {
    for (const variante of SERIES.get(slug!)?.variantes ?? []) {
      texto = texto.replace(new RegExp(`\\b${variante}\\b`, 'gi'), ' ');
    }
  }

  // "GENESIS 300 SERIES" -> la serie se queda con su numero: "Genesis Serie 300".
  let serieSufijo: string | null = null;
  const conSerie = texto.match(/\b(\d{3,4})\s+SERIES?\b/i);
  if (conSerie) {
    serieSufijo = `Serie ${conSerie[1]}`;
    texto = texto.replace(conSerie[0], ' ');
  }

  const tokens: string[] = [];
  const lineas: string[] = [];
  let cantidad: string | null = null;
  let medida: string | null = null;

  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const alto = palabra.toUpperCase();

    if (alto === '-' || alto === '·') continue;
    if (YA_RESUELTO.has(alto)) continue;
    if (esEquipo && YA_RESUELTO_EQUIPO.has(alto)) continue;
    if (MEDIDA.test(alto)) {
      medida ??= alto.replace(/IN$/i, '"').replace(',', '.');
      continue;
    }
    if (CANTIDAD.test(alto)) {
      // "16OZ" -> "16 oz": la unidad se lee, no se grita.
      cantidad = alto.replace(/^(\d+)(\D+)$/, (_, n, u) => `${n} ${u.toLowerCase()}`);
      continue;
    }

    const linea = LINEAS.get(alto);
    if (linea) {
      if (!lineas.includes(linea)) lineas.push(linea);
      continue;
    }

    if (SOBRAN.has(alto)) continue;

    tokens.push(palabra);
  }

  return { tokens, lineas, serieSufijo, seriesMencionadas, cantidad, medida, color, edicion, notas };
}

/// Un codigo de modelo: mezcla letras y numeros (E-315, SB38, G28, 3B) o es un
/// numero suelto de tres o cuatro cifras, como el Searwood 600.
function esModelo(palabra: string): boolean {
  if (/^\d{3,4}$/.test(palabra)) return true;
  return /\d/.test(palabra) && /[A-Za-z]/.test(palabra);
}

const MINUSCULAS = new Set(['de', 'con', 'para', 'y', 'a', 'del', 'la', 'el', 'los', 'las', 'en']);

function capitalizar(palabra: string): string {
  // Las siglas cortas se quedan como estaban: XL, GBS, SF. "Xl" no es nada.
  if (/^[A-Z]{2,3}$/.test(palabra)) return palabra;

  const bajo = palabra.toLocaleLowerCase('es');
  if (MINUSCULAS.has(bajo)) return bajo;
  return bajo.charAt(0).toLocaleUpperCase('es') + bajo.slice(1);
}

// ===========================================================================
// Composicion
// ===========================================================================

/// El nombre que dicto el cliente para este SKU, si dicto alguno.
///
/// Se consulta antes que cualquier otro camino, incluido el de "ya venia bien
/// escrito": los pares repetidos venian bien escritos los dos, con el mismo
/// nombre, y eso es justo lo que hay que corregir.
export function nombreDicho(sku: string): string | null {
  return NOMBRE_POR_SKU.get(sku) ?? null;
}

/// El nombre comercial del producto, o el original intacto y la lista de lo
/// que falta para poder escribirlo.
export function generarNombre(producto: ProductoANombrar): NombreGenerado {
  // El nombre dictado manda sobre cualquier regla: se puso justo porque la
  // regla no alcanzaba a distinguir este producto de su gemelo.
  const dicho = NOMBRE_POR_SKU.get(producto.sku);
  if (dicho) return { nombre: dicho, notas: [], confiable: true };

  const tipo = producto.productTypeSlug ? TIPOS.get(producto.productTypeSlug) : undefined;
  // Funda, Pala, Espatula, Parrilla: el sustantivo de casi todo accesorio es
  // femenino, y el color concuerda con el.
  const desmontado = desmontar(producto, tipo?.femenino ?? true, tipo !== undefined);

  return tipo ? equipo(producto, tipo, desmontado) : accesorio(producto, desmontado);
}

/// "Asador Portatil de Gas Weber Q1200, Negro"
function equipo(
  producto: ProductoANombrar,
  tipo: { nombre: string; femenino: boolean },
  d: Desmontado,
): NombreGenerado {
  const notas = [...d.notas];
  let confiable = true;

  const combustible = producto.fuelTypeSlug ? COMBUSTIBLES.get(producto.fuelTypeSlug) : undefined;
  // Gas natural y gas LP son dos productos que se llamarian igual: el
  // combustible es lo unico que los separa, asi que ahi si se dice cual.
  const frase =
    combustible && /\bNG\b/i.test(producto.name) && producto.fuelTypeSlug === 'gas'
      ? 'de Gas Natural'
      : (combustible?.frase ?? '');
  const adjetivo = combustible?.adjetivo
    ? tipo.femenino
      ? combustible.adjetivo.f
      : combustible.adjetivo.m
    : '';

  const cabeza = [tipo.nombre, FORMATOS.get(producto.formatSlug ?? ''), adjetivo, frase, 'Weber']
    .filter(Boolean)
    .join(' ');

  // Tres grupos, porque el orden de las palabras no es el del inventario:
  //
  //   nombre        modelo y sublinea, en el orden en que venian. "Spirit
  //                 Fusion E210" y "Searwood XL 600" ya vienen bien.
  //   adjetivos     lo que se tradujo. En español el adjetivo va detras del
  //                 sustantivo, y por eso el cliente escribio "Griddle G28
  //                 Antioxidante" y no "Antioxidante G28".
  //   complemento   lo que arranca con preposicion y cierra el nombre:
  //                 "con Tabla Extensora".
  const nombreTokens: string[] = [];
  const adjetivos: string[] = [];
  const complemento: string[] = [];
  const otraSerie: string[] = [];
  let hayModelo = false;

  for (const palabra of d.tokens) {
    const alto = palabra.toUpperCase();

    if (complemento.length > 0) {
      complemento.push(capitalizar(palabra));
      continue;
    }

    // Un asador puede nombrar dos series -"Summit Kamado E6"- y la segunda va
    // pegada a la primera, no detras del modelo.
    const serieMencionada = [...SERIES.values()].find((s) => s.variantes.includes(alto));
    if (serieMencionada) {
      otraSerie.push(serieMencionada.nombre);
      continue;
    }

    // Una S o una E sueltas detras del modelo son la version en acero o en
    // esmalte, que es justo lo que dice el color. El cliente las quito en su
    // propio ejemplo del Summit SB38.
    if (/^[SE]$/i.test(palabra)) continue;

    if (esModelo(palabra)) {
      nombreTokens.push(alto);
      hayModelo = true;
      continue;
    }

    const traduccion = TRADUCCIONES.get(alto);
    if (traduccion) {
      // Una traduccion que deja la palabra igual -Premium, Stealth- no es una
      // descripcion sino parte del nombre, y se queda en su sitio.
      if (traduccion.toUpperCase() === alto) nombreTokens.push(traduccion);
      else if (MINUSCULAS.has(traduccion.split(' ')[0] ?? '')) complemento.push(traduccion);
      else adjetivos.push(traduccion);
      continue;
    }

    if (INGLES.test(alto)) {
      notas.push(`falta la traducción de "${palabra}"`);
      confiable = false;
      continue;
    }

    if (MINUSCULAS.has(palabra.toLocaleLowerCase('es'))) {
      complemento.push(capitalizar(palabra));
      continue;
    }
    nombreTokens.push(capitalizar(palabra));
  }

  const serie = producto.seriesSlug ? SERIES.get(producto.seriesSlug)?.nombre : null;
  // La serie Q se escribe pegada a su numero, como la escribe Weber y como la
  // escribio el cliente: Q1200, no "Q 1200". La N final es del almacen.
  const nombreSerie =
    serie === 'Q' && nombreTokens[0]
      ? `Q${nombreTokens.shift()!.replace(/^Q/i, '').replace(/N$/i, '')}`
      : serie;

  // La medida se pega al nombre cuando no hay modelo ("Original Kettle 22"") y
  // va detras de la coma cuando si lo hay: pegada a un numero de modelo se
  // leeria como parte del modelo ("Searwood XL 600 34"").
  const medida = producto.sizeName ?? d.medida;

  // Un complemento que solo tiene preposiciones es lo que sobro al quitar el
  // tipo: de "Asador de Carbon Compact" queda un "de" suelto.
  const tieneContenido = complemento.some((p) => !MINUSCULAS.has(p.toLocaleLowerCase('es')));

  const cuerpo = [
    nombreSerie,
    ...otraSerie,
    ...d.lineas,
    d.serieSufijo,
    ...nombreTokens,
    medida && !hayModelo ? medida : null,
    ...adjetivos,
    ...(tieneContenido ? complemento : []),
  ].filter(Boolean) as string[];

  const cola = [medida && hayModelo ? medida : null, d.edicion, d.color].filter(Boolean);

  const base = [cabeza, ...cuerpo].join(' ');
  const nombre = cola.length > 0 ? `${base}, ${cola.join(', ')}` : base;

  return { nombre: limpiar(nombre), notas, confiable };
}

/// "Funda Premium Weber para Asador Genesis Serie 300"
function accesorio(producto: ProductoANombrar, d: Desmontado): NombreGenerado {
  const notas = [...d.notas];
  const clave = d.tokens
    .join(' ')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    // "...PELLET Y SUMMIT" se queda en "...PELLET Y" al quitar la serie.
    .replace(/\s+(Y|E|CON|PARA|DE)$/, '')
    .trim();
  const entrada = FRASES.get(clave);

  if (!entrada) {
    // Sin frase en el diccionario no hay nombre que dar: reordenar palabras
    // sueltas produce nombres que nadie firmaria. Se queda como estaba y sale
    // en la tabla para que el cliente diga como se llama.
    // El mensaje va al panel, y quien captura no es tecnico: dice que hay que
    // hacer, no que le falto al diccionario.
    notas.push(
      clave
        ? 'hay que decidir cómo se llama este producto en español'
        : 'el nombre que llegó del inventario no dice qué es el producto',
    );
    return { nombre: producto.name, notas, confiable: false };
  }

  // El nombre es propuesta mia cuando el cliente no dijo como se llama el
  // producto. Se genera igual, pero señalado.
  if (entrada.propuesta) notas.push('el nombre es una propuesta mía, sin confirmar');

  // Un accesorio no tiene serie propia: la que aparece es la del equipo con el
  // que sirve, y va detras de "para".
  const compatible = producto.compatibleSeriesSlugs[0] ?? d.seriesMencionadas[0];
  const serie = compatible ? SERIES.get(compatible)?.nombre : null;
  // Una frase que ya dice para que sirve no lleva otro "para" detras: el
  // diccionario manda sobre la plantilla.
  const paraEquipo = serie
    ? `para Asador ${[serie, d.serieSufijo].filter(Boolean).join(' ')}`
    : '';

  // La marca va donde la frase diga. En "Funda Premium {marca} para Ahumador
  // Searwood 600" tiene que ir en medio: el producto es una funda de Weber para
  // un ahumador, no una funda para un ahumador de Weber. En las frases que no
  // lo piden, la marca cierra el sustantivo: "Pala Weber Griddle".
  // {marca} mete la marca con su linea -"Weber Griddle"-; {weber} solo la
  // marca, para los productos que llevan la palabra Griddle en el nombre sin
  // ser de esa linea, como la estacion para asador y plancha.
  const marca = ['Weber', ...d.lineas].join(' ');
  let frase = entrada.frase.includes('{weber}')
    ? entrada.frase.replace('{weber}', 'Weber')
    : entrada.frase.includes('{marca}')
      ? entrada.frase.replace('{marca}', marca)
      : `${entrada.frase} ${marca}`;

  // {equipo} marca donde va el equipo compatible cuando la frase no termina
  // ahi: "...de 7 mm Weber Crafted para Asador Genesis de 3 Quemadores".
  const conEquipo = frase.includes('{equipo}');
  frase = frase.replace('{equipo}', paraEquipo);

  // Ni color ni medida se añaden solos: en un accesorio los codigos del almacen
  // ("SS", "PECI") describen el material, no una variante de compra, y el
  // sustantivo del diccionario ya los dice cuando importan.
  // Una frase que ya dice para que sirve no lleva otro "para" detras: el
  // diccionario manda sobre la plantilla.
  const sufijo = conEquipo || frase.includes('para ') ? '' : paraEquipo;
  const medida = d.medida && !/\d/.test(entrada.frase) ? d.medida : null;
  const nombre = [frase, sufijo, medida, d.cantidad].filter(Boolean).join(' ');

  return {
    nombre: limpiar(nombre),
    notas,
    // La propuesta no vuelve el nombre dudoso: el criterio ya esta aprobado y
    // lo que falta por confirmar es la palabra, que va señalada en la tabla.
    confiable: d.notas.length === 0,
  };
}

const limpiar = (nombre: string): string =>
  nombre.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,\s*$/, '').trim();

// ===========================================================================
// A quien le toca
// ===========================================================================

/// Codigos de region, que un nombre de venta nunca lleva.
const CODIGOS = /\b(US\/CA|US\/MX|CA\/MX|USA?\/CA\/MX|AMER)\b/;

/// Palabras que solo existen en el sistema de Weber y que un nombre ya
/// redactado no puede llevar.
///
/// No es la misma lista que INGLES, y la diferencia importa: GRIDDLE, DEEP y
/// GBS si aparecen en un nombre terminado -"Pala Weber Griddle", "Azul Deep
/// Ocean", "Master-Touch GBS"-, asi que verlas no significa que falte trabajo.
/// Si estuvieran aqui, el generador volveria sobre su propio resultado y lo
/// desarmaria: por eso esta funcion decide y no la lista de traducciones.
const DEL_ALMACEN =
  /^(GRILL|GRILLS|CHARCOAL|PELLET|COVER|CVR|PREM|BLACK|BLK|GREEN|ICE|ELECTRIC|TABLETOP|RUST|RUST-RESISTANT|RESISTANT|WITH|AND|FOR|STAINLESS|STEEL|CUTTING|BOARD|SCOOP|SPATULA|SCRAPER|SCRUBBER|DOME|BASTING|CLEANER|POLISH|REMOVER|STAIN|STUBBORN|GRATE|GRATES|HANDLE|LIGHT|INSERT|FRAME|SKEWERS|ROTISSERIE|LARGE|FORMAT|SEAR|STONE|FLATTOP|BASKET|DUTCH|OVEN|DUO|INFRARED|THERMOMETER|RACK|SMASHED|BURGER|CADDY|TRAY|LID|STEAMER|KEEP|WARM|PRESS|ROASTING|TRIVET|PACK|COOKING|COMPATIBLE|WAY|SERIES|MDNT|SMK|LP|NG|SS|OT|GRT|PECI|FT|CS)$/i;

/// Si el nombre sigue siendo el del inventario y hay que redactarlo.
///
/// El equipo es mas permisivo que el accesorio a proposito. El nombre de un
/// asador se reconstruye desde sus columnas, asi que reescribirlo siempre
/// mejora: basta con que arrastre ingles. El de un accesorio es el texto
/// original traducido, asi que solo se toca cuando es claramente del almacen
/// -gritado o con codigos-, y nunca un nombre que alguien ya escribio a mano.
///
/// Tiene que dar false para todo lo que este mismo modulo produce, o la segunda
/// corrida desarmaria la primera. Hay una comprobacion de eso en el script:
/// generar dos veces seguidas no cambia nada.
export function necesitaRedaccion(nombre: string, esEquipo: boolean): boolean {
  const letras = nombre.replace(/[^\p{L}]/gu, '');
  if (letras.length === 0) return false;

  const mayusculas = nombre.replace(/[^\p{Lu}]/gu, '');
  if (mayusculas.length / letras.length > 0.7) return true;
  if (CODIGOS.test(nombre)) return true;

  const palabras = nombre.split(/\s+/).map((p) => p.replace(/[^\p{L}-]/gu, ''));
  if (palabras.some((palabra) => DEL_ALMACEN.test(palabra))) return true;

  // El equipo lleva una prueba mas, y en positivo: si no esta escrito con la
  // plantilla, hay que reescribirlo. Es lo contrario de buscar defectos en el
  // texto, y por eso alcanza los nombres que ya estaban en español pero fuera
  // de formato ("Asador Spirit E325 LP Negro", "Master Touch Deep Smoke").
  // Media docena de asadores con un formato y el resto con otro se lee peor
  // que cualquiera de los dos.
  return esEquipo && !/^(Asador|Ahumador|Plancha)\b.*\bWeber\b/.test(nombre);
}
