# Scripts de la base

Cinco scripts, y ninguno es de una sola vez: **son la definición reproducible
del catálogo**. Todo lo que decidió el cliente vive aquí en forma de reglas, no
de datos, así que una base vacía se vuelve el catálogo completo corriéndolos en
orden, sin volver a preguntarle nada a nadie.

Se corren a mano con `tsx`. No entran en el build de Next ni en el bundle de
ninguna app: no le cuestan nada a lo que está desplegado.

## En qué orden

```bash
pnpm db:migrate                   # crea las tablas
pnpm import:inventario            # 331 productos, atributos e imágenes
pnpm import:precios -- --crear    # precios, y da de alta los que solo están en la lista
pnpm db:nombres -- --aplicar      # nombres, descripción corta y avisos de revisión
```

El orden de los dos últimos no es negociable: `import:inventario` deja el aviso
de "nombre en mayúsculas" tal como viene del Excel y `db:nombres` es quien lo
limpia. Al revés quedan más de cien productos marcados sin motivo.

`seed.ts` lo llama el importador solo, así que no hace falta correrlo aparte;
existe suelto (`pnpm db:seed`) para sembrar los catálogos -categorías, series,
colores, tamaños- en una base recién creada. Sin ellos la ficha de producto
abre con los desplegables vacíos.

## Qué hace cada uno

| Script | Qué hace | Cuándo se corre |
| --- | --- | --- |
| `seed.ts` | siembra los catálogos del menú y de la ficha | base nueva |
| `import-inventario.ts` | productos, atributos e imágenes del Excel de Weber | cada inventario nuevo |
| `import-precios.ts` | precios de la lista, y `--crear` da de alta lo que falte | cada lista de precios |
| `generar-nombres.ts` | los nombres comerciales, la descripción corta y las URLs | al cambiar una regla de nombres |

## Dónde vive el criterio del cliente

Esto es lo que hace que borrar estos scripts sea perder información y no
limpiar código. Si desaparecen, el catálogo existe únicamente dentro de la base
de producción.

| Archivo | Qué guarda |
| --- | --- |
| `lib/normalize.ts` | qué SKU se archivan y por qué, los colores dictados por SKU, qué es paquete y qué material de mostrador |
| `lib/nombres.ts` | la plantilla del nombre, el diccionario de frases, los colores aprobados y los nombres que dictó el cliente para desempatar repetidos |
| `import-precios.ts` | los precios que dio de palabra y que su lista no trae |
| `lib/excel.ts` | las erratas del archivo de origen, corregidas al leer |

Cada entrada lleva la fecha y el motivo en un comentario. Cuando el cliente
cambie de opinión, se cambia la regla y se vuelve a correr; **nunca se edita la
base a mano**, porque eso convierte su decisión en un dato que nadie puede
volver a explicar.

## Todos son idempotentes

Correrlos dos veces seguidas no cambia nada, y la segunda pasada lo dice:
`0 creados`, `0 productos tocados`, `0 imagenes nuevas`. Es a propósito, y es lo
que permite reimportar sin miedo cuando llega un inventario corregido.

Lo que un reimporte **no** pisa: el nombre, el precio, la descripción y el
stock, porque son trabajo que se hizo en el panel. El estado sí se refresca,
salvo que el producto ya esté publicado.
