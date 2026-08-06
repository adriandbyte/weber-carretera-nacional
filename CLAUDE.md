# CLAUDE.md

Instrucciones para trabajar en este repositorio. El README explica el producto y
cómo arrancarlo; aquí está lo que hay que saber antes de tocar código.

## Qué es

Monorepo de la tienda Weber Carretera Nacional (Monterrey): una tienda pública y
un panel de administración sobre la misma base de datos.

```
apps/web      Tienda pública      Next.js 15 App Router, ISR      :3000
apps/admin    Panel               Next.js 15 + shadcn/ui          :3001
packages/db      Prisma: esquema, cliente, importadores de Excel, seed
packages/core    Validación (Zod) y lógica compartida por las dos apps
packages/config  tsconfig y ESLint compartidos
```

Estado: catálogo importado (331 productos, todos en borrador), panel funcionando,
tienda pública apenas esbozada (solo la portada). Falta ficha de producto,
categorías, carrito y login real.

## Comandos

```bash
pnpm dev          # las dos apps (web :3000, admin :3001)
pnpm lint         # eslint en las dos apps
pnpm typecheck    # tsc --noEmit en todo
pnpm test         # pruebas (tocan la base de datos real, ver abajo)
pnpm db:migrate   # crear/aplicar migración
pnpm db:studio    # explorar la base
```

**No levantes los servidores tú.** Si hace falta ver algo en el navegador, dale
al usuario el comando (`pnpm dev`) y espera a que lo arranque.

Antes de dar por terminado un cambio: `pnpm lint && pnpm typecheck && pnpm test`.
Los tres tienen que pasar, incluso si lo que falla venía roto de antes.

## Reglas del proyecto

- **Comentarios y textos en español**, sin acentos en los comentarios de código
  (el resto del repositorio ya es así). Los textos de interfaz sí llevan acentos.
- **Los comentarios explican por qué, no qué.** El estilo del repositorio es
  contar la decisión y su consecuencia. Si un comentario solo repite el código,
  sobra.
- **Nada de consultas duplicadas.** Si la lógica la usan las dos apps, va en
  `packages/core`. Prisma se consulta desde componentes de servidor o Server
  Actions, nunca desde el cliente.
- **Toda escritura se valida con Zod en el servidor** (`packages/core/src/schemas.ts`),
  aunque el formulario ya haya validado. Los mensajes de error explican qué hacer,
  no qué falló: quien usa el panel no es técnico.
- **En el panel, ningún color literal.** Solo tokens semánticos de
  `apps/admin/src/app/globals.css` (`primary`, `destructive`, `warning`,
  `success`, `photo`). Un `bg-white` suelto rompe el modo oscuro.
- **Un campo que quien captura no necesita decidir no va en la pantalla.** El
  slug, el meta título, la marca y el stock se resuelven en el servidor.
- **El slug se congela al publicar.** Cambiarlo después rompe enlaces vivos e
  indexación. La regla vive en `apps/admin/src/app/productos/[id]/actions.ts` y
  tiene pruebas.
- **Cada ruta del panel lleva su `loading.tsx`** con un esqueleto que calca su
  layout (piezas comunes en `apps/admin/src/components/skeletons.tsx`). Si creas
  una pantalla y no le pones el suyo, hereda el del segmento de arriba y el
  usuario ve dibujarse otra pantalla antes de la que pidió.
- Los componentes de `apps/admin/src/components/ui/` se copian del registro de
  shadcn. No los "arregles": se pierden en la siguiente actualización. Las
  variantes propias añadidas a mano son `warning`/`success` en `alert` y `badge`,
  más `native-select`.

## Trampas conocidas

- **Un solo `.env` en la raíz.** Cada app y `packages/db` lo alcanzan por symlink.
  No crees `.env` por paquete.
