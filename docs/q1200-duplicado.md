# El Q1200 está diez veces en la lista de precios

> **CONTESTADO el 2026-09-07.** Es el mismo modelo: cambia el código según el
> color, y con el color cambia el precio.
>
> **Vigentes a $7,499:** Titanio (`51060001`), Negro (`51010001`), Azul
> (`51080001`) y Naranja (`51190001`).
> **Modelos nuevos de Weber, a $6,999:** Midnight Black (`1502198`), Flame Red
> (`1502230`) y Charcoal Grey (`1502231`).
> **Deshabilitados:** los que no están en esa lista, que se pueden volver a
> habilitar rápido si Weber los saca otra vez.
>
> Aplicado: los siete vigentes quedaron en borrador con su color y su precio, y
> `51040001` (Rojo), `51070001` (Verde) y `1502199` (Humo) quedaron archivados.
> Este documento se queda como registro de la pregunta.

Una sola pregunta, y es de precio. Se contesta en dos minutos.

En la **Lista de Precios 2026** el asador Q1200 aparece **diez veces**, en dos
bloques separados, con dos claves distintas y **dos precios distintos**. Ninguno
está en la otra lista de precios ni en otro archivo: los diez están en el mismo
documento que nos mandaron.

---

## Los dos bloques, tal como están en su archivo

**Filas 276 a 281** · seis claves de 8 dígitos · **$7,499**

| Fila | SKU | Descripción en la lista |
| ---: | --- | --- |
| 276 | `51010001` | Asador Weber Q1200 NEGRO |
| 277 | `51040001` | Asador Weber Q1200 ROJO |
| 278 | `51060001` | Asador Weber Q1200 |
| 279 | `51070001` | Asador Weber Q1200 VERDE |
| 280 | `51080001` | Asador Weber Q1200 AZUL |
| 281 | `51190001` | Asador Weber Q1200 NARANJA |

**Filas 295 a 298** · cuatro claves de 7 dígitos · **$6,999**

| Fila | SKU | Descripción en la lista |
| ---: | --- | --- |
| 295 | `1502198` | Q1200N MDNT BLK USA/CA/MX |
| 296 | `1502230` | Q1200N FLAME RED USA/CA/MX |
| 297 | `1502231` | Q1200N CH GREY USA/CA/MX |
| 298 | `1502199` | Q1200N SMK GREY USA/CA/MX |

Están a catorce filas de distancia, y eso explica por qué nunca se notó: nadie
los ve juntos leyendo el Excel.

---

## Puestos color contra color

| Color | Clave de 8 dígitos · $7,499 | Clave de 7 dígitos · $6,999 |
| --- | --- | --- |
| **Negro** | `51010001` | `1502198` (MDNT BLK) |
| **Rojo** | `51040001` | `1502230` (FLAME RED) |
| **Verde** | `51070001` | — |
| **Azul** | `51080001` | — |
| **Naranja** | `51190001` | — |
| Sin color en el nombre | `51060001` | — |
| **Humo** | — | `1502199` (SMK GREY) |
| **Grey** | — | `1502231` (CH GREY) |

Dos cosas salen a la vista:

- **El negro y el rojo están en los dos bloques**, con $500 de diferencia. Ese
  es el mismo asador del mismo color a dos precios.
- **Los colores no coinciden.** Verde, azul y naranja solo existen en el bloque
  de $7,499; humo y grey solo en el de $6,999. Eso hace pensar que son dos
  generaciones del Q1200: una que salió del catálogo y otra que la reemplazó.

---

## Así se vería la tienda si se publican los diez

```
┌────────────────────────────────────────────────────────┐
│  Asadores portátiles de gas                            │
├────────────────────────────────────────────────────────┤
│  [foto]  Asador Weber Q1200 NEGRO            $7,499.00 │
│  [foto]  Asador Weber Q1200 ROJO             $7,499.00 │
│  [foto]  Asador Weber Q1200                  $7,499.00 │
│  [foto]  Asador Weber Q1200 VERDE            $7,499.00 │
│  [foto]  Asador Weber Q1200 AZUL             $7,499.00 │
│  [foto]  Asador Weber Q1200 NARANJA          $7,499.00 │
│  [foto]  Asador Weber Q1200, Negro           $6,999.00 │
│  [foto]  Asador Weber Q1200, Rojo Carmesí    $6,999.00 │
│  [foto]  Asador Weber Q1200, Humo            $6,999.00 │
│  [foto]  Asador Weber Q1200, Grey            $6,999.00 │
└────────────────────────────────────────────────────────┘
```

Diez Q1200 en la misma sección, y el negro dos veces con $500 de diferencia.
Nadie compra el de $7,499 teniendo el de $6,999 abajo.

---

## Lo que necesitamos saber

**1 · ¿Qué bloque se vende hoy?**

- [ ] Los de clave de 8 dígitos (`51010001`…), a **$7,499**
- [ ] Los de clave de 7 dígitos (`1502198`…), a **$6,999**
- [ ] Los dos, y son productos distintos porque `__________________________`

**2 · Si es solo uno, ¿el otro bloque ya no se vende?**

- [ ] Correcto, archívenlo
- [ ] No: sigue vigente en estos colores `__________________________`

**3 · Los colores verde, azul y naranja, ¿todavía existen?**

- [ ] Sí, se siguen vendiendo
- [ ] No, ya salieron del catálogo

> **Por qué corre prisa.** Los cuatro de $6,999 ya están cargados y listos para
> publicar. Si el precio vigente es $7,499, cada Q1200 que se venda en la tienda
> se va **$500 abajo del precio autorizado**, y no por un error de captura: por
> haber elegido el bloque equivocado de su propia lista.

Mientras no nos contesten, los diez se quedan en borrador y ninguno sale a la
tienda.
