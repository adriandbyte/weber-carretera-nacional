# Weber Store

Monorepo de la tienda en línea y su panel de administración.

## Estructura

```
apps/
  web/          Tienda pública (Next.js 15, App Router, ISR)
  admin/        Panel de administración (Next.js 15)
packages/
  db/           Prisma: esquema, cliente, importadores y seed
  core/         Lógica compartida entre las dos apps
  config/       tsconfig y ESLint compartidos
data/            (fuera del repositorio, ver abajo)
  fuentes/      Los Excel originales del cliente
  imagenes/     Imágenes extraídas del Excel (solo modo local)
```

El equivalente a MVC en esta arquitectura:

| Capa | Dónde vive |
| --- | --- |
| Modelo | `packages/db` (Prisma) |
| Controlador | `packages/core` (servicios y validación) |
| Vista | `apps/*/src/app` (componentes de servidor) |

Las dos apps comparten la misma base de datos y la misma lógica. Nunca escribas
consultas de Prisma duplicadas en cada app: si algo lo usan las dos, va en
`packages/core`.

## Arranque

Requiere Node 22+, pnpm 10+ y un PostgreSQL.

```bash
pnpm install

# Los archivos fuente no viven en el repositorio: son binarios de 20+ MB que se
# reemplazan cada vez que cambia el inventario. Colócalos aquí antes de importar:
#   data/fuentes/Base de Datos Inventario.xlsx
mkdir -p data/fuentes

# Postgres local para desarrollo
docker run -d --name weber-pg \
  -e POSTGRES_PASSWORD=weber -e POSTGRES_USER=weber -e POSTGRES_DB=weber \
  -p 55432:5432 postgres:16-alpine

cp .env.example .env       # ajusta DATABASE_URL si usas otro Postgres
pnpm db:migrate            # crea las tablas
pnpm import:inventario     # carga los 331 productos y sus imágenes
pnpm db:seed               # crea menú, páginas y configuración inicial
pnpm dev                   # web en :3000, admin en :3001
```

Hay un solo `.env` en la raíz; cada app y `packages/db` lo alcanzan por symlink,
así que no hay credenciales duplicadas.

## Importadores

### Inventario

```bash
pnpm import:inventario                          # archivo por defecto
pnpm import:inventario -- ruta/a/otro.xlsx
```

Lee `data/fuentes/Base de Datos Inventario.xlsx`, separa las columnas de
categoría en dimensiones limpias (tipo, combustible, serie, formato, color,
tamaño), crea los catálogos y extrae las imágenes incrustadas asociándolas a su
SKU por el anclaje de fila.

Es idempotente. Al reimportar:

- refresca los atributos derivados del Excel
- **no** pisa nombre, precio, stock, descripción ni estado
- no vuelve a subir una imagen que ya existe (la ruta lleva el hash del archivo)
- no borra productos ausentes del Excel, solo los reporta

Todo entra como borrador. Nada aparece en la tienda hasta publicarlo.

Para revisar la normalización sin tocar la base:

```bash
pnpm --filter @weber/db exec tsx scripts/analyze-inventario.ts
```

### Lista de precios

```bash
pnpm import:precios                        # la lista vigente de data/fuentes
pnpm import:precios -- ruta/a/otra.xlsx
pnpm import:precios -- --crear             # da de alta lo que falte
pnpm import:precios -- --publicar
```

Cruza por SKU. Detecta solo la fila de encabezados y los nombres de columna
más comunes (`Clave`/`SKU`/`Código`, `Precio`/`MAP`, `Precio Lista`, `Costo`,
`Existencia`), así que acepta el archivo tal como venga. Sin `--publicar` solo
carga precios; con la bandera además publica lo que estaba en borrador y quedó
con precio mayor a cero.

Los precios de Weber México ya vienen con IVA y son el precio final: se guardan
tal cual y la tienda no calcula impuestos. `compareAtPrice` queda vacío a
propósito, porque no hay precio de promoción fijo; las ofertas son de temporada.

