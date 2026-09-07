// ---------------------------------------------------------------------------
// Reescribe los nombres que siguen siendo los del sistema de Weber, aplicando
// el criterio que el cliente aprobo en el cuestionario del catalogo.
//
//   pnpm db:nombres                 muestra que cambiaria, sin tocar nada
//   pnpm db:nombres --tabla         escribe la tabla de revision en Excel
//   pnpm db:nombres --aplicar       lo escribe en la base
//
// Las reglas viven en lib/nombres.ts. Aqui solo esta el recorrido del catalogo,
// el desempate de URLs y la tabla que se le manda al cliente.
//
// El nombre propuesto se calcula SIEMPRE desde el Excel de inventario, no desde
// lo que hay en la base. Es lo que hace que el proceso se pueda repetir: el
// cliente corrige la tabla, se ajusta la regla, se vuelve a correr y el
// resultado depende solo de la regla y del archivo, nunca de cuantas veces se
// haya corrido antes. Generando sobre la base, la segunda pasada leia sus
// propios nombres y los desarmaba.
//
// Un nombre editado a mano en el panel no se toca: se reporta y se salta.
//
// Sin --aplicar no escribe nada: el nombre es la direccion publica del producto
// y la tabla se revisa antes de mover 100 URLs de golpe.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { prisma } from '../src/index.js';
import { slugify } from '../../core/src/schemas.js';
import { deriveSeo } from '../../core/src/format.js';
import { generarNombre, necesitaRedaccion } from './lib/nombres.js';
import { readInventory } from './lib/excel.js';
import { capitalizarNombre, quitarPuntoFinal, soloNecesitaCapitalizarse } from './lib/capitalizar.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '../../..');
const TABLA = path.join(REPO_ROOT, 'data/salidas/Nombres propuestos - Weber.xlsx');
const INVENTARIO = path.join(REPO_ROOT, 'data/fuentes/Base de Datos Inventario.xlsx');

const aplicar = process.argv.includes('--aplicar');
const conTabla = process.argv.includes('--tabla');

/// Sin espacios de sobra ni saltos de linea: el Excel los trae y no dicen nada.
const plano = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

interface Fila {
  sku: string;
  /// Como llego del inventario de Weber.
  nombreOriginal: string;
  nombrePropuesto: string;
  notas: string[];
  confiable: boolean;
  cambia: boolean;
  /// Alguien lo escribio a mano en el panel: manda su version.
  editadoAMano: boolean;
}

