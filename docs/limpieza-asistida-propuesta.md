# Limpieza del catálogo: propuesta para hacerla nosotros

Documento para la reunión con el cliente. Explica en qué estado está el
catálogo, qué se puede automatizar, qué decisiones necesitamos de él para
poder hacerlo, y qué queda inevitablemente manual.

La guía [limpieza-catalogo.md](./limpieza-catalogo.md) sigue siendo válida: es
el manual de quien captura a mano. Este documento propone reducir a la mínima
expresión ese trabajo manual.

---

## En una frase

> Hoy la limpieza son **331 fichas a llenar una por una**. Con cuatro
> decisiones tomadas en esta reunión, podemos convertir la mayor parte en
> **una tabla que el cliente aprueba de una sentada**.

---

## 1. Dónde estamos hoy

331 productos importados del Excel de inventario. Ninguno publicado.

| | Productos | |
| --- | ---: | --- |
| Con tipo de producto asignado | 331 / 331 | ✅ listo |
| Con categoría de menú asignada | 331 / 331 | ✅ listo |
| Con al menos una imagen | 309 / 331 | 🟡 faltan 22 |
| **Con nombre redactado para vender** | **218 / 331** | 🔴 **faltan 113** |
| Con descripción corta | 0 / 331 | 🔴 faltan 331 |
| Con descripción completa | 0 / 331 | 🔴 faltan 331 |
| Con precio | 0 / 331 | 🔴 faltan 331 |

Reparto por tipo: 70 asadores, 5 ahumadores, 4 planchas, 22 combustibles,
9 sazonadores, 10 paquetes y **211 accesorios**.

> **La cifra que manda la reunión:** los accesorios son dos tercios del
> catálogo. Cualquier decisión que se tome hay que tomarla pensando en que se
> va a aplicar 211 veces.

---

## 2. El problema del nombre, en imágenes

Los 113 nombres pendientes llegaron en notación de almacén:

```
GENESIS E-315 LP BLK US/CA
SUMMIT SB38 S SS LP US/CA/MX
22IN ORIG KETTLE STEALTH US/CA/MX
Q1200N MDNT BLK USA/CA/MX
RUST RESISTANT GRIDDLE FT G28 BLK US/CA
```

`LP` es gas LP · `SS` acero inoxidable · `BLK` negro · `CVR` funda ·
`PREM` premium · `MDNT` midnight · `US/CA/MX` la región de distribución.

### Por qué no es solo cosmético: el nombre es la dirección

La dirección de cada producto (el **slug**) **se calcula a partir del nombre**
y **queda congelada al publicar**, porque cambiarla después rompe los enlaces
que ya circulan y la posición ganada en Google.

```
CON EL NOMBRE DE ALMACÉN
   webercarreteranacional.com/productos/22in-orig-kettle-stealth-us-ca-mx
   webercarreteranacional.com/productos/genesis-e-315-lp-blk-us-ca
   webercarreteranacional.com/productos/q1200n-mdnt-blk-usa-ca-mx

CON EL NOMBRE REDACTADO
   webercarreteranacional.com/productos/asador-carbon-original-kettle-22-negro
   webercarreteranacional.com/productos/asador-gas-genesis-e-315-negro
   webercarreteranacional.com/productos/asador-portatil-q1200-gas-negro
```

Tres consecuencias que conviene decir en voz alta:

1. **Es lo que se comparte.** Ese texto es el que se pega en WhatsApp, en
   Facebook o en una cotización. `lp-blk-us-ca` no genera confianza.
2. **Google lo lee.** Las palabras de la dirección son señal de búsqueda.
   "asador-carbon-22" compite por búsquedas reales; "22in-orig-kettle" no.
3. **Es de una sola vez.** Por eso esta conversación toca tenerla ahora y no
   después de publicar.

> **Para enseñarlo en vivo en la reunión:** abrir cualquier ficha del panel. Bajo
> el campo *Nombre* hay una línea que dice **"Dirección en la tienda:
> /productos/…"** y **cambia mientras se escribe**. Escribir el nombre bueno
> delante del cliente vale más que esta página entera.

### El caso de los nombres repetidos

Cinco pares de productos distintos comparten nombre exacto. Como el nombre
genera la dirección, el sistema desempata pegando el SKU al final:

```
/productos/master-touch-charcoal-grill-26           ← SKU 1500064
/productos/master-touch-charcoal-grill-26-1500065   ← SKU 1500065
```