Con `--crear`, los SKU de la lista que no existen en el catálogo se dan de alta
como borrador. Es opt-in porque un SKU sin producto puede ser un alta o una
errata de captura, y solo quien mira las dos listas puede saberlo: sin la
bandera se reportan y no se toca nada.

El alta se clasifica con el mismo normalizador que el inventario, usando la
columna de categoría de la lista, que habla el mismo vocabulario (`GAS Q`,
`CHARCOAL Performer`). Trae menos información -el inventario tiene dos columnas
de categoría y la lista una-, así que el formato queda vacío y el producto sale
marcado para revisar. El nombre entra tal como viene en la lista, sin pasar por
el generador: `pnpm db:nombres` solo interpreta lo que está en el inventario y
deja fuera a estos, para que los dos importadores no se pisen.

### Nombres comerciales

```bash
pnpm db:nombres                     # vista previa, no toca nada
pnpm db:nombres -- --tabla          # escribe la tabla de revisión en Excel
pnpm db:nombres -- --aplicar        # lo escribe en la base
```

El inventario de Weber no trae nombres de venta, trae claves de almacén
(`Q1200N MDNT BLK USA/CA/MX`). Este script las convierte aplicando el criterio
que el cliente aprobó en el cuestionario del catálogo, con dos plantillas:

```
Equipo      Tipo [Formato] de Combustible Weber Serie Modelo [Medida][, Color]
            Asador Portátil de Gas Weber Q1200, Negro
Accesorio   Sustantivo Weber [Línea] [para Equipo] [Cantidad]
            Funda Premium Weber para Asador Genesis Serie 300
```

El nombre propuesto se calcula **siempre desde el Excel de inventario**, nunca
desde lo que hay en la base. Es lo que permite repetir el ciclo: el cliente
corrige la tabla, se ajusta la regla en `scripts/lib/nombres.ts`, se vuelve a
correr, y el resultado depende solo de la regla y del archivo. Correrlo dos
veces seguidas no cambia nada.

Un nombre editado a mano en el panel no se toca: se reporta y se salta.

Nada se adivina. Un accesorio cuyo sustantivo no está en el diccionario de
frases se queda como estaba y sale marcado, porque traducir palabra por palabra
da nombres que nadie firmaría. El script también avisa de los nombres que
quedan repetidos entre dos SKU, que en la tienda serían indistinguibles. Lo
archivado no cuenta en ese aviso: archivar el que sobra es justo como se cierra
la mitad de esos casos.

Cuando dos productos llegan del almacén con el nombre **idéntico letra por
letra**, ninguna regla puede separarlos: el diccionario recibe el mismo texto y
devuelve el mismo nombre. Para esos existe `NOMBRE_POR_SKU` en
`scripts/lib/nombres.ts`, que dicta el nombre producto por producto y manda
sobre cualquier otro camino. Lo que hay ahí son decisiones del cliente, con la
fecha y el motivo al lado. Y un archivado nunca se queda con la dirección
limpia: se la lleva el que sí se vende, aunque su nombre no haya cambiado.

`--tabla` escribe `data/salidas/Nombres propuestos - Weber.xlsx` con las 331
filas, antes y después, lo que quedó pendiente y dos columnas vacías para que el
cliente marque lo que no le guste.

El script también deja **la descripción corta igual que el nombre**, por
decisión del cliente: sin ella no se puede publicar, y prefiere no detener el
catálogo redactando 331 resúmenes. Es provisional y se reconoce por ser idéntica
al nombre, así que en cuanto alguien escriba una de verdad el script deja de
tocarla. El `metaDescription` que sale de ahí queda igual que el `metaTitle`: no
penaliza, pero desperdicia la línea de abajo del resultado de Google, y es lo
primero que hay que rehacer cuando lleguen las descripciones.

## Imágenes

Hay dos almacenamientos detrás de la misma interfaz, y se elige solo según haya
o no `BLOB_READ_WRITE_TOKEN` en el entorno:

