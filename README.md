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
  config/       tsconfig, Tailwind y ESLint compartidos
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
pnpm import:precios -- ruta/a/lista-precios.xlsx
pnpm import:precios -- ruta/a/lista-precios.xlsx --publicar
```

Cruza por SKU. Detecta solo la fila de encabezados y los nombres de columna
más comunes (`Clave`/`SKU`/`Código`, `Precio`, `Precio Lista`, `Costo`,
`Existencia`), así que acepta el archivo tal como venga. Sin `--publicar` solo
carga precios; con la bandera además publica lo que estaba en borrador y quedó
con precio mayor a cero.

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
decisión vive en `isInStore()` y tiene pruebas.

## Estado actual

- 331 productos importados, todos en borrador
- 322 imágenes extraídas, 313 SKU con imagen (18 sin ninguna)
- 104 productos marcados para revisión, todos por nombre en mayúsculas que hay
  que redactar para la tienda
- Sin precios: llegan con la lista de precios

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

Un producto no se puede publicar sin descripción e imagen.

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