async function main() {
  const { rows } = await readInventory(INVENTARIO);
  const originalPorSku = new Map(rows.map((r) => [r.sku, r.name]));
  console.log(`Inventario: ${rows.length} nombres originales`);

  const productos = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      name: true,
      slug: true,
      publishedAt: true,
      needsReview: true,
      reviewNote: true,
      shortDescription: true,
      productType: { select: { slug: true } },
      fuelType: { select: { slug: true } },
      series: { select: { slug: true } },
      compatibility: { select: { series: { select: { slug: true } } } },
      format: { select: { slug: true } },
      size: { select: { name: true } },
      color: { select: { slug: true } },
    },
    orderBy: { sku: 'asc' },
  });

  const filas: Fila[] = [];
  const cambios: { id: string; sku: string; nombre: string; slug: string; slugAnterior: string }[] = [];
  const avisos: { id: string; needsReview: boolean; reviewNote: string | null }[] = [];
  const resumenes: { id: string; sku: string; shortDescription: string }[] = [];

  // El desempate de URLs necesita saber que slugs estan tomados, y los que
  // este mismo recorrido va liberando cuentan como libres.
  const usados = new Set(productos.map((p) => p.slug));

  for (const producto of productos) {
    const original = originalPorSku.get(producto.sku) ?? producto.name;
    const esEquipo = ['asador', 'ahumador', 'plancha'].includes(producto.productType?.slug ?? '');

    // Tres caminos. El punto final sobra en cualquier idioma, asi que se le
    // quita hasta a los que no se redactan.
    let propuesto = plano(quitarPuntoFinal(original));
    let notas: string[] = [];
    let confiable = true;

    // El equipo va siempre por la plantilla, aunque su nombre ya estuviera en
    // español: "Asador Master-Touch 22" Negro" no esta mal escrito, esta
    // escrito con otro formato, y media docena de asadores con un formato y el
    // resto con otro se lee peor que cualquiera de los dos.
    if (!esEquipo && soloNecesitaCapitalizarse(original)) {
      // Ya estaba en español y con sentido comercial: solo venia gritado.
      propuesto = plano(capitalizarNombre(original));
    } else if (necesitaRedaccion(original, esEquipo)) {
      const generado = generarNombre({
        sku: producto.sku,
        name: original,
        productTypeSlug: producto.productType?.slug ?? null,
        fuelTypeSlug: producto.fuelType?.slug ?? null,
        seriesSlug: producto.series?.slug ?? null,
        compatibleSeriesSlugs: producto.compatibility.map((c) => c.series.slug),
        formatSlug: producto.format?.slug ?? null,
        sizeName: producto.size?.name ?? null,
        colorSlug: producto.color?.slug ?? null,
      });
      notas = generado.notas;
      confiable = generado.confiable;
      // Un accesorio sin frase en el diccionario vuelve con su nombre tal cual.
      // Si venia gritado, al menos se lee: la nota sigue diciendo que falta
      // ponerle nombre, pero mientras tanto no esta en el catalogo en
      // MAYUSCULAS.
      propuesto = plano(
        soloNecesitaCapitalizarse(generado.nombre)
          ? capitalizarNombre(generado.nombre)
          : generado.nombre,
      );
    }

    // Si lo que hay en la base no es ni el original ni lo que propone la regla,
    // alguien lo escribio a mano. Su version manda: para eso existe el panel.
    // La comparacion ignora espacios de sobra, que los trae el Excel y no
    // significan nada.
    const igual = (a: string, b: string) => plano(a) === plano(b);
    const editadoAMano =
      !igual(producto.name, propuesto) &&
      !igual(producto.name, original) &&
      !igual(producto.name, quitarPuntoFinal(original));

    filas.push({
      sku: producto.sku,
      nombreOriginal: plano(original),
      nombrePropuesto: propuesto,
      notas,
      confiable,
      cambia: !editadoAMano && !igual(propuesto, producto.name),
      editadoAMano,
    });

    // El aviso de revision que dejo la importacion -"Nombre en mayusculas,
    // falta redaccion comercial"- deja de ser verdad en cuanto el nombre se
    // redacta, y el panel filtra por el. Se recalcula aqui: se quita ese
    // motivo, se conservan los demas y se añade lo que falte del nombre.
    // El aviso se reemplaza, no se acumula. Al concatenarlo con el que ya
    // habia, cada corrida repetia los motivos y en la tercera el producto
    // decia tres veces la misma cosa. Como el unico que escribe este campo es
    // este script -y antes el importador, con un motivo que ya no es cierto-,
    // lo que calcula ahora es la verdad completa.
    // Una ficha escrita a mano tampoco se toca por aqui: quien la escribio
    // decide tambien si sigue pendiente.
    const motivos = [...new Set(notas)];
    const aviso = motivos.length > 0 ? motivos.join('; ') : null;
    if (
      !editadoAMano &&
      (aviso !== producto.reviewNote || (motivos.length > 0) !== producto.needsReview)
    ) {
      avisos.push({ id: producto.id, needsReview: motivos.length > 0, reviewNote: aviso });
    }

    // La descripcion corta repite el nombre, por decision del cliente: prefiere
    // no detener el catalogo redactando 331 resumenes, y sin ella no se puede
    // publicar nada. Es provisional, asi que se reconoce por ser identica al
    // nombre: en cuanto alguien escriba una de verdad, deja de tocarse.
    //
    // El metaDescription que sale de aqui queda igual que el metaTitle. No
    // penaliza, pero desperdicia la linea de abajo del resultado de Google, y
    // es la primera cosa que hay que rehacer cuando lleguen las descripciones.
    const nombreFinal = editadoAMano ? producto.name : propuesto;
    const resumenEsCopia =
      !producto.shortDescription ||
      igual(producto.shortDescription, producto.name) ||
      igual(producto.shortDescription, nombreFinal) ||
      igual(producto.shortDescription, plano(original));
    if (resumenEsCopia && !igual(producto.shortDescription ?? '', nombreFinal)) {
      resumenes.push({ id: producto.id, sku: producto.sku, shortDescription: nombreFinal });
    }

    if (editadoAMano || igual(propuesto, producto.name)) continue;

    // El slug sigue al nombre mientras el producto no se haya publicado. Uno
    // publicado no se toca: su direccion ya circula en enlaces y buscadores.
    if (producto.publishedAt !== null) {
      cambios.push({
        id: producto.id,
        sku: producto.sku,
        nombre: propuesto,
        slug: producto.slug,
        slugAnterior: producto.slug,
      });
      continue;
    }

    const base = slugify(propuesto);
    usados.delete(producto.slug);
    const slug = !base || usados.has(base) ? `${base}-${producto.sku.toLowerCase()}` : base;
    usados.add(slug);
    cambios.push({
      id: producto.id,
      sku: producto.sku,
      nombre: propuesto,
      slug,
      slugAnterior: producto.slug,
    });
  }

  // --- Informe -----------------------------------------------------------

  const tocados = filas.filter((f) => f.cambia);
  const marcados = filas.filter((f) => !f.confiable && f.nombrePropuesto !== f.nombreOriginal);
  const aMano = filas.filter((f) => f.editadoAMano);

  console.log(`\n${tocados.length} nombres se reescriben:\n`);
  for (const fila of tocados) {
    console.log(`  ${fila.sku}`);
    console.log(`    antes:   ${fila.nombreOriginal}`);
    console.log(`    después: ${fila.nombrePropuesto}`);
    for (const nota of fila.notas) console.log(`    · ${nota}`);
  }

  // Dos productos con el mismo nombre son indistinguibles en la tienda: el
  // cliente no sabe cual esta comprando. Es la pregunta 6 del cuestionario y
  // el generador puede crear casos nuevos, asi que se revisa cada vez.
  const porNombre = new Map<string, string[]>();
  for (const fila of filas) {
    const clave = fila.nombrePropuesto.toLocaleLowerCase('es');
    porNombre.set(clave, [...(porNombre.get(clave) ?? []), fila.sku]);
  }
  const repetidos = [...porNombre.entries()].filter(([, skus]) => skus.length > 1);

  // Los que hay que redactar y no se pudo: el generador se nego a inventarles
  // un nombre. Son la lista de trabajo pendiente, asi que no pueden quedar
  // escondidos entre los 197 que no se tocan por estar ya bien.
  const sinPropuesta = filas.filter((f) => f.nombrePropuesto === f.nombreOriginal && f.notas.length > 0);

  console.log('\nResumen');
  console.log(`  Nombres reescritos:        ${tocados.length}`);
  console.log(`  Sin nombre que proponer:   ${sinPropuesta.length}`);
  console.log(`  Editados a mano, intactos: ${aMano.length}`);
  console.log(`  Ya redactados, sin tocar:  ${filas.length - tocados.length - sinPropuesta.length - aMano.length}`);
  console.log(`  URLs que se mueven:        ${cambios.filter((c) => c.slug !== c.slugAnterior).length}`);
  console.log(`  Marcados para revisión:    ${marcados.length}`);
  console.log(`  Avisos de revisión al día: ${avisos.length}`);
  console.log(`  Descripciones cortas:      ${resumenes.length}`);

  if (sinPropuesta.length > 0) {
    console.log('\nSin nombre que proponer, se quedan como estaban:');
    for (const fila of sinPropuesta) {
      console.log(`  ${fila.sku.padEnd(10)} ${fila.nombreOriginal}`);
      for (const nota of fila.notas) console.log(`  ${' '.repeat(10)} · ${nota}`);
    }
  }

  if (marcados.length > 0) {
    console.log('\nMarcados, con lo que les falta:');
    for (const fila of marcados) {
      console.log(`  ${fila.sku.padEnd(10)} ${fila.nombrePropuesto}`);
      for (const nota of fila.notas) console.log(`  ${' '.repeat(10)} · ${nota}`);
    }
  }

  if (repetidos.length > 0) {
    console.log(`\n${repetidos.length} nombres quedan repetidos entre dos productos:`);
    for (const [nombre, skus] of repetidos) {
      console.log(`  ${skus.join(' + ')}  ${nombre}`);
    }
  }

  if (aMano.length > 0) {
    console.log('\nEditados a mano en el panel, no se tocan:');
    for (const fila of aMano) console.log(`  ${fila.sku.padEnd(10)} ${fila.nombrePropuesto}`);
  }

  if (conTabla) await escribirTabla(filas, repetidos);

  if (!aplicar) {
    console.log('\nEsto es una vista previa. Para escribirlo: pnpm db:nombres --aplicar');
    return;
  }

  // En una transaccion: a medias quedaria una parte del catalogo con nombre
  // nuevo y otra con el viejo, sin forma de saber cual es cual.
  await prisma.$transaction([
    ...cambios.map((c) =>
      prisma.product.update({
        where: { id: c.id },
        data: { name: c.nombre, slug: c.slug, metaTitle: deriveSeo(c.nombre, null).metaTitle },
      }),
    ),
    ...avisos.map((a) =>
      prisma.product.update({
        where: { id: a.id },
        data: { needsReview: a.needsReview, reviewNote: a.reviewNote },
      }),
    ),
    ...resumenes.map((r) =>
      prisma.product.update({
        where: { id: r.id },
        data: {
          shortDescription: r.shortDescription,
          ...deriveSeo(r.shortDescription, r.shortDescription),
        },
      }),
    ),
  ]);
  console.log(
    `\nListo: ${cambios.length} nombres reescritos, ${avisos.length} avisos de revisión al día, ` +
      `${resumenes.length} descripciones cortas.`,
  );
}