| | Sin token (hoy) | Con token |
| --- | --- | --- |
| Dónde viven | `data/imagenes/` en tu disco | Vercel Blob |
| URL en la base | `/imagenes/productos/…` | `https://….blob.vercel-storage.com/…` |
| Cómo las sirve la app | symlink en `apps/*/public/imagenes` | CDN |
| Subir desde el panel | No disponible, avisa en pantalla | Sí |

**Las imágenes locales solo existen en la máquina que hizo la importación.**
`data/` está fuera del repositorio, así que en un despliegue esas URLs no
resuelven. Antes de poner el panel en una URL para que alguien más trabaje, hay
que configurar Blob.

**El store de Blob tiene que ser público**, y hay que acertar al crearlo: el
modo de acceso es permanente y no hay ajuste que lo cambie después, solo crear
otro store. Con uno privado, la importación se cae en la primera foto
(`Cannot use public access on a private store`). Y no es un tecnicismo del
importador: un store privado obliga a servir cada imagen a través de una
función con autenticación, y los buscadores no pueden indexar nada de eso, que
es lo contrario de para qué existe este sitio.

```bash
vercel blob create-store weber-imagenes --access public
```

### Tamaños y rendimiento

Las imágenes se guardan una sola vez, en su tamaño de origen, con su ancho y
alto registrados en la base. No hay campos separados para miniatura y detalle:
`next/image` genera las variantes que hagan falta y sirve a cada dispositivo la
del tamaño correcto, además de retrasar la carga de todo lo que está debajo del
primer pantallazo.

Guardar las medidas no es un detalle: sin ellas el navegador no sabe cuánto
espacio reservar y la página salta cuando la imagen carga. Google lo mide
(Cumulative Layout Shift) y castiga el posicionamiento.

Al subir desde el panel, la imagen se reduce a 2000 px de lado máximo y se
convierte a WebP con calidad 82. Una foto de celular baja alrededor de un 90%
sin diferencia visible. Las imágenes que ya son pequeñas no se agrandan.

### Pasar las imágenes locales a Blob

```bash
# 1. Crear un Blob store en Vercel y copiar el token a .env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_…"

# 2. Reimportar: sube las imágenes y actualiza sus URLs
pnpm import:inventario
```

El importador detecta que las imágenes registradas viven en disco y las sube,
actualizando el registro existente en lugar de crear uno nuevo. El reporte lo
dice: `0 imágenes nuevas, 0 ya existentes, 322 movidas a la nube`.

Esto importa porque el fallo sería silencioso: la ruta interna es idéntica en
disco y en la nube, así que sin esa comprobación el importador diría "322 ya
existentes" con toda normalidad y las dejaría apuntando a una ruta muerta. La
decisión vive en `isInStore()`.

## Llevar el catálogo a otra base

Todo el estado del catálogo se reproduce con cuatro comandos, en este orden. No
hay ningún paso manual: las decisiones del cliente viven en el código, no en la
base.

```bash
pnpm db:migrate              # crea las tablas
pnpm import:inventario       # 331 productos, atributos e imágenes
pnpm import:precios -- --crear   # precios, y da de alta los 10 que solo están en la lista
pnpm db:nombres -- --aplicar     # nombres, descripción corta y avisos de revisión
```

Reimportar el inventario sobre una base que ya tiene datos **refresca el estado
del producto salvo que esté publicado**. Archivar es una decisión del cliente
que vive en el código -paquetes, material de mostrador, lo que Weber ya no
surte, el SKU que sobra de un par repetido- y tiene que aplicarse también a los
que ya existían, no solo a los que se crean. Un producto en `ACTIVE` no se
toca: quien lo publicó desde el panel sabe algo que el Excel no dice.

El orden importa en los dos últimos: `db:nombres` recalcula el aviso de revisión
de cada producto, y `import:inventario` lo vuelve a poner como venía del Excel.
Si se corren al revés, quedan 103 productos diciendo "Nombre en mayúsculas,
falta redacción comercial" sobre nombres que ya están redactados.

