import { NextResponse, type NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Puerta de acceso del panel.
//
// Hoy es una contraseña compartida por HTTP Basic: una sola clave que le pasas
// a quien vaya a limpiar el catálogo. No es un sistema de usuarios y no
// pretende serlo, pero sí evita que el panel quede abierto al mundo mientras
// se trabaja.
//
// Se activa poniendo ADMIN_PASSWORD en el entorno. Sin esa variable el panel
// queda abierto, que es lo cómodo en local y lo inaceptable en producción; por
// eso la comprobación de abajo cierra el paso si detecta que estamos
// desplegados y falta la clave.
//
// Cuando toque el login de verdad (Auth.js con usuarios y roles), se reemplaza
// este archivo y nada más: ninguna página sabe cómo se autentica.
// ---------------------------------------------------------------------------

const REALM = 'Panel de administración';

/// Comparacion en tiempo constante. Comparar con === filtra informacion por el
/// tiempo que tarda en fallar, y aunque aqui el riesgo es remoto, hacerlo bien
/// cuesta cuatro lineas.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function unauthorized() {
  return new NextResponse('Se requiere contraseña.', {
    status: 401,
    headers: { 'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export function middleware(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    // En local se trabaja sin contraseña. Desplegado, faltar la clave dejaria
    // el catalogo completo editable por cualquiera que diera con la URL, asi
    // que se prefiere un panel caido a un panel abierto.
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        'Falta configurar ADMIN_PASSWORD. El panel no se sirve sin contraseña.',
        { status: 503 },
      );
    }
    return NextResponse.next();
  }

  const header = request.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const decoded = atob(header.slice(6));
    // Formato usuario:contraseña. El usuario se ignora, solo cuenta la clave.
    const provided = decoded.slice(decoded.indexOf(':') + 1);
    if (safeEqual(provided, password)) return NextResponse.next();
  }

  return unauthorized();
}

export const config = {
  // Todo el panel queda detras de la puerta, incluidas las Server Actions.
  // Se dejan fuera los recursos estaticos, que no exponen datos.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