- **`packages/db/prisma.config.ts` desactiva la carga automática de `.env`** por
  parte del CLI de Prisma. Por eso empieza con `import 'dotenv/config'`. Si lo
  quitas, `prisma migrate` se queda sin `DATABASE_URL` y el error no menciona el
  `.env`.
- **Las pruebas consultan la base real**, así que `test` corre con `cache: false`
  en `turbo.json`. Si las cacheas, un acierto de caché es una prueba que no se
  ejecutó.
- **Las imágenes tienen dos almacenamientos** (disco local o Vercel Blob) según
  haya `BLOB_READ_WRITE_TOKEN`. Las locales solo existen en la máquina que
  importó: en un despliegue esas URLs no resuelven.
- **El panel va detrás de HTTP Basic** (`ADMIN_PASSWORD`). Sin la variable queda
  abierto en local y responde 503 en producción, nunca abierto.
- **Tailwind v4 se configura en CSS**, no en `tailwind.config.ts`. Los tokens
  viven en el `@theme` de cada `globals.css`. Un preset de JavaScript no lo
  aplicaría nadie (había uno y por eso se borró).

## Skills: cuál usar y cuándo

Están instaladas en `.claude/skills/`. Antes de escribir código de estas áreas,
carga la skill correspondiente en lugar de tirar de memoria.

| Vas a tocar | Skill |
| --- | --- |
| Rutas, layouts, Server Actions, metadata, `next/image`, streaming | `next-best-practices` |
| PPR, `use cache`, `cacheTag`, `cacheLife` | `next-cache-components` |
| Subir de versión Next | `next-upgrade` |
| Memoización, límites cliente/servidor, rendimiento de React | `react-best-practices` |
| Componentes con demasiadas props booleanas, APIs reutilizables | `composition-patterns` |
| Añadir o depurar componentes de shadcn en el panel | `shadcn` |
| Utilidades de Tailwind, layout responsivo | `tailwind-css-patterns` |
| Variables CSS, modo oscuro, temas rotos | `tailwind-v4-shadcn` |
| Diseño de pantallas nuevas de la tienda pública | `frontend-design` |
| Teclado, lectores de pantalla, contraste, foco | `accessibility` |
| Metadatos, sitemap, robots, datos estructurados, canónicas | `seo` |
| Consultas, filtros, transacciones de Prisma | `prisma-client-api` |
| `migrate`, `generate`, `db push`, seed, `prisma.config.ts` | `prisma-cli` |
| Conexión a Postgres, cambio de proveedor | `prisma-database-setup` / `prisma-postgres` |
| Esquemas de validación, `safeParse`, `z.infer` | `zod` |
| `turbo.json`, tareas, caché, filtros, CI | `turborepo` |
| Genéricos, tipos condicionales, utilidades de tipos | `typescript-advanced-types` |
| Scripts e importadores de Node fuera de Next | `nodejs-best-practices` / `nodejs-backend-patterns` |

Reglas de las skills que ya están aplicadas y conviene no deshacer:

- La tienda usa `next/image` con `sizes` y `priority` en la primera fila, nunca
  `<img>`. Las medidas están en la base para que no salte la página al cargar.
- Navegación interna con `next/link`, no `<a href>`: sin él no hay precarga.
- `robots.ts` y `sitemap.ts` salen de la base y solo listan lo publicado.
- El panel declara `robots: { index: false }`. Nunca debe indexarse.
- `turbo.json`: `lint` no depende de nada, `typecheck` y `test` dependen de
  `^generate` (necesitan el cliente de Prisma).

## Pendiente conocido

- Zod está en 3.25; la skill documenta la 4. Migrar implica revisar
  `z.ZodIssueCode.custom` y el comportamiento de `.default()` en los transforms
  de `schemas.ts`.
- La tipografía de display de la tienda es la pila del sistema (Georgia). Es una
  decisión de marca pendiente, no un olvido.
- Tienda pública: ficha de producto, categorías, contenido, prospectos.