En la tienda son dos tarjetas idénticas y el cliente no puede saber cuál es
cuál. **Este punto no se puede automatizar: solo Weber sabe en qué se
diferencian.**

| Nombre repetido | SKUs |
| --- | --- |
| Master-Touch Charcoal Grill 26” | 1500064 · 1500065 |
| ASADOR WEBER TRAVELER® COMPACT Portatil | 1500460 · 1501741 |
| Juego Portátil de Herramientas 2 Piezas Premium | 3400213 · 6645 |
| Set Pinzas & Espatula Precision Para Asador | 3401326 · 6771 |
| Encendedor de Carbón | 7416 · 7447 |

---

## 3. Los dos caminos

| | **A · Manual** (lo previsto hoy) | **B · Asistida** (lo que proponemos) |
| --- | --- | --- |
| Qué hace el cliente | Abre y llena 331 fichas | Aprueba una tabla de 331 filas |
| Qué hacemos nosotros | Damos soporte | Generamos las propuestas con un script |
| Nombres | 113 a reescribir a mano | Generados; él corrige los que no le gusten |
| Medida y color | A elegir menú por menú | Extraídos del propio nombre |
| Descripciones | 331 a redactar | Borradores generados desde la ficha oficial |
| Riesgo | Se abandona a la mitad | Una tanda mala se regenera y se vuelve a correr |
| Si cambia de opinión | Rehacer a mano | Se corrige la regla y se vuelve a correr |

En orden de magnitud: 331 fichas a unos 5 minutos cada una son **más de 27
horas de captura**. Revisar una tabla ya propuesta es de otra escala.

**El camino B no elimina el criterio del cliente: lo concentra.** En vez de
tomar la misma decisión 211 veces, la toma una vez y nosotros la aplicamos 211
veces.

---

## 4. Cómo funcionaría el camino B

```
   ┌────────────────────────────────────────────────────────────┐
   │ 1 · REUNIÓN          Se responden las decisiones de la §5  │
   └───────────────────────────────┬────────────────────────────┘
                                   ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 2 · NOSOTROS         Script sobre los 331 productos:       │
   │                      nombres, medidas, colores, series     │
   │                      → sale una tabla "antes → después"    │
   └───────────────────────────────┬────────────────────────────┘
                                   ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 3 · CLIENTE          Revisa la tabla y corrige lo que no   │
   │                      le guste. No entra al panel.          │
   └───────────────────────────────┬────────────────────────────┘
                                   ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 4 · NOSOTROS         Se aplica a la base. Todo queda en    │
   │                      borrador: nada sale a la tienda aún.  │
   └───────────────────────────────┬────────────────────────────┘
                                   ▼
   ┌────────────────────────────────────────────────────────────┐
   │ 5 · REVISIÓN FINAL   Solo se tocan a mano las excepciones  │
   │                      y lo que no se puede generar.         │
   └────────────────────────────────────────────────────────────┘
```

Es un script en `packages/db/scripts/`, no trabajo manual: **repetible,
revisable y reversible**. Si en el paso 3 el cliente dice "los accesorios
mejor sin la palabra Weber", se cambia una línea y se vuelven a generar los
211.

### Así se vería la tabla del paso 2

Ejemplos reales de la base, con la propuesta que saldría del script:

| SKU | Como llegó | Propuesta | Dirección resultante |
| --- | --- | --- | --- |
| 1501278 | `22IN ORIG KETTLE STEALTH US/CA/MX` | Asador de Carbón Weber Original Kettle 22", Stealth | `/productos/asador-de-carbon-weber-original-kettle-22-stealth` |
| 1500010 | `GENESIS E-315 LP BLK US/CA` | Asador de Gas Weber Genesis E-315, Negro | `/productos/asador-de-gas-weber-genesis-e-315-negro` |
| 1500042 | `SUMMIT SB38 S SS LP US/CA/MX` | Asador Empotrable de Gas Weber Summit SB38, Acero Inoxidable | `/productos/asador-empotrable-de-gas-weber-summit-sb38-acero-inoxidable` |
| 1502198 | `Q1200N MDNT BLK USA/CA/MX` | Asador Portátil de Gas Weber Q1200, Negro | `/productos/asador-portatil-de-gas-weber-q1200-negro` |
| 14505601 | `22" MASTER TOUCH GBS IVORY CA` | Asador de Carbón Weber Master-Touch 22", Ivory | `/productos/asador-de-carbon-weber-master-touch-22-ivory` |
| 1500121 | `SEARWOOD™ 34" XL 600 PELLET GRILL` | Ahumador de Pellets Weber Searwood XL 600, 34" | `/productos/ahumador-de-pellets-weber-searwood-xl-600-34` |
| 1501005 | `RUST RESISTANT GRIDDLE FT G28 BLK US/CA` | Plancha de Gas Weber G28 Antioxidante, Negra | `/productos/plancha-de-gas-weber-g28-antioxidante-negra` |
| 9010001 | `WEBER TRAVELER LP BLK` | Asador Portátil de Gas Weber Traveler, Negro | `/productos/asador-portatil-de-gas-weber-traveler-negro` |
| 7770 | `TRAVELER FUNDA` | Funda Weber para Asador Traveler | `/productos/funda-weber-para-asador-traveler` |
| 7034 | `TRAVELER PLANCHA` | Plancha Weber para Asador Traveler | `/productos/plancha-weber-para-asador-traveler` |

