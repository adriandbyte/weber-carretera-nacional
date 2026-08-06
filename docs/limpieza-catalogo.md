# Guía para dejar el catálogo listo

Esta guía es para quien va a revisar los 331 productos en el panel de
administración. No hace falta saber nada técnico: todo lo que se pide aquí se
escribe en español y se guarda con un botón.

---

## Por qué hay que hacer esto

Los 331 productos se cargaron automáticamente desde el Excel de inventario. Ese
archivo sirve para el almacén, no para vender en línea, así que los productos
llegaron con el nombre interno de Weber y sin nada más:

```
GENESIS E-315 LP BLK US/CA
SUMMIT SB38 S SS LP US/CA/MX
GENESIS 300 SERIES PREM GRILL CVR AMER
RUST RESISTANT GRIDDLE FT G28 BLK US/CA
```

Esos códigos son notación de almacén. `LP` es gas LP, `SS` es acero inoxidable,
`BLK` es negro, `CVR` es funda y `US/CA/MX` es la región de distribución.

Nadie escribe eso en Google. Y quien llegara a la página no entendería qué está
viendo. **Reescribir esos nombres y sus descripciones es el trabajo que hace que
la página aparezca en las búsquedas por encima de la competencia.**

---

## Qué significa que un producto esté "limpio"

Un producto cuenta como listo cuando tiene las tres cosas:

| | Qué es | Dónde se llena |
| --- | --- | --- |
| **1. Nombre en español** | Cómo se lo dirías a alguien en mostrador | Contenido → Nombre |
| **2. Descripción** | Qué es, para quién y qué incluye | Contenido → Descripción corta y completa |
| **3. Imagen** | Al menos una foto | Sección Imágenes, arriba |

Y además, que esté **desmarcada la casilla "Sigue pendiente de revisión"**, que
es la forma de decir "yo ya revisé este".

El panel lleva la cuenta solo. En **Resumen** aparece una barra de avance que
sube conforme se completan productos, y tres tarjetas que llevan directo a lo
que falta.

> **Los precios no son parte de esto.** Llegan después con la lista del
> proveedor y se cargan de golpe. Si el campo de precio está vacío, está bien.

---

## Los campos, uno por uno

### Nombre

Es lo más importante de todo. Es el título que ve el cliente y lo que Google
usa para decidir si la página aparece en una búsqueda.

**La fórmula que funciona:**

```
Tipo + Marca + Serie + Modelo + lo que lo distingue
```

Ejemplos, del nombre que llegó al nombre que debe quedar:

| Como llegó | Como debe quedar |
| --- | --- |
| `GENESIS E-315 LP BLK US/CA` | Asador de Gas Weber Genesis E-315, 3 Quemadores, Negro |
| `SUMMIT SB38 S SS LP US/CA/MX` | Asador Empotrable Weber Summit SB38, Acero Inoxidable |
| `GENESIS 300 SERIES PREM GRILL CVR AMER` | Funda Premium Weber para Asador Genesis Serie 300 |
| `RUST RESISTANT GRIDDLE FT G28 BLK US/CA` | Plancha de Gas Weber 28", Antioxidante, Negra |

**Qué quitar siempre:** códigos de región (`US/CA/MX`, `AMER`), abreviaturas de
almacén (`LP`, `SS`, `BLK`, `CVR`, `PREM`, `FT`) y las mayúsculas completas.

**Qué conservar siempre:** el modelo (`E-315`, `SB38`, `Q2800`). Es lo que la
gente busca cuando ya sabe qué quiere.

### Descripción corta

Una o dos frases. Es lo que se ve debajo del producto en las listas y lo que
Google muestra como resumen en los resultados.

> Asador de gas de 3 quemadores con sistema de cocción GS4 y parrillas de
> hierro esmaltado. Ideal para 4 a 6 personas.

Que responda: **qué es, para cuántas personas y qué lo hace distinto.**

### Descripción completa

El texto largo de la ficha. Sin límite de formato, pero conviene cubrir:

- Medidas y superficie de cocción
- Materiales (parrillas, tapa, base)
- Qué incluye en la caja
- Para cuántas personas alcanza
- Garantía

Si Weber publica la ficha oficial de ese modelo, se puede tomar de ahí como
base y reescribirla con palabras propias. **Copiarla literal es
contraproducente:** Google detecta el texto duplicado y prefiere mostrar la
página original antes que la copia.

### Clasificación (los menús desplegables)