Lo que **no** se reproduce y hay que resolver antes de un despliegue de verdad:

| | |
| --- | --- |
| Base | Hoy es un contenedor local en el puerto 55432. Producción necesita `DATABASE_URL` y `DIRECT_URL` de un Postgres alcanzable |
| Imágenes | Sin `BLOB_READ_WRITE_TOKEN` viven en `data/imagenes/` del disco que importó, así que en un despliegue esas URLs no resuelven. Hay que crear el Blob store **antes** de importar |
| Panel | Sin `ADMIN_PASSWORD` el panel responde 503 en producción. Nunca queda abierto, pero tampoco entra nadie |

## Estado actual

- 341 productos: 331 del inventario y 10 dados de alta desde la lista de
  precios 2026, que estaban ahí y no en el inventario
- 318 imágenes extraídas, 309 SKU con imagen (22 sin ninguna)
- 4 imágenes del Excel venían en formato EMF, que ningún navegador puede
  mostrar: se ignoran en la importación para que esos productos cuenten como
  *Sin imagen* en el resumen en vez de dejar un hueco gris en la tienda
- 201 de las 318 miden menos de 400 px de ancho: sirven de miniatura, no de
  imagen de ficha
- Nombres redactados con el criterio del cuestionario: **los 323 productos
  activos tienen nombre de venta**. Los 4 que quedan sin redactar son paquetes
  de la Grill Academy, que están archivados y cuyo nombre es una lista de SKU
- 17 productos archivados: los 10 paquetes, 3 Q1200 de colores que Weber ya no
  surte, 2 cajas de bolsas ecológicas -material de mostrador, no producto de
  tienda- y 2 que eran el mismo producto cargado dos veces, el Genesis S-435 de
  México y un Traveler Compact. Archivados y no borrados: se reactivan en un
  clic, y en el caso de los paquetes su nombre trae la receta de lo que incluyen
- **Cero pendientes.** Ningún producto activo arrastra un aviso de revisión ni
  le falta nada de lo que impide publicar. Lo único abierto es un grupo de
  nombres repetidos: no es un campo vacío, son tres SKU distintos que se llaman
  igual
- El Q1200 son siete productos, uno por color, con el precio de su color: los 4
  vigentes a $7,499 y los 3 nuevos a $6,999. Los otros 3 colores que traía la
  lista quedaron archivados porque Weber ya no los surte (confirmado por el
  cliente el 2026-09-07)
- 331 con descripción corta, que hoy repite el nombre. Con eso ya no queda
  ningún pendiente que impida publicar: falta la descripción completa en los
  331 y una imagen en 22, y ninguna de las dos bloquea
- De los 7 nombres repetidos que se le preguntaron al cliente
  (`docs/nombres-repetidos.md`) quedan cerrados 6: dos se archivaron por ser el
  mismo producto cargado dos veces y cuatro se separaron por color, tamaño,
  calidad o nombre propio. Sigue abierto el abrillantador de acero inoxidable
  12 oz, que son tres SKU (`6271`, `8029`, `8039`) y el cliente dice que se
  diferencian en la presentación, sin decir todavía cuál es cuál
- 327 productos sin descripción completa. No bloquea publicar y las va a
  redactar el cliente en el panel antes de producción; mientras tanto la
  descripción corta repite el nombre
- **Los 323 productos activos tienen precio.** 327 salen de la lista 2026, uno
  por fila, y los dos tanques de gas de un precio que el cliente dio de palabra
  porque su lista no los trae. Sin precio quedan solo los 12 archivados
- 10 SKU de la lista no existen en el inventario: los 6 Q1200 con el esquema de
  SKU viejo, más cuatro productos nuevos (Spirit SB-E-425, funda Smoque 22",
  tabla Weber Works Smoke y mesa lateral de Kettle 18"/22")

## Qué se captura y qué se calcula

