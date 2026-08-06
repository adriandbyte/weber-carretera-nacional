// ---------------------------------------------------------------------------
// Que le falta a un producto para estar listo.
//
// La nota que dejaba el importador ("Nombre en mayusculas, falta redaccion
// comercial") describia el problema en el momento de importar, en lenguaje de
// quien escribio el importador. Quien captura ve un nombre lleno y no entiende
// que se espera de el.
//
// Esto lo reemplaza: se calcula sobre el estado actual del producto, dice que
// hacer y no solo que esta mal, y cada punto desaparece solo al resolverse.
// ---------------------------------------------------------------------------

export interface PendingItem {
  /// Identificador estable, para las pruebas.
  key: string;
  /// Que falta, en una linea, para encabezar el punto en pantalla.
  title: string;
  /// El mismo dato en forma de sustantivo, para poder enumerarlo dentro de una
  /// frase: "Para publicar falta: descripcion corta, una imagen".
  missing: string;
  /// Que tiene que hacer la persona.
  action: string;
  /// Si impide publicar el producto o solo es recomendable.
  blocking: boolean;
}

export interface ProductSnapshot {
  name: string;
  shortDescription: string | null;
  description: string | null;
  imageCount: number;
  categoryCount: number;
  hasProductType: boolean;
}

/// Abreviaturas de almacen de Weber. Sirven para el inventario y no significan
/// nada para quien compra: LP es gas LP, SS acero inoxidable, BLK negro,
/// CVR funda, PREM premium, y US/CA/MX es la region de distribucion.
const WAREHOUSE_CODES = [
  'US/CA',
  'US/MX',
  'CA/MX',
  'AMER',
  'LP',
  'SS',
  'BLK',
  'CVR',
  'PREM',
  'FT',
  'NG',
];

/// Detecta un nombre que sigue siendo el del sistema de Weber.
///
/// Dos señales, cualquiera basta:
///   - viene todo en mayusculas, cosa que ningun nombre redactado hace
///   - conserva codigos de almacen como palabra suelta
export function looksLikeWarehouseName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 8) return false;

  const letters = trimmed.replace(/[^a-záéíóúñü]/gi, '');
  const upper = trimmed.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, '');
  // Casi todo en mayusculas. Se deja margen porque un nombre bien escrito
  // puede llevar siglas: "Asador Weber Q2800".
  if (letters.length > 0 && upper.length / letters.length > 0.7) return true;

  const words = trimmed.toUpperCase().split(/[\s,]+/);
  return WAREHOUSE_CODES.some((code) => words.includes(code));
}

export function findPending(product: ProductSnapshot): PendingItem[] {
  const pending: PendingItem[] = [];

  if (looksLikeWarehouseName(product.name)) {
    pending.push({
      key: 'nombre',
      missing: 'un nombre redactado',
      title: 'El nombre es el código interno de Weber',
      action:
        'Reescríbelo en español, como se lo dirías a alguien en mostrador. ' +
        'Conserva el modelo y quita los códigos de región (US/CA/MX) y las ' +
        'abreviaturas de almacén (LP, SS, BLK, CVR).',
      // Impide publicar: sacar un codigo de almacen como titulo de producto es
      // exactamente lo que se quiere evitar, y es lo primero que ve Google.
      blocking: true,
    });
  }

  if (!product.shortDescription) {
    pending.push({
      key: 'descripcion-corta',
      missing: 'la descripción corta',
      title: 'Falta la descripción corta',
      action:
        'Una o dos frases: qué es, para cuántas personas y qué lo hace ' +
        'distinto. Es lo que aparece en las listas y en los resultados de Google.',
      blocking: true,
    });
  }

  if (!product.description) {
    pending.push({
      key: 'descripcion',
      missing: 'la descripción completa',
      title: 'Falta la descripción completa',
      action:
        'El texto de la ficha: medidas, materiales, qué incluye en la caja y ' +
        'garantía. Escríbelo con palabras propias, no copiado de Weber.',
      blocking: false,
    });
  }

  if (product.imageCount === 0) {
    pending.push({
      key: 'imagen',
      missing: 'una imagen',
      title: 'No tiene ninguna imagen',
      action: 'Sube al menos una foto. No hace falta prepararla, el panel la optimiza sola.',
      blocking: true,
    });
  }

  if (product.categoryCount === 0) {
    pending.push({
      key: 'categoria',
      missing: 'una categoría del menú',
      title: 'No está en ninguna categoría del menú',
      action: 'Marca al menos una en Clasificación, o no aparecerá en ninguna sección.',
      blocking: true,
    });
  }

  if (!product.hasProductType) {
    pending.push({
      key: 'tipo',
      missing: 'el tipo de producto',
      title: 'Falta el tipo de producto',
      action: 'Elígelo en Clasificación: asador, ahumador, plancha, accesorio…',
      blocking: true,
    });
  }

  return pending;
}
