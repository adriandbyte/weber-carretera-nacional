'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface ActionState {
  ok?: boolean;
  message?: string;
}

/// Convierte el resultado de un Server Action en un aviso flotante.
///
/// Antes cada formulario pintaba su propio recuadro arriba del todo. En la
/// ficha de producto, que mide dos pantallas, ese recuadro aparecia fuera de
/// la vista: se guardaba, no pasaba nada visible y se volvia a guardar.
///
/// Los errores de campo siguen junto a su campo. Aqui va solo el mensaje
/// general, que es el que no tiene donde vivir.
export function useActionToast(state: ActionState) {
  // El estado inicial de useActionState no es el resultado de ningun envio.
  // Sin esta referencia, cada carga de pagina abriria un aviso vacio.
  const previous = useRef(state);

  useEffect(() => {
    if (previous.current === state) return;
    previous.current = state;

    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);
}
