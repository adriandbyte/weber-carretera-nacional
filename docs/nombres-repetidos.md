# Siete nombres que quedaron repetidos

**15 productos, 7 nombres.** Cada nombre lo comparten dos SKU distintos, y en
un caso tres.

Este documento tiene **una sola pregunta**, repetida siete veces. Contestarla
toma unos diez minutos.

Es la continuación de la pregunta 6 del cuestionario anterior. Ahí eran cinco
pares; al aplicar a todo el catálogo el criterio que aprobaron aparecieron **dos
más**, así que ahora son siete.

Con los nombres ya redactados y los precios cargados, esto es lo único que
puede hacer que la tienda se vea mal el día que se publique. Lo demás que
seguimos esperando de ustedes -qué significan `FT` y `CS`, y si los paquetes de
la Grill Academy se venden en línea- afecta a productos concretos; esto afecta
a cómo se ve la lista.

---

## Por qué importa

Cada uno de estos siete grupos son dos (o tres) productos distintos en el
inventario, con SKU distinto, que acabaron con **exactamente el mismo nombre**.
En la tienda se verían así:

```
┌─────────────────────────────────────────────┐
│  [foto]  Encendedor de Carbón      $699.00  │
│          Agregar al carrito                 │
├─────────────────────────────────────────────┤
│  [foto]  Encendedor de Carbón      $499.00  │
│          Agregar al carrito                 │
└─────────────────────────────────────────────┘
```

Dos renglones iguales, con dos precios. Quien entra no sabe cuál comprar, y
quien compra el de $699 se pregunta por qué pagó $200 más. No es un problema de
programación: los dos productos existen en su inventario y los dos tienen
precio en la lista 2026.

**Esto no se ve desde la ficha de un producto.** Solo aparece cuando los dos
están uno debajo del otro, así que conviene resolverlo antes de publicar y no
después.

---

# Bloque A · Los tres que comparten la misma foto

En estos tres, la foto que venía en el Excel del inventario es **idéntica en los
dos SKU, byte por byte**. Es la señal más fuerte que tenemos de que se trata del
mismo producto cargado dos veces: quien armó el archivo usó la misma imagen.

En dos de los tres el precio también coincide o casi, y ahí la duda es mínima.
En el tercero no cuadra, y por eso lo preguntamos igual.

> Un dato que aplica a los siete grupos: **los quince SKU están en la lista de
> precios 2026**, cada uno con su propio precio. Así que la lista no nos dice
> cuál está vigente. Si uno ya no se vende, solo ustedes lo saben.

## 1 · Asador de Gas Weber Genesis S-435, Acero Inoxidable

| SKU | Precio 2026 | Cómo viene en el inventario y en la lista |
| --- | ---: | --- |
| `36400001` | $47,999 | `GENESIS S-435 LP SS ( Tahilandia)` |
| `36400043` | $54,900 | `GENESIS S-435 LP SS MX` |

Este es uno de los dos nuevos. Ustedes ya nos dijeron que "Tailandia" se quita
del nombre; al quitarlo, los dos quedaron llamándose igual. La foto es la misma,
pero el precio no: **$6,901 de diferencia** por el mismo asador.

Si de verdad son el mismo modelo con dos orígenes de fabricación, en la tienda
tiene que quedar uno solo: nadie va a elegir el de $54,900 teniendo el de
$47,999 al lado, y tener los dos publicados es regalar el margen.

**Su respuesta:**

- [ ] Es el mismo. Se queda `______` y archivamos el otro
- [ ] Son distintos y se diferencian en `__________________________________`

## 2 · Asador Portátil de Gas Weber Traveler Compact

| SKU | Precio 2026 | Cómo viene en el inventario y en la lista |
| --- | ---: | --- |
| `1500460` | $7,999 | `ASADOR WEBER TRAVELER® COMPACT PORTABLE` |
| `1501741` | $7,999 | `ASADOR WEBER TRAVELER® COMPACT PORTABLE` |

Este es el caso más claro de los siete: **mismo nombre, mismo precio, misma
foto**, y en la lista de precios aparecen los dos con el texto idéntico. Lo
único que cambia entre ellos es cómo quedó escrita la categoría en el Excel del
inventario. `1501741` es además el que forma parte de uno de los paquetes de la
Grill Academy.

> **Nuestra propuesta ✅** Nos quedamos con `1501741` y archivamos `1500460`.

**Su respuesta:**