El panel solo muestra lo que una persona tiene que decidir. Todo lo demás se
resuelve en el servidor, en `apps/admin/src/app/productos/[id]/actions.ts`:

| Campo | Cómo se resuelve |
| --- | --- |
| URL del producto | Se deriva del nombre mientras el producto no se haya publicado. Al publicarse queda fija: ya circula en enlaces y está indexada. |
| Título y resumen para buscadores | Se derivan del nombre y la descripción corta. |
| Marca | Todo el catálogo es Weber. Se conserva sin tocarse. |
| Existencias | El inventario llega después. Se conserva sin tocarse. |

La regla detrás de esto: un campo que quien captura no necesita decidir no
debería estar en la pantalla. Solo agrega ruido y formas nuevas de equivocarse.
Por eso "Compatible con" tampoco aparece en asadores, únicamente en accesorios.

### Qué impide publicar

Lo comprueban la pantalla y el guardado con la misma regla, `findPending` en
`packages/core`:

| Impide publicar | Solo se recomienda |
| --- | --- |
| Nombre redactado, no el código de Weber | Descripción completa |
| Descripción corta | Una imagen |
| Precio | |
| Al menos una categoría del menú | |
| Tipo de producto | |

La descripción completa y la imagen no bloquean a propósito. Las fotos se suben
al almacenamiento remoto con la tienda ya en línea, y las descripciones las va a
redactar el cliente en el panel antes de salir a producción (decisión del
2026-09-07): exigirlas antes dejaría el catálogo entero detenido por un trabajo
que toca hacer después.

## Acceso al panel

El panel va detrás de una contraseña compartida (HTTP Basic). Se activa con
`ADMIN_PASSWORD`:

```bash
ADMIN_PASSWORD="la-clave" pnpm --filter @weber/admin dev
```

Sin esa variable el panel queda abierto, que es lo cómodo en local. En un
despliegue, faltar la clave hace que responda 503 en lugar de quedar expuesto.

No es un sistema de usuarios y no pretende serlo: sirve para que alguien pueda
entrar a limpiar el catálogo sin que el panel esté abierto al mundo. Cuando
toque el login real (Auth.js con usuarios y roles) se reemplaza
`apps/admin/src/middleware.ts` y nada más, porque ninguna página sabe cómo se
autentica.

## Interfaz del panel

