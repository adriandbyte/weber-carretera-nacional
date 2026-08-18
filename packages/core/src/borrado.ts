// ---------------------------------------------------------------------------
// La guarda que impide borrar algo que todavia se esta usando.
//
// Estaba escrita dos veces, una en catalogos y otra en categorias, con la misma
// forma y distintas palabras. Aparte de la duplicacion, vivia dentro de Server
// Actions que consultan Prisma, asi que comprobarla exigia una base de datos
// para verificar una decision que en realidad solo mira un numero.
//
// Aqui es una funcion pura: entra cuantos la usan, sale el motivo o nada.
// ---------------------------------------------------------------------------

export interface TextosDeUso {
  /// Como se lee con un solo uso: "producto lo usa".
  uno: string;
  /// Como se lee con varios: "productos lo usan".
  varios: string;
  /// Que hacer en su lugar. Quien usa el panel no es tecnico: el mensaje tiene
  /// que terminar en una instruccion, no en un diagnostico.
  consejo: string;
}

/// El motivo por el que algo no se puede borrar, o null si si se puede.
///
/// La pantalla ya esconde el boton cuando hay uso, pero un formulario se puede
/// reenviar a mano, asi que la decision tiene que existir tambien del lado del
/// servidor.
export function motivoParaNoBorrar(usage: number, textos: TextosDeUso): string | null {
  if (usage <= 0) return null;

  const cuenta = `${usage} ${usage === 1 ? textos.uno : textos.varios}`;
  return `No se puede eliminar: ${cuenta}. ${textos.consejo}`;
}

/// Los textos de cada pantalla, juntos para que no se separen otra vez.
export const USO_CATALOGO: TextosDeUso = {
  uno: 'producto lo usa',
  varios: 'productos lo usan',
  consejo: 'Edítalo y desmarca "Visible" para que deje de aparecer en los menús.',
};

export const USO_CATEGORIA: TextosDeUso = {
  uno: 'producto está en esta categoría',
  varios: 'productos están en esta categoría',
  consejo: 'Edítala y desmarca "Visible" para que deje de aparecer en la tienda.',
};