**Estas propuestas no son magia:** salen de aplicar la plantilla de la §5.1 con
el diccionario de la §5.2. Por eso necesitamos esas dos respuestas antes de
generar nada.

---

## 5. Lo que necesitamos decidir en la reunión

Cada punto trae ya nuestra recomendación. Lo ideal es salir con todas
palomeadas o corregidas.

### 5.1 · La plantilla del nombre

> **Propuesta:** `Tipo + de + Combustible + Weber + Serie + Modelo + Medida + Color`
>
> → *Asador de Gas Weber Genesis E-315, Negro*
> → *Asador de Carbón Weber Original Kettle 22", Stealth*

- [ ] Se aprueba tal cual
- [ ] Se aprueba con cambios: ______________________________

Y para accesorios, que son 211 y no llevan combustible ni serie propia:

> **Propuesta:** `Qué es + Weber + para + con qué sirve`
> → *Funda Weber para Asador Traveler*

- [ ] Se aprueba tal cual
- [ ] Se aprueba con cambios: ______________________________

### 5.2 · El diccionario de abreviaturas

Lo que ya damos por sabido:

| Código | Significa | | Código | Significa |
| --- | --- | --- | --- | --- |
| `LP` | Gas LP | | `BLK` | Negro |
| `NG` | Gas natural | | `SS` | Acero inoxidable |
| `CVR` | Funda | | `PREM` | Premium |

**Lo que necesitamos que nos confirme Weber**, porque aquí ya estaríamos
adivinando:

| Código | ¿Qué significa? |
| --- | --- |
| `GBS` | ☐ Gourmet BBQ System ☐ otro: __________ |
| `MDNT` | ☐ Midnight (color) ☐ otro: __________ |
| `FT` | __________ |
| `GC38` / `SB38` / `FS38` | ¿modelo, o modelo + configuración? __________ |

### 5.3 · Qué se quita y qué se conserva

| Decisión | Recomendación | ¿Aprueba? |
| --- | --- | --- |
| Códigos de región (`US/CA/MX`, `AMER`) | **Quitar siempre.** Es logística, no producto | ☐ sí ☐ no |
| El modelo (`E-315`, `SB38`, `Q1200`) | **Conservar siempre.** Es lo que la gente busca | ☐ sí ☐ no |
| Mayúsculas completas | **Quitar.** Solo capitalización normal | ☐ sí ☐ no |
| Símbolos `®` y `™` | **Quitar del nombre.** Ensucian la dirección | ☐ sí ☐ no |

### 5.4 · Inglés: qué se traduce y qué es marca

| Se traduce (descriptivo) | Se conserva (nombre de línea Weber) |
| --- | --- |
| Charcoal Grill → Asador de Carbón | Original Kettle |
| Pellet Grill → Ahumador de Pellets | Master-Touch |
| Griddle → Plancha | Smokey Mountain · Smokey Joe |
| Rust-Resistant → Antioxidante | Traveler · Searwood · Slate |
| Portable → Portátil | Genesis · Spirit · Summit · Q |

- [ ] Se aprueba este reparto
- [ ] Correcciones: ______________________________

### 5.5 · Los cinco nombres repetidos

**Sin respuesta aquí no se puede cerrar el catálogo.** Ver la tabla de la §2.
Para cada par: ¿en qué se diferencian - medida, color, año, contenido de la
caja?

### 5.6 · Extraer medida y color del nombre

Hoy solo 5 de los 113 tienen medida y 26 tienen color, pero **el dato está
escrito dentro del nombre** (`22IN`, `26”`, `30"`, `STEALTH`, `IVORY`, `BLK`).