El panel usa [shadcn/ui](https://ui.shadcn.com) sobre Tailwind v4. Los
componentes se copian al repositorio (`apps/admin/src/components/ui/`), no se
instalan como dependencia: se pueden editar, y de hecho hay tres añadidos que
no vienen del registro (variantes `warning` y `success` en `alert` y `badge`, y
`native-select`).

Para traer uno nuevo:

```bash
cd apps/admin && pnpm dlx shadcn@latest add <componente>
```

### Colores

Todo se pinta con tokens semánticos definidos en `apps/admin/src/app/globals.css`
y **ningún color literal**. Es la única razón por la que el modo oscuro funciona
sin repasar cada pantalla: un `bg-white` suelto seguiría siendo blanco de noche.

| Token | Para qué |
| --- | --- |
| `primary` | La marca. Weber es ese rojo. Acciones principales. |
| `destructive` | Borrar y errores. Rojo distinto a propósito: si "guardar" y "eliminar" comparten color, tarde o temprano se confunden. |
| `warning` | Lo que falta por hacer. Ámbar, no rojo: pendiente no es error. |
| `success` | Lo que ya está listo o publicado. |
| `photo` | Fondo de las fotos de producto. **Claro también en modo oscuro**: Weber las entrega recortadas sobre blanco y casi todos sus asadores son negros. |

El tema se elige en la barra lateral (claro, oscuro o el del sistema) y lo
recuerda `next-themes` en `localStorage`.

### Avisos

El resultado de un Server Action sale como notificación flotante
(`sonner`), a través de `useActionToast`. Los errores de campo siguen junto a su
campo; solo el mensaje general se va al aviso, que es el que no tiene dónde
vivir: en la ficha de producto, que mide dos pantallas, el recuadro de antes
aparecía fuera de la vista y el usuario creía que no había guardado.

### Desplegables

Los `<select>` son nativos (`native-select`), no el Select de Radix. Todos los
formularios se envían con Server Actions y FormData, y el nativo viaja en el
envío sin inputs ocultos, admite el valor vacío que necesita "Sin especificar"
(Radix lo reserva para limpiar la selección) y abre el selector del sistema en
móvil. El costo es no poder pintar la lista desplegada.

### La ficha de producto

Dos columnas: contenido y clasificación a la izquierda, y a la derecha
imágenes, publicación y precio. Clasificación se queda en la columna ancha
porque lleva las casillas de categorías y las diecisiete series de "Compatible
con" a tres columnas; en una columna estrecha se vuelve una lista de
veinticinco filas.

`ImageManager` vive **dentro** de ese `<form>`, así que no puede usar `<form>`
propios: anidar un formulario dentro de otro no es HTML válido. Llama a los
Server Actions directamente desde el cliente con `useTransition`. De paso
desapareció el input de archivo nativo, que mostraba "Choose File / No file
chosen" en inglés porque ese texto lo pone el navegador y no se puede traducir.

Como el gestor llega como pieza ya construida (prop `media`), el formulario no
necesita saber nada de imágenes.

## Catálogos

Las siete listas que alimentan los menús desplegables de la ficha (tipos,
combustibles, series, formatos, colores, tamaños y categorías) se editan desde
`/catalogos`. Comparten forma, así que hay una sola pantalla en lugar de siete:
el registro está en `apps/admin/src/lib/catalogos.ts` y agregar un catálogo
nuevo es agregar una entrada ahí.

Cada opción muestra cuántos productos la usan. **Una opción en uso no se puede
eliminar**: los productos que la tienen se quedarían sin ese dato y el error no
aparecería hasta semanas después, al filtrar en la tienda. En su lugar se
oculta, y deja de aparecer en los menús sin afectar lo ya capturado. La guarda
vive en el servidor, no solo en la pantalla.

## La tienda pública y los buscadores

La tienda se sirve estática y se regenera sola (ISR), que es lo que le da
velocidad y posicionamiento sin desplegar cada vez que se publica un producto.
Encima de eso hay tres piezas que Google espera encontrar:

| Pieza | Dónde | Qué hace |
| --- | --- | --- |
| `robots.txt` | `apps/web/src/app/robots.ts` | Permite el rastreo y anuncia el sitemap |
| `sitemap.xml` | `apps/web/src/app/sitemap.ts` | Sale de la base y **solo lista lo publicado**: anunciar una URL que responde 404 es la forma más rápida de que el archivo deje de tomarse en serio |
| Canónicas y Open Graph | `apps/web/src/app/layout.tsx` | Necesitan `metadataBase`; sin ella las URLs salen relativas y las tarjetas al compartir se rompen |

Las tres leen la dirección del sitio del mismo sitio (`apps/web/src/lib/site.ts`,
`NEXT_PUBLIC_SITE_URL`). Si el sitemap anunciara un dominio y la canónica otro,
Google se queda con el que quiera.

El panel, al revés, declara `noindex` en su layout: nunca debe aparecer en una
búsqueda.

## Pendiente

Las tres secciones que faltan solo tienen sentido cuando exista la tienda
pública, así que ni siquiera aparecen en el menú del panel todavía:

- **Contenido**: las páginas de Grill Academy, Ubicación, B2B y Contacto. El
  seed ya creó las cuatro con sus bloques; falta la pantalla para editarlas.
- **Prospectos**: los formularios del sitio. Sin sitio publicado nunca llega
  ninguno.
- **Configuración**: WhatsApp, horarios y redes. Solo los consume la tienda.
- Tienda pública: fichas de producto y páginas de categoría
- Login con usuarios (Auth.js)
- Carrito y órdenes