- [ ] ✅ De acuerdo
- [ ] No: son productos distintos y se diferencian en `__________________`

## 3 · Encendedor de Carbón

| SKU | Precio 2026 |
| --- | ---: |
| `7416` | $699 |
| `7447` | $499 |

Aquí la foto es la misma, pero hay **$200 de diferencia**. Sospechamos que sí
son dos encendedores distintos (uno de chimenea y uno eléctrico, por ejemplo) y
que la foto repetida es un descuido del Excel. Los dos se usan dentro de los
paquetes de la Grill Academy, así que ninguno parece descontinuado: `7416` va en
uno y `7447` en dos.

**Su respuesta:**

- [ ] Son distintos. `7416` es `__________________` y `7447` es `__________________`
- [ ] Es el mismo. Nos quedamos con `______` y archivamos el otro

---

# Bloque B · Los cuatro con fotos distintas

Aquí las fotos del inventario son diferentes entre sí, así que es más probable
que sean productos distintos que quedaron mal nombrados desde el sistema. Para
estos sí necesitamos que nos digan qué los separa.

La pregunta es la misma en los cuatro: **¿qué los diferencia, o cuál ya no se
vende?** Puede ser color, medida, presentación, generación del producto o que
uno esté descontinuado.

## 4 · Abrillantador Weber para Acero Inoxidable 12 oz

Este es el otro nuevo, y son **tres**, no dos:

| SKU | Precio 2026 | Cómo viene en el inventario y en la lista |
| --- | ---: | --- |
| `6271` | $599 | `WEBER STAINLESS POLISH 12OZ` |
| `8029` | $499 | `STAINLESS STEEL POLISH 12OZ` |
| `8039` | $549 | `WEBER STAINLESS STEEL POLISH 12OZ` |

Los tres dicen lo mismo con distintas palabras y los tres son de 12 oz. Es el
grupo que peor se vería en la tienda: tres renglones iguales con tres precios.

**Su respuesta:**

- [ ] Son el mismo. Nos quedamos con `______` y archivamos los otros dos
- [ ] Son distintos: `______________________________________________`

## 5 · Asador de Carbón Weber Master-Touch 26"

| SKU | Precio 2026 | Cómo viene en el inventario y en la lista |
| --- | ---: | --- |
| `1500064` | $13,999 | `Master-Touch Charcoal Grill 26”` |
| `1500065` | $14,499 | `Master-Touch Charcoal Grill 26”` |

Los dos llegaron con ese nombre, palabra por palabra, tanto en el inventario
como en la lista de precios. Las fotos y los precios son distintos, así que algo
los diferencia: nos suena a color o a que uno trae el sistema GBS, pero no hay
ninguna columna que lo diga.

**Su respuesta:**

- [ ] Se diferencian en `______________________________________________`
- [ ] Uno ya no se vende: archivar `______`

## 6 · Juego Portátil de Herramientas 2 Piezas Premium

| SKU | Precio 2026 |
| --- | ---: |
| `3400213` | $1,099 |
| `6645` | $899 |

**Su respuesta:**

- [ ] Se diferencian en `______________________________________________`
- [ ] Uno ya no se vende: archivar `______`

## 7 · Set Pinzas & Espatula Precision Para Asador

| SKU | Precio 2026 |
| --- | ---: |
| `3401326` | $539 |
| `6771` | $999 |

Aquí el precio casi se duplica, así que seguramente no son la misma cosa.
`6771` es además el que va dentro de tres de los paquetes de la Grill Academy, y
`3401326` no está en ninguno.

**Su respuesta:**

- [ ] Se diferencian en `______________________________________________`
- [ ] Uno ya no se vende: archivar `______`

---

# Qué pasa cuando nos contesten

1. A los que sean el mismo producto les dejamos un solo SKU activo y el otro
   queda **archivado**: sale de la tienda pero no se borra, así que si mañana
   resulta que sí se vende, se reactiva con un clic y conserva su historial.
2. A los que sean distintos les ponemos el nombre completo, con lo que los
   separa: `Asador de Carbón Weber Master-Touch 26", Negro` y
   `… 26", Verde`, por ejemplo. Ahí dejan de ser indistinguibles.
3. Les mandamos la lista con el resultado para que la vean.

Nada se archiva ni se publica sin que ustedes lo aprueben antes. Todo el
catálogo sigue en borrador.

Cualquier duda con este documento nos dicen y lo vemos por teléfono.