Definen en qué filtros aparece el producto. La mayoría ya vienen llenos desde
la importación; solo hay que verificar que sean correctos.

- **Tipo de producto**: asador, ahumador, plancha, accesorio, combustible…
- **Combustible**: carbón, gas, eléctrico, pellet. Los accesorios no llevan.
- **Serie**: Spirit, Genesis, Summit, Q, Traveler, Master-Touch…
- **Formato**: portátil, empotrable, de carro
- **Color** y **Tamaño**: solo en asadores, ahumadores y planchas
- **Categorías del menú**: en qué secciones de la tienda aparece. Se puede
  marcar más de una (un Traveler es Gas *y* Portátil)
- **Compatible con**: solo aparece en accesorios. Con qué asadores sirve

Si falta una opción en cualquiera de esos menús, se agrega en la sección
**Catálogos** y aparece de inmediato.

### Imágenes

Se sube arrastrando el archivo o con el botón. La primera imagen es la portada,
y se puede cambiar con "Usar de portada".

322 productos ya traen su foto del Excel. **18 no traen ninguna** y hay que
conseguirla antes de poder publicarlos.

---

## Qué NO hay que llenar

Estos campos existen pero se resuelven solos. Ni siquiera aparecen en pantalla:

| | Por qué |
| --- | --- |
| Dirección web (URL) | Se genera del nombre. Al publicar el producto queda fija para no romper enlaces ni perder posición en Google |
| Título y resumen para buscadores | Se toman del nombre y la descripción corta |
| Marca | Todo el catálogo es Weber |
| Existencias | El inventario se maneja después |
| Precio | Llega con la lista del proveedor |

---

## Cómo trabajar: el orden recomendado

Hacerlo por tandas del mismo tipo rinde mucho más que ir producto por producto
en desorden, porque los productos de una misma serie comparten casi toda la
descripción.

### Paso 1 · Los asadores de gas (29 productos)

Son los de mayor venta y los que más se buscan. Filtrar por **Gas** y empezar
por las series completas: primero todos los Spirit, luego todos los Genesis,
luego los Summit. Al escribir el segundo Spirit, la descripción del primero
sirve de base.

### Paso 2 · Los asadores de carbón (38 productos)

Mismo método: Original Kettle, Master-Touch, Performer, Smokey Joe.

### Paso 3 · Eléctricos y planchas (12 productos)

Pocos y rápidos.

### Paso 4 · Los accesorios (251 productos)

Son los más numerosos pero también los más sencillos: una funda no necesita
media página de descripción. Lo importante aquí es **marcar bien "Compatible
con"**, porque es lo que permite que el cliente encuentre el accesorio correcto
para su asador.

### Paso 5 · Los 18 sin imagen

Se dejan para el final porque dependen de conseguir la foto.

---

## Casos que se van a encontrar

**Un producto que Weber ya no vende.** Cambiar el estado a *Descontinuado*.
No se borra: sirve para el historial.

**Dos productos que parecen idénticos.** Suele ser el mismo modelo en dos
medidas o dos colores. Son productos distintos y ambos se venden; hay que
diferenciarlos en el nombre.

**Un paquete o bundle.** El nombre debe decir qué trae:
*Paquete Asador Genesis E-315 + Set de Herramientas*.

**Una opción que falta en un menú.** Se agrega en **Catálogos** y aparece de
inmediato en todas las fichas.

**Un valor mal escrito en un menú.** Se corrige en **Catálogos** y el cambio
alcanza a todos los productos que lo usan.

---

## Lista de verificación por producto

Antes de desmarcar "Sigue pendiente de revisión":

- [ ] El nombre está en español, sin códigos de almacén ni mayúsculas completas
- [ ] El nombre incluye el modelo (E-315, SB38, Q2800…)
- [ ] Si hay varias versiones del mismo modelo, el nombre dice cuál es (color o medida)
- [ ] Hay descripción corta de una o dos frases
- [ ] Hay descripción completa con medidas y materiales
- [ ] Hay al menos una imagen y la portada es la correcta
- [ ] Los menús de clasificación son correctos
- [ ] Está marcada al menos una categoría del menú
- [ ] Si es accesorio, está marcado con qué asadores es compatible

---

## Cómo saber que se terminó

En **Resumen**, la barra de avance llega a **100%** y las tres tarjetas de
pendientes quedan en cero.

A partir de ahí solo faltan los precios para poder publicar la tienda.