/// La tabla que se le manda al cliente: las 331 filas, antes y despues, con
/// dos columnas vacias para que marque lo que no le guste.
async function escribirTabla(filas: Fila[], repetidos: [string, string[]][]): Promise<void> {
  const repetidoPorSku = new Set(repetidos.flatMap(([, skus]) => skus));
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Nombres');

  hoja.columns = [
    { header: 'SKU', key: 'sku', width: 12 },
    { header: 'Como se llama hoy', key: 'antes', width: 46 },
    { header: 'Como quedaria', key: 'despues', width: 52 },
    { header: 'Pendiente', key: 'notas', width: 46 },
    { header: '¿Está bien? (sí / no)', key: 'ok', width: 20 },
    { header: 'Si no, cómo debería llamarse', key: 'correccion', width: 44 },
  ];
  hoja.getRow(1).font = { bold: true };
  hoja.views = [{ state: 'frozen', ySplit: 1 }];

  for (const fila of filas) {
    const notas = [...fila.notas];
    if (repetidoPorSku.has(fila.sku)) notas.push('queda con el mismo nombre que otro producto');

    if (fila.editadoAMano) notas.push('escrito a mano en el panel, la regla no lo toca');

    const agregada = hoja.addRow({
      sku: fila.sku,
      antes: fila.nombreOriginal,
      despues:
        fila.nombrePropuesto === fila.nombreOriginal
          ? 'se queda igual'
          : fila.nombrePropuesto,
      notas: notas.join('; '),
    });
    agregada.alignment = { vertical: 'top', wrapText: true };
    // Las filas con pendiente se ven de un golpe: son las que de verdad
    // necesitan que alguien las lea.
    if (notas.length > 0) {
      agregada.getCell('notas').font = { color: { argb: 'FFB45309' } };
    }
    if (fila.nombrePropuesto === fila.nombreOriginal) {
      agregada.getCell('despues').font = { color: { argb: 'FF9CA3AF' }, italic: true };
    }
  }

  await libro.xlsx.writeFile(TABLA);
  console.log(`\nTabla de revisión: ${path.relative(REPO_ROOT, TABLA)}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