> **Propuesta:** extraerlos automáticamente y llenar con ellos los menús de
> Tamaño y Color.

Importa más de lo que parece: esos dos campos son **los filtros de la tienda**.
Sin ellos, el cliente no puede buscar "asadores de 22 pulgadas".

- [ ] Adelante ☐ Preferimos revisarlos uno por uno

### 5.7 · Descripciones: la fuente

Es el bloque más grande (331 + 331) y el único que no se puede deducir del
Excel. La pregunta decisiva:

> **¿Existe el catálogo oficial de Weber México, fichas técnicas o PDF por
> producto?**

- [ ] Sí, y nos lo puede compartir → generamos borradores de las 331 y él solo
      revisa
- [ ] No hay → se redactan a mano, empezando por los 70 asadores

> Nota importante para el cliente: aunque tengamos la ficha oficial, el texto
> **se reescribe, no se copia**. Google penaliza el texto duplicado y preferiría
> mostrar la página de Weber antes que la nuestra. La fuente sirve como
> materia prima, no como copia.

### 5.8 · Precios

Los 331 están sin precio.

- [ ] Llega lista en Excel → carga masiva, sin captura manual
- [ ] No hay lista → captura manual, y conviene decidir con qué productos
      empezar

### 5.9 · Imágenes

309 productos traen foto; **22 no tienen ninguna** y sin imagen no se pueden
publicar.

Además, **201 de las 318 imágenes miden menos de 400 píxeles de ancho**: sirven
de miniatura en el listado, pero se verán borrosas en la ficha.

> **Propuesta:** pedirle a Weber los archivos en alta resolución por SKU. Es un
> correo, y sube la calidad percibida de toda la tienda.

- [ ] Lo pide el cliente ☐ Lo pedimos nosotros ☐ Se publica con lo que hay

---

## 6. Si el cliente dice "los nombres están bien así"

Es una respuesta legítima y hay que llevarla preparada.

**No hay impedimento técnico.** El cambio de nuestro lado es chico: la regla
del nombre deja de bloquear la publicación y 113 productos quedan listos para
salir en cuanto tengan descripción.

**Lo que sí conviene que sepa antes de decidirlo:**

- Las direcciones quedan como `/productos/q1200n-mdnt-blk-usa-ca-mx`, **y son
  permanentes**.
- El título en Google será `Q1200N MDNT BLK USA/CA/MX`. Nadie busca eso.
- Los cinco pares repetidos siguen sin poder distinguirse en la tienda.

**Punto medio, si quiere algo intermedio:** conservar los nombres tal cual y
quitar únicamente los códigos de región (`US/CA/MX`), que es lo único que no
describe absolutamente nada del producto. Es una regla de una línea y se aplica
sola a los 113.

---

## 7. Qué necesitamos para arrancar

Al salir de la reunión, con esto podemos empezar el mismo día:

1. Plantilla de nombre aprobada (§5.1)
2. Diccionario de abreviaturas confirmado por Weber (§5.2)
3. Reparto de inglés aprobado (§5.4)
4. Respuesta sobre la fuente de las descripciones (§5.7)

Los cinco duplicados (§5.5) y las imágenes faltantes (§5.9) pueden llegar
después: no bloquean la generación, solo la publicación de esos productos.

---

## Anexo · De dónde salen los números

Todo lo de este documento está medido sobre la base real, no estimado:

| Dato | Fuente |
| --- | --- |
| 331 productos, 0 publicados | tabla `Product` |
| 113 nombres de almacén | regla `looksLikeWarehouseName` en `packages/core/src/pendientes.ts` |
| 104 marcados "Por revisar" | marca `needsReview` que dejó el importador |
| 5 nombres repetidos | agrupación por nombre exacto |
| 331 sin descripción / sin precio · 22 sin imagen | campos vacíos en `Product` |
| 201 imágenes bajo 400px | ancho guardado en `ProductImage` |

**Una advertencia sobre el filtro "Por revisar" del panel:** hoy marca 104
productos y **los 104 lo están únicamente por el nombre**; ninguna otra causa.
Además, 9 productos con nombre de almacén aparecen como "Revisado" porque el
importador usó una regla más simple que la de la ficha. En cuanto se cierre la
decisión sobre los nombres, ese filtro debería sustituirse por lo que de verdad
falta para publicar (descripción, imagen, categoría), que es lo que ya calcula
`pendientes.ts`.
