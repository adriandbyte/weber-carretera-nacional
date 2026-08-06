// Prueba de la decision de migrar imagenes entre almacenamientos.
//
// Vale la pena probarla porque el fallo es silencioso: si esto se equivoca, el
// importador reporta "322 ya existentes" con toda normalidad y las imagenes se
// quedan apuntando a una ruta que solo existe en la maquina de quien importo.
import { isInStore } from '../scripts/lib/images.js';

let fallos = 0;
function check(nombre: string, real: boolean, esperado: boolean) {
  const ok = real === esperado;
  if (!ok) fallos += 1;
  console.log(`${ok ? 'ok  ' : 'FALLA'} ${nombre}`);
}

const local = '/imagenes/productos/1500010-0-abc123.png';
const nube = 'https://xyz.public.blob.vercel-storage.com/productos/1500010-0-abc123.png';

check('imagen local con almacenamiento local: sirve', isInStore(local, 'local'), true);
check('imagen en la nube con almacenamiento en la nube: sirve', isInStore(nube, 'blob'), true);
check('imagen local al configurar la nube: hay que subirla', isInStore(local, 'blob'), false);
check('imagen en la nube sin token: hay que bajarla', isInStore(nube, 'local'), false);

console.log(fallos === 0 ? '\nTodas las pruebas pasan' : `\n${fallos} fallas`);
process.exit(fallos === 0 ? 0 : 1);
