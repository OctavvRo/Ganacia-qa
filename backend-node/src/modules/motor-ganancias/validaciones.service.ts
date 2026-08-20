import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { D, numero } from '../../common/decimal/decimal.util';
import { CalculoGanancias } from './motor-ganancias.service';
import { LiquidacionNormalizada, MESES, ResultadoValidacion } from './dominio';

export const FILAS_REQUERIDAS:Record<string,string>={ganancia_neta_fila35:'ganancia_neta_fila35',retencion:'retencion_practicada',impuesto_calculado:'impuesto_calculado',porcentaje:'porcentaje_aplicado',sac:'sac',remuneraciones_con_aporte:'remuneraciones_con_aporte',ganancia_no_imponible:'ganancia_no_imponible',deduccion_especial:'deduccion_especial',doceava_parte_art30:'doceava_parte_art30'};
export const FILAS_OPCIONALES:Record<string,string>={jubilacion:'jubilacion',aportes_obra_social:'aportes_obra_social',inssjp:'inssjp',seguros_de_retiro:'seguros_de_retiro',seguros_dc:'seguros_dc',educacion:'educacion',alquileres_10_inquilino:'alquileres_10_inquilino',donaciones:'donaciones',otras_deducciones:'otras_deducciones'};

const ART30_2026_S2_ACUMULADO:Record<number,Record<string,Decimal>>={
  6:{ganancia_no_imponible:D('2575901.25'),conyuge:D('2425982.33'),hijos:D('1223431.74'),deduccion_especial:D('12364326.01')},
  7:{ganancia_no_imponible:D('3077540.53'),conyuge:D('2898425.92'),hijos:D('1461686.77'),deduccion_especial:D('14772194.56')},
  8:{ganancia_no_imponible:D('3579179.81'),conyuge:D('3370869.51'),hijos:D('1699941.79'),deduccion_especial:D('17180063.10')},
  9:{ganancia_no_imponible:D('4080819.09'),conyuge:D('3843313.10'),hijos:D('1938196.82'),deduccion_especial:D('19587931.65')},
  10:{ganancia_no_imponible:D('4582458.37'),conyuge:D('4315756.68'),hijos:D('2176451.84'),deduccion_especial:D('21995800.20')},
  11:{ganancia_no_imponible:D('5084097.65'),conyuge:D('4788200.27'),hijos:D('2414706.87'),deduccion_especial:D('24403668.74')},
  12:{ganancia_no_imponible:D('5585736.93'),conyuge:D('5260643.86'),hijos:D('2652961.90'),deduccion_especial:D('26811537.29')},
};

@Injectable()
export class ValidacionesService {
  validarEntrada(liq:LiquidacionNormalizada){const faltantes=Object.entries(FILAS_REQUERIDAS).filter(([,c])=>!liq.acumuladores[c]).map(([n])=>n);if(!liq.metadata.periodo_fiscal)faltantes.push('periodo_fiscal');if(!liq.metadata.mes_liquidacion||liq.metadata.mes_liquidacion<1||liq.metadata.mes_liquidacion>12)faltantes.push('mes_liquidacion');const opc=Object.entries(FILAS_OPCIONALES).filter(([,c])=>!liq.acumuladores[c]).map(([n])=>n);const advertencias=opc.length?[`Faltan filas opcionales recomendadas: ${opc.join(', ')}`]:[];const mes=liq.metadata.mes_liquidacion;if(mes&&mes>=1&&mes<=12&&!faltantes.length&&this.mesSinDatos(liq,mes)){faltantes.push('mes_liquidacion_sin_datos');const ultimo=this.ultimoMesConDatos(liq);advertencias.push(ultimo?`El mes seleccionado no tiene datos en el Excel. Ultimo mes con datos detectado: ${MESES[ultimo-1]} (${String(ultimo).padStart(2,'0')}).`:'El mes seleccionado no tiene datos en el Excel.');}return{es_procesable:!faltantes.length,estado:faltantes.length?'ERROR':advertencias.length?'ADVERTENCIA':'OK',datos_faltantes:faltantes,advertencias,detalle:faltantes.length?'El archivo no contiene todos los datos minimos del ANALISIS_BASICO o el mes seleccionado no coincide con un mes liquidado del Excel.':advertencias.length?'La entrada es procesable, pero faltan conceptos opcionales que se computaran como cero.':'La entrada contiene todos los datos minimos y recomendados.'};}
  controlEstructuraExcel(liq: LiquidacionNormalizada): ResultadoValidacion {
    const estructura = liq.estructura_excel;

    if (!estructura) {
      return {
        codigo: 'CTRL_ESTRUCTURA_EXCEL',
        estado: 'NO_EVALUADA',
        severidad: 'TECNICA',
        afecta_veredicto: false,
        detalle: 'No se pudo evaluar la estructura fisica del Excel porque el parser no informo rango de hoja.',
        que_hacer: 'Verifique que el archivo tenga una hoja de acumuladores con la tabla base en A1:O49, con 49 filas, columnas A-O y encabezados de enero a diciembre.',
        acciones_recomendadas: [
          'Abrir el Excel y confirmar que la tabla principal este ubicada dentro del rango A1:O49.',
          'Revisar que existan 49 filas de estructura y 15 columnas desde A hasta O.',
          'Confirmar que los meses enero-diciembre esten presentes en la fila de encabezados.',
        ],
        filas_esperadas: 49,
        columnas_esperadas: 15,
        columnas_esperadas_detalle: Array.from({ length: 15 }, (_, i) => String.fromCharCode(65 + i)),
        meses_esperados: [...MESES],
      };
    }

    const problemas: string[] = [];
    const filasOk =
      estructura.filas_detectadas === estructura.filas_esperadas &&
      estructura.filas_1_49_detectadas &&
      estructura.filas_faltantes.length === 0 &&
      estructura.filas_extras.length === 0;
    const columnasOk =
      estructura.columnas_detectadas === estructura.columnas_esperadas &&
      estructura.columnas_a_o_presentes &&
      estructura.columnas_faltantes.length === 0 &&
      estructura.columnas_extras.length === 0;

    if (!filasOk) {
      problemas.push(
        `filas esperadas ${estructura.filas_esperadas}, detectadas ${estructura.filas_detectadas}`,
      );
    }

    if (!columnasOk) {
      problemas.push(
        `columnas esperadas A-O (${estructura.columnas_esperadas}), detectadas ${estructura.columnas_presentes.join(', ') || 'ninguna'}`,
      );
    }

    if (!estructura.meses_enero_diciembre_presentes) {
      problemas.push(`meses faltantes: ${estructura.meses_faltantes.join(', ') || 'ninguno'}`);
    }

    const acciones_recomendadas = this.accionesEstructuraExcel(estructura);

    return {
      codigo: 'CTRL_ESTRUCTURA_EXCEL',
      estado: problemas.length ? 'ERROR' : 'OK',
      severidad: 'TECNICA',
      afecta_veredicto: false,
      nombre: 'Control de estructura Excel',
      descripcion: 'Verifica que la hoja usada por el motor tenga 49 filas, 15 columnas A-O y meses enero-diciembre.',
      detalle: problemas.length
        ? `La tabla base A1:O49 no coincide con la plantilla esperada: ${problemas.join('; ')}. Los datos fuera de A1:O49 se ignoran para este control.`
        : 'La tabla base A1:O49 coincide con la plantilla esperada: 49 filas, 15 columnas A-O y meses enero-diciembre presentes. Los datos fuera de A1:O49 se ignoran para este control.',
      que_hacer: problemas.length
        ? acciones_recomendadas.join(' ')
        : 'No hace falta corregir la estructura: la tabla base A1:O49 esta completa.',
      acciones_recomendadas,
      cantidad_filas_faltantes: estructura.filas_faltantes.length,
      cantidad_columnas_faltantes: estructura.columnas_faltantes.length,
      cantidad_meses_faltantes: estructura.meses_faltantes.length,
      ...estructura,
    };
  }
  private accionesEstructuraExcel(estructura: NonNullable<LiquidacionNormalizada['estructura_excel']>): string[] {
    const acciones: string[] = [];

    if (estructura.filas_faltantes.length) {
      acciones.push(
        `Agregar o restaurar ${estructura.filas_faltantes.length} fila(s) faltante(s) dentro de la tabla A1:O49: ${this.resumirLista(estructura.filas_faltantes)}.`,
      );
    }

    if (estructura.filas_extras.length) {
      acciones.push(
        `Revisar ${estructura.filas_extras.length} fila(s) extra dentro del area controlada: ${this.resumirLista(estructura.filas_extras)}.`,
      );
    }

    if (estructura.columnas_faltantes.length) {
      acciones.push(
        `Agregar o restaurar ${estructura.columnas_faltantes.length} columna(s) faltante(s) de la tabla A-O: ${this.resumirLista(estructura.columnas_faltantes)}.`,
      );
    }

    if (estructura.columnas_extras.length) {
      acciones.push(
        `Quitar o mover fuera de A1:O49 las columna(s) extra detectadas: ${this.resumirLista(estructura.columnas_extras)}.`,
      );
    }

    if (estructura.meses_faltantes.length) {
      acciones.push(
        `Completar los encabezados de mes faltantes: ${this.resumirLista(estructura.meses_faltantes)}. Deben estar dentro de las columnas de meses de la tabla base.`,
      );
    }

    if (!acciones.length) {
      acciones.push('No se requiere ninguna correccion de estructura en A1:O49.');
    }

    return acciones;
  }

  private resumirLista(valores: Array<string | number>, limite = 12): string {
    const visibles = valores.slice(0, limite).join(', ');
    const restantes = valores.length - limite;
    return restantes > 0 ? `${visibles} y ${restantes} mas` : visibles;
  }
  v1(liq: LiquidacionNormalizada, tol: Decimal): ResultadoValidacion | null {
    const p = liq.papel_trabajo_asis;
    const gananciaPapel = this.decimalOpcional(p?.ganancia_neta);
    const mes = liq.metadata.mes_liquidacion ?? 0;
    const gananciaFila35 = mes ? liq.acumuladores.ganancia_neta_fila35?.valores[MESES[mes - 1]] : null;

    if (!gananciaPapel || !gananciaFila35) return null;

    const delta = gananciaFila35.minus(gananciaPapel);
    const base = {
      codigo: 'V1_SINCRONIZACION_FILA35',
      ganancia_neta_fila35: numero(gananciaFila35),
      ganancia_neta_papel_trabajo: numero(gananciaPapel),
      diferencia: numero(delta),
    };

    if (delta.abs().gt(tol)) {
      return {
        ...base,
        estado: 'ERROR',
        severidad: 'ALTA',
        tipo_hallazgo: 'V1_DESINCRONIZACION',
        detalle: 'La ganancia neta de la fila 35 no coincide con la ganancia neta declarada en PapelTrabajo.',
      };
    }

    return {
      ...base,
      estado: 'OK',
      detalle: 'La ganancia neta de la fila 35 coincide con PapelTrabajo dentro de la tolerancia.',
    };
  }

  v2(liq: LiquidacionNormalizada, c: CalculoGanancias, tol: Decimal): ResultadoValidacion | null {
    const totalDeclarado = this.decimalOpcional(liq.papel_trabajo_asis?.total_ingresos);
    if (!totalDeclarado) return null;

    const totalReferencia = c.total_ingresos_usado ?? c.total_ingresos;
    const delta = totalReferencia.minus(totalDeclarado);
    const mes = liq.metadata.mes_liquidacion ?? 0;
    const provisionesSac = MESES.slice(0, Math.min(5, mes)).reduce((s, m) => {
      const v = liq.acumuladores.sac?.valores[m] ?? D(0);
      return v.gt(0) ? s.plus(v) : s;
    }, D(0));
    const coincideSac = provisionesSac.gt(0) && delta.abs().minus(provisionesSac).abs().lte(D(1));

    const base = {
      codigo: 'V2_TOTAL_INGRESOS',
      total_ingresos_referencia: numero(totalReferencia),
      total_ingresos_declarado: numero(totalDeclarado),
      diferencia: numero(delta),
      coincide_con_patron_conocido: coincideSac ? 'PROVISIONES_SAC_ENE_MAY' : null,
      provisiones_sac_positivas_ene_may: numero(provisionesSac),
    };

    if (delta.abs().gt(tol)) {
      return {
        ...base,
        estado: 'ERROR',
        severidad: 'CRITICA',
        tipo_hallazgo: 'V2_TOTAL_INGRESOS_INCORRECTO',
        detalle: coincideSac
          ? 'El total de ingresos declarado difiere de la referencia y la diferencia coincide con provisiones positivas de SAC.'
          : 'El total de ingresos declarado no coincide con la composicion reconstruida por el controlador.',
      };
    }

    return {
      ...base,
      estado: 'OK',
      detalle: 'El total de ingresos declarado coincide con la composicion reconstruida por el controlador.',
    };
  }

  v3(liq: LiquidacionNormalizada, tol: Decimal): ResultadoValidacion | null {
    const p = liq.papel_trabajo_asis;
    if (!p) return null;

    const get = (campo: string) => this.decimalOpcional((p as any)[campo]);
    const total = get('total_ingresos');
    const personales = get('deducciones_personales');
    const educativos = get('educativos_domesticos');
    const previa = get('ganancia_neta_previa');
    const generales = get('deducciones_generales_previa');
    const art30 = get('deducciones_art30');
    const cma = get('cm_asistencial');
    const ganancia = get('ganancia_neta');
    const minimo = get('escala_minimo_tramo');
    const sobre = get('sobre_diferencia');
    const fijo = get('escala_importe_fijo');
    const porcentaje = get('escala_porcentaje');
    const impuesto = get('impuesto_determinado');
    const pagos = get('pagos_anteriores');
    const retencion = get('retencion_del_mes_calculada');

    const requeridos = [total, personales, educativos, previa, generales, art30, cma, ganancia, minimo, sobre, fijo, porcentaje, impuesto, pagos, retencion];
    if (requeridos.some(x => !x)) return null;

    const pruebas = [
      ['GNPrev', total!.minus(personales!).minus(educativos!), previa!],
      ['GN', previa!.minus(generales!).minus(art30!).minus(cma!), ganancia!],
      ['Sobre_diff', ganancia!.minus(minimo!), sobre!],
      ['Impuesto', fijo!.plus(sobre!.mul(porcentaje!).div(100)), impuesto!],
      ['Retencion', impuesto!.minus(pagos!), retencion!],
    ] as const;

    const diferencias = pruebas
      .map(([nombre, esperado, declarado]) => ({
        paso: nombre,
        esperado: numero(esperado),
        declarado: numero(declarado),
        diferencia: numero(esperado.minus(declarado)),
      }))
      .filter(x => D(String(x.diferencia)).abs().gt(tol));

    if (diferencias.length) {
      return {
        codigo: 'V3_CADENA_ARITMETICA',
        estado: 'ERROR',
        severidad: 'ALTA',
        tipo_hallazgo: 'V3_CADENA_ARITMETICA_INCONSISTENTE',
        diferencias,
        detalle: `La cadena aritmetica de PapelTrabajo no cierra en ${diferencias.length} paso(s).`,
      };
    }

    return {
      codigo: 'V3_CADENA_ARITMETICA',
      estado: 'OK',
      detalle: 'La cadena aritmetica de PapelTrabajo cierra paso a paso dentro de la tolerancia.',
    };
  }

  v6(liq: LiquidacionNormalizada, tol: Decimal): ResultadoValidacion {
    const clavesObligatorias = [
      'ganancia_no_imponible',
      'deduccion_especial',
      'doceava_parte_art30',
    ];
    const clavesBase = [
      'ganancia_no_imponible',
      'conyuge',
      'hijos',
      'otras_cargas',
      'deduccion_especial',
    ];
    const faltan = clavesObligatorias.filter(c => !liq.acumuladores[c]);

    if (faltan.length) {
      return {
        codigo: 'V6_12VA_PARTE_ART30',
        estado: 'ADVERTENCIA',
        datos_faltantes: faltan,
        detalle: `Faltan acumuladores para validar V6: ${faltan.join(', ')}`,
      };
    }

    const mes = liq.metadata.mes_liquidacion ?? 0;
    const candidatos: Record<string, Decimal[]> = Object.fromEntries(
      clavesBase.map(c => [
        c,
        Array.from(
          new Set(
            Object.values(liq.acumuladores[c]?.valores ?? {})
              .filter(v => v.abs().gt(tol))
              .map(v => v.toFixed(2)),
          ),
        ).map(v => D(v)),
      ]),
    );
    const hallazgos: Array<Record<string, unknown>> = [];

    for (const m of MESES.slice(0, mes)) {
      const valores = Object.fromEntries(
        clavesBase.map(c => [c, liq.acumuladores[c]?.valores[m] ?? D(0)]),
      ) as Record<string, Decimal>;
      const total = clavesBase.reduce((s, c) => s.plus(valores[c]), D(0));
      const esperado = total.div(12);
      const informado = liq.acumuladores.doceava_parte_art30.valores[m] ?? D(0);
      const diferencia = informado.minus(esperado);

      if (diferencia.abs().gt(tol)) {
        const diag = this.diagnosticoV6(valores, candidatos, informado, tol);
        hallazgos.push({
          mes: m,
          esperado: numero(esperado),
          informado: numero(informado),
          diferencia: numero(diferencia),
          componentes: Object.fromEntries(clavesBase.map(c => [c, numero(valores[c])])),
          total_base_esperada: numero(total),
          formula_spec: '(ganancia_no_imponible + conyuge + hijos + otras_cargas + deduccion_especial) / 12',
          formula_detallada: '12va parte Art. 30 esperada = base Art. 30 informada del mes / 12',
          formula_operacion: 'division_12',
          formula_valores: {
            ganancia_no_imponible: numero(valores.ganancia_no_imponible),
            conyuge: numero(valores.conyuge),
            hijos: numero(valores.hijos),
            otras_cargas: numero(valores.otras_cargas),
            deduccion_especial: numero(valores.deduccion_especial),
            base_art30: numero(total),
            divisor: 12,
            doceava_esperada: numero(esperado),
            doceava_informada_excel: numero(informado),
          },
          causa_probable: diag.causa_probable,
          formula_probable: diag.formula_probable,
          componentes_formula_probable: diag.componentes_formula_probable,
          total_base_probable: numero(diag.total_base_probable),
          valor_probable: numero(diag.valor_probable),
          explicacion_aritmetica: this.explicacionAritmeticaV6(total, esperado, informado, diag),
          campos_a_revisar: diag.campos_a_revisar,
        });
      }
    }

    if (hallazgos.length) {
      const campos = [
        ...new Set(hallazgos.flatMap(h => h.campos_a_revisar as string[])),
      ];
      const resumen = hallazgos
        .map(h => {
          const esperado = D(String(h.esperado)).toFixed(2);
          const informado = D(String(h.informado)).toFixed(2);
          const diferencia = D(String(h.diferencia)).toFixed(2);
          return `${h.mes}: esperado ${esperado}, informado ${informado}, diferencia ${diferencia}. ${h.causa_probable}`;
        })
        .join(' | ');

      return {
        codigo: 'V6_12VA_PARTE_ART30',
        estado: 'ADVERTENCIA',
        severidad: 'MEDIA',
        tipo_hallazgo: 'V6_12VA_PARTE_ART30_DATOS_EXCEL_INCONSISTENTES',
        categoria_hallazgo: 'CALIDAD_DATOS_EXCEL',
        afecta_veredicto: false,
        detalle: `Se detecto una inconsistencia de datos del Excel en la 12va parte Art. 30. No es un error del motor: la fila doceava_parte_art30 no cierra con ganancia_no_imponible, deduccion_especial y cargas de familia informadas para los meses observados. ${resumen} Campos a revisar en el origen: ${campos.join(', ')}.`,
        campos_a_revisar: campos,
        meses_con_diferencias: hallazgos,
      };
    }

    return {
      codigo: 'V6_12VA_PARTE_ART30',
      estado: 'OK',
      detalle: 'La 12va parte coincide con (ganancia no imponible + cargas de familia + deduccion especial) / 12 en todos los meses liquidados.',
    };
  }
  v8(sac:Record<string,any>):ResultadoValidacion{const modalidad=sac.modalidad??'indeterminado',confianza=sac.confianza??'baja';return{codigo:'V8_MODALIDAD_SAC',estado:['devengado','percibido'].includes(modalidad)&&confianza==='alta'?'OK':'ADVERTENCIA',detalle:`Modalidad ${modalidad}, confianza ${confianza}. ${sac.motivo??'Sin detalle de deteccion SAC.'}`};}
  v17(liq: LiquidacionNormalizada, tol: Decimal): ResultadoValidacion | null {
    const periodo = liq.metadata.periodo_fiscal ?? 0;
    const mes = liq.metadata.mes_liquidacion ?? 0;
    if (periodo !== 2026 || mes < 7) return null;

    const esperado = ART30_2026_S2_ACUMULADO[mes];
    if (!esperado) {
      return {
        codigo: 'V17_ACTUALIZACION_SEMESTRAL_ART30',
        estado: 'NO_EVALUADA',
        datos_faltantes: ['contexto_normativo.art30_2026_s2'],
        detalle: 'No hay parametros Art. 30 cargados para validar la actualizacion semestral del mes liquidado.',
      };
    }

    const sumaHasta = (clave: string, hasta: number) =>
      MESES.slice(0, hasta).reduce((s, m) => s.plus(liq.acumuladores[clave]?.valores[m] ?? 0), D(0));
    const suma = (clave: string) => sumaHasta(clave, mes);
    const comparaciones: Array<Record<string, unknown>> = [];

    const comparar = (clave: string, concepto: string, esperadoValor: Decimal) => {
      const informado = suma(clave);
      const diferencia = informado.minus(esperadoValor);
      if (diferencia.abs().gt(tol)) {
        comparaciones.push({
          concepto,
          mes: MESES[mes - 1],
          esperado: numero(esperadoValor),
          informado: numero(informado),
          diferencia: numero(diferencia),
          formula_spec: 'Parametro acumulado Art. 30 vigente para el periodo liquidado',
          formula_detallada: `${concepto} esperado = parametro acumulado Art. 30 vigente para ${MESES[mes - 1]}`,
          formula_operacion: 'parametro_acumulado',
          formula_valores: {
            parametro_acumulado: numero(esperadoValor),
            acumulado_informado_excel: numero(informado),
          },
          por_que_revisar: `${concepto}: el acumulado informado en el Excel no coincide con el parametro Art. 30 cargado para ${MESES[mes - 1]}.`,
          campos_a_revisar: [clave],
        });
      }
    };

    comparar('ganancia_no_imponible', 'Ganancia no imponible', esperado.ganancia_no_imponible);
    comparar('deduccion_especial', 'Deduccion especial Art. 30 ap. 2', esperado.deduccion_especial);

    const hijos = suma('hijos');
    const hijosReferencia = this.referenciaHijosV17(liq, mes, esperado.hijos, sumaHasta);
    if (hijos.abs().gt(tol) || hijosReferencia.origen !== 'sin_datos') {
      const hijosJunio = sumaHasta('hijos', 6);
      const unitarioJunio = ART30_2026_S2_ACUMULADO[6].hijos;
      const cantidadManual = this.cantidadHijosManual(liq);
      const cantidad = hijosReferencia.cantidad_representativa ?? (cantidadManual !== null
        ? D(cantidadManual)
        : Decimal.max(1, hijosJunio.div(unitarioJunio).toDecimalPlaces(0)));
      const esperadoHijos = hijosReferencia.esperado ?? esperado.hijos.mul(cantidad);
      const diferencia = hijos.minus(esperadoHijos);
      const cantidadEquivalenteExcel = esperado.hijos.gt(0)
        ? hijos.div(esperado.hijos)
        : D(0);
      if (diferencia.abs().gt(D(1))) {
        comparaciones.push({
          concepto: hijosReferencia.origen === 'equivalentes_mensuales' || hijosReferencia.origen === 'evento_carga_familiar'
            ? `Hijos (${cantidad.toDecimalPlaces(2).toFixed()} hijo/s equivalentes)`
            : `Hijos (${cantidad.toFixed(0)} hijo/s)`,
          mes: MESES[mes - 1],
          esperado: numero(esperadoHijos),
          informado: numero(hijos),
          diferencia: numero(diferencia),
          formula_spec: 'Parametro hijos Art. 30 acumulado x cantidad de hijos detectada',
          formula_detallada: `Hijos esperado = parametro Art. 30 acumulado por hijo para ${MESES[mes - 1]} x cantidad de hijos detectada`,
          formula_operacion: 'parametro_por_cantidad',
          formula_valores: {
            parametro_por_hijo: numero(esperado.hijos),
            cantidad_hijos_detectada: hijosReferencia.origen === 'equivalentes_mensuales' || hijosReferencia.origen === 'evento_carga_familiar'
              ? numero(cantidad)
              : Number(cantidad.toFixed(0)),
            cantidad_hijos_origen: hijosReferencia.origen === 'cantidad_fija_datos_complementarios'
              ? 'datos_complementarios'
              : hijosReferencia.origen === 'sin_datos'
              ? (cantidadManual !== null ? 'datos_complementarios' : 'acumuladores_previos')
              : hijosReferencia.origen,
            acumulado_esperado: numero(esperadoHijos),
            acumulado_informado_excel: numero(hijos),
            cantidad_equivalente_informada: numero(cantidadEquivalenteExcel),
            equivalentes_por_mes: hijosReferencia.equivalentes_por_mes,
            evento_carga_familiar: hijosReferencia.evento,
          },
          por_que_revisar: hijosReferencia.detalle ?? (cantidadManual !== null
            ? `El dato complementario informa ${cantidad.toFixed(0)} hijo(s). Para ${MESES[mes - 1]} el spec espera ${esperado.hijos.toFixed(2)} por hijo. El Excel informa ${hijos.toFixed(2)}, equivalente aproximadamente a ${cantidadEquivalenteExcel.toDecimalPlaces(2).toFixed(2)} hijo(s).`
            : `El motor detecto ${cantidad.toFixed(0)} hijo(s) por los acumuladores previos. Para ${MESES[mes - 1]} el spec espera ${esperado.hijos.toFixed(2)} por hijo. El Excel informa ${hijos.toFixed(2)}, equivalente aproximadamente a ${cantidadEquivalenteExcel.toDecimalPlaces(2).toFixed(2)} hijo(s).`),
          campos_a_revisar: ['hijos'],
        });
      }
    }

    const conyuge = suma('conyuge');
    if (conyuge.abs().gt(tol)) {
      const diferencia = conyuge.minus(esperado.conyuge);
      if (diferencia.abs().gt(D(1))) {
        comparaciones.push({
          concepto: 'Conyuge',
          mes: MESES[mes - 1],
          esperado: numero(esperado.conyuge),
          informado: numero(conyuge),
          diferencia: numero(diferencia),
          formula_spec: 'Parametro conyuge Art. 30 acumulado',
          formula_detallada: `Conyuge esperado = parametro acumulado Art. 30 vigente para ${MESES[mes - 1]}`,
          formula_operacion: 'parametro_acumulado',
          formula_valores: {
            parametro_acumulado: numero(esperado.conyuge),
            acumulado_informado_excel: numero(conyuge),
          },
          por_que_revisar: 'El acumulado de conyuge informado en el Excel no coincide con el parametro Art. 30 cargado.',
          campos_a_revisar: ['conyuge'],
        });
      }
    }

    if (comparaciones.length) {
      const detalleComparaciones = comparaciones
        .map((c) => `${c.concepto}: acumulado Excel ${D(String(c.informado)).toFixed(2)} vs parametro ${D(String(c.esperado)).toFixed(2)} (dif ${D(String(c.diferencia)).toFixed(2)})`)
        .join('; ');

      return {
        codigo: 'V17_ACTUALIZACION_SEMESTRAL_ART30',
        estado: 'ERROR',
        severidad: 'ALTA',
        tipo_hallazgo: 'V17_ART30_PARAMETROS_SEMESTRALES_INCONSISTENTES',
        detalle: `Los acumuladores Art. 30 no coinciden con Deducciones-personales-art-30-jul-dic-2026.pdf para ${MESES[mes - 1]}: ${detalleComparaciones}`,
        campos_a_revisar: [
          ...new Set(comparaciones.flatMap((c) => c.campos_a_revisar as string[])),
        ],
        comparaciones,
      };
    }

    return {
      codigo: 'V17_ACTUALIZACION_SEMESTRAL_ART30',
      estado: 'OK',
      detalle: 'Los acumuladores Art. 30 del periodo liquidado coinciden con los parametros julio-diciembre 2026 cargados.',
    };
  }
  v10(liq: LiquidacionNormalizada, c: CalculoGanancias, tol: Decimal): ResultadoValidacion {
    const papel = liq.papel_trabajo_asis ?? {};
    const modo = liq.config_cliente?.modo_saldo_favor ?? null;
    const retencionReferencia = c.retencion_calculada;
    const retencionDeclarada =
      papel.retencion_del_mes_efectiva ??
      papel.retencion_del_mes_calculada ??
      c.retencion_excel;
    const retencionEfectiva = papel.retencion_del_mes_efectiva ?? null;
    const diferencia = retencionReferencia.minus(retencionDeclarada);
    const signo = (x: Decimal) => x.gt(tol) ? 1 : x.lt(tol.neg()) ? -1 : 0;

    const base = {
      codigo: 'V10_RETENCION',
      retencion_referencia: numero(retencionReferencia),
      retencion_declarada: numero(retencionDeclarada),
      retencion_efectiva_informada: retencionEfectiva ? numero(retencionEfectiva) : null,
      modo_saldo_favor: modo,
      diferencia: numero(diferencia),
      tolerancia: numero(tol),
    };

    const comparacionRetencion = {
      concepto: 'Retencion del mes',
      mes: MESES[(liq.metadata.mes_liquidacion ?? 1) - 1],
      esperado: numero(retencionReferencia),
      informado: numero(retencionDeclarada),
      diferencia: numero(diferencia),
      formula_spec: 'Retencion calculada = impuesto determinado acumulado - retenciones anteriores',
      formula_detallada: 'Retencion del mes esperada = impuesto determinado acumulado - retenciones anteriores',
      formula_operacion: 'impuesto_menos_retenciones',
      formula_valores: {
        impuesto_determinado_acumulado: numero(c.impuesto_determinado_calculado),
        retenciones_anteriores: numero(c.retenciones_anteriores),
        retencion_calculada: numero(retencionReferencia),
        retencion_informada_excel: numero(retencionDeclarada),
      },
      por_que_revisar: 'La retencion que calcula el motor se obtiene restando las retenciones anteriores al impuesto determinado acumulado.',
      campos_a_revisar: ['impuesto_calculado', 'retencion_practicada', 'config_cliente.modo_saldo_favor'],
    };

    if (retencionReferencia.lt(tol.neg())) {
      if (!modo || !['compensar', 'devolver', 'saldo_para_siradig'].includes(String(modo))) {
        return {
          ...base,
          estado: 'NO_EVALUADA',
          datos_faltantes: ['config_cliente.modo_saldo_favor'],
          saldo_a_favor_generado: numero(retencionReferencia.abs()),
          opciones_requeridas: ['compensar', 'devolver'],
          accion_recomendada: 'Completar modo_saldo_favor en Datos complementarios del cliente.',
          comparaciones: [comparacionRetencion],
          detalle: 'La retencion calculada por el motor da saldo a favor del empleado. Para saber si la retencion informada por el Excel es correcta falta configurar modo_saldo_favor del cliente: compensar o devolver. Mientras ese dato no este informado, V10 queda pendiente por datos. No se marca como error porque informar 0 puede ser correcto si el cliente compensa saldos en meses siguientes.',
        };
      }

      const efectivaEsperada =
        modo === 'compensar' || modo === 'saldo_para_siradig'
          ? D(0)
          : retencionReferencia;

      const efectivaInformada = retencionEfectiva ?? retencionDeclarada;

      if (efectivaInformada.minus(efectivaEsperada).abs().gt(tol)) {
        return {
          ...base,
          estado: 'ERROR',
          severidad: 'ALTA',
          tipo_hallazgo: 'V10_RETENCION_EFECTIVA_INCONSISTENTE',
          retencion_efectiva_esperada: numero(efectivaEsperada),
          retencion_efectiva_informada: numero(efectivaInformada),
          saldo_a_favor_generado: numero(retencionReferencia.abs()),
          comparaciones: [comparacionRetencion],
          detalle: 'La retencion efectiva aplicada no respeta el modo_saldo_favor informado para una retencion calculada negativa.',
        };
      }

      return {
        ...base,
        estado: 'OK',
        retencion_efectiva_esperada: numero(efectivaEsperada),
        saldo_a_favor_generado: numero(retencionReferencia.abs()),
        detalle: 'La retencion negativa se trata de forma consistente con el modo_saldo_favor informado.',
      };
    }

    if (signo(retencionReferencia) !== signo(retencionDeclarada)) {
      return {
        ...base,
        estado: 'ERROR',
        severidad: 'CRITICA',
        tipo_hallazgo: 'V10_INVERSION_SIGNO_RETENCION',
        comparaciones: [comparacionRetencion],
        detalle: 'La retencion declarada por el sistema auditado y la retencion de referencia tienen signo distinto. Segun el spec, esto puede indicar saldo a favor enmascarado o tratamiento incorrecto de la retencion efectiva.',
      };
    }

    return {
      ...base,
      estado: 'OK',
      detalle: 'No se detecta saldo a favor enmascarado ni inversion de signo en la retencion del mes. La retencion informada se conserva como evidencia del sistema auditado.',
    };
  }
  tope(liq:LiquidacionNormalizada,c:CalculoGanancias):ResultadoValidacion{const mes=liq.metadata.mes_liquidacion??0,a=liq.acumuladores.remuneraciones_con_aporte, bruto=a&&mes?a.valores[MESES[mes-1]]:undefined;if(!bruto||bruto.lte(0))return{codigo:'V11_TOPE_LCT_35',estado:'NO_EVALUADA',detalle:'No se pudo evaluar el Tope LCT 35% porque el Excel/backend no informa el bruto mensual necesario.',retencion_calculada:numero(c.retencion_calculada)};const tope=bruto.mul('0.35').toDecimalPlaces(2),ex=Decimal.max(c.retencion_calculada.minus(tope),0);return{codigo:'V11_TOPE_LCT_35',estado:ex.gt(0)?'ADVERTENCIA':'OK',detalle:ex.gt(0)?'La retencion calculada supera el 35% del bruto mensual. El excedente deberia quedar pendiente para meses siguientes segun el control LCT 35%.':'La retencion calculada no supera el 35% del bruto mensual.',bruto_mensual:numero(bruto),tope_35:numero(tope),retencion_calculada:numero(c.retencion_calculada),excedente_sobre_tope:numero(ex)};}
  v9(liq: LiquidacionNormalizada, tol: Decimal): ResultadoValidacion | null {
    const politica = liq.config_cliente?.poliza_seguro_cobra_sobre_sac;
    const seguros = liq.acumuladores.seguros_de_retiro;
    const mes = liq.metadata.mes_liquidacion ?? 0;
    if (!politica || !seguros || mes < 6) return null;

    const base = MESES.slice(0, 5).map(m => seguros.valores[m] ?? D(0)).filter(v => v.gt(tol));
    if (!base.length) return null;

    const promedio = base.reduce((s, v) => s.plus(v), D(0)).div(base.length);
    const junio = seguros.valores.junio ?? D(0);
    const duplica = promedio.gt(0) && junio.gt(promedio.mul('1.5'));
    const cobraSobreSac = ['true', 'si', 'sí', '1'].includes(String(politica).toLowerCase());

    const salida = {
      codigo: 'V9_SOBREPRIMA_SEGURO_SAC',
      cuota_promedio_enero_mayo: numero(promedio),
      seguro_junio: numero(junio),
      poliza_seguro_cobra_sobre_sac: politica,
    };

    if (duplica && !cobraSobreSac) {
      return {
        ...salida,
        estado: 'ADVERTENCIA',
        severidad: 'INFORMATIVA',
        tipo_hallazgo: 'V9_SOBREPRIMA_SEGURO_SAC',
        detalle: 'La cuota de seguro de junio supera 1,5 veces el promedio enero-mayo, pero la configuracion no declara que la poliza cobre sobre SAC.',
      };
    }

    if (!duplica && cobraSobreSac) {
      return {
        ...salida,
        estado: 'ADVERTENCIA',
        severidad: 'INFORMATIVA',
        tipo_hallazgo: 'V9_POLIZA_SAC_SIN_SOBREPRIMA_VISIBLE',
        detalle: 'La configuracion indica que la poliza cobra sobre SAC, pero no se detecta sobreprima significativa en junio.',
      };
    }

    return {
      ...salida,
      estado: 'OK',
      detalle: 'La prima de seguro es consistente con la configuracion informada para SAC.',
    };
  }
  ejecutar(liq: LiquidacionNormalizada, sac: Record<string, any>, c: CalculoGanancias, tol: Decimal) {
    return [
      this.v1(liq, tol),
      this.v2(liq, c, tol),
      this.v3(liq, tol),
      this.v6(liq, tol),
      this.v8(sac),
      this.v4(liq, c, tol),
      this.v9(liq, tol),
      this.v10(liq, c, tol),
      this.tope(liq, c),
      this.v17(liq, tol),
    ].filter((v): v is ResultadoValidacion => v !== null);
  }
  veredicto(v: ResultadoValidacion[]) {
    const estados = new Set(
      v
        .filter(x => !['V11_TOPE_LCT_35', 'V4_ESCALA_ART94'].includes(x.codigo))
        .map(x => x.estado),
    );

    return estados.has('ERROR')
      ? 'CON_ERRORES_CRITICOS'
      : estados.has('NO_EVALUADA')
        ? 'REQUIERE_DATOS_COMPLEMENTARIOS'
      : estados.has('ADVERTENCIA')
        ? 'CON_HALLAZGOS_MENORES'
        : v.some(x => x.estado === 'ADVERTENCIA')
          ? 'CON_HALLAZGOS_MENORES'
          : 'CORRECTO';
  }
  v4(liq: LiquidacionNormalizada, c: CalculoGanancias, tol: Decimal): ResultadoValidacion | null {
    const p: any = liq.papel_trabajo_asis ?? liq.papel_trabajo ?? {};
    const minimo = p.escala_minimo_tramo ?? null;
    const porcentaje = p.porcentaje_tramo ?? p.escala_porcentaje ?? null;
    const fijo = p.importe_fijo_tramo ?? p.escala_importe_fijo ?? null;
    const faltantes = [
      ['escala_minimo_tramo', minimo],
      ['escala_porcentaje', porcentaje],
      ['escala_importe_fijo', fijo],
    ].filter(([, valor]) => !valor).map(([campo]) => campo);
    const t = c.tramo_escala;
    const escalaReferencia = {
      tramo: t.tramo,
      minimo: numero(t.minimo),
      maximo: t.maximo ? numero(t.maximo) : null,
      importe_fijo: numero(t.importe_fijo),
      porcentaje: numero(t.porcentaje),
      excedente_sobre_minimo: numero(c.ganancia_neta_base.minus(t.minimo)),
    };

    if (faltantes.length) {
      return {
        codigo: 'V4_ESCALA_ART94',
        estado: 'OK',
        severidad: 'INFORMATIVA',
        tipo_hallazgo: 'ESCALA_REFERENCIA_APLICADA',
        papel_auxiliar_detectado: false,
        detalle: 'El controlador aplico la escala Art. 94 de referencia cargada para el periodo. No se detecto tabla auxiliar lateral; esto es esperado para los Excel reales de entrada.',
        ganancia_neta_base: numero(c.ganancia_neta_base),
        tramo_referencia: t.tramo,
        escala_referencia: escalaReferencia,
      };
    }

    const diffs: string[] = [];

    const sobre = p.sobre_diferencia;
    const impuesto = p.impuesto_determinado;
    const pagos = p.pagos_anteriores;
    const retencion = p.retencion_del_mes ?? p.retencion_del_mes_calculada;

    // Evita falsos positivos del parser legacy cuando captura numeros de otras filas.
    if (minimo.lt(100000) || fijo.lt(10000) || porcentaje.lte(0) || porcentaje.gt(35)) {
      return null;
    }

    if (minimo.minus(t.minimo).abs().gt(tol)) {
      diffs.push(`minimo Excel ${minimo.toFixed(2)} vs referencia ${t.minimo.toFixed(2)}`);
    }

    if (porcentaje.minus(t.porcentaje).abs().gt(tol)) {
      diffs.push(`porcentaje Excel ${porcentaje.toFixed(2)}% vs referencia ${t.porcentaje.toFixed(2)}%`);
    }

    if (fijo.minus(t.importe_fijo).abs().gt(tol)) {
      diffs.push(`importe fijo Excel ${fijo.toFixed(2)} vs referencia ${t.importe_fijo.toFixed(2)}`);
    }

    // Evita falsos positivos si el parser captura una tabla mensual y no el bloque lateral.
if (porcentaje.lte(0) || porcentaje.gt(35)) {
  return null;
}

// Si tenemos "sobre diferencia", debe cerrar contra la ganancia neta base.
if (sobre && minimo.plus(sobre).minus(c.ganancia_neta_base).abs().gt(D(1))) {
  return null;
}

// Si tenemos impuesto determinado, debe cerrar contra la formula del papel.
if (sobre && impuesto) {
  const impuestoPapelEsperado = fijo.plus(sobre.mul(porcentaje).div(100));

  if (impuestoPapelEsperado.minus(impuesto).abs().gt(D(1))) {
    return null;
  }
}

if (!diffs.length) {
  return {
    codigo: 'V4_ESCALA_ART94',
    estado: 'OK',
    severidad: 'INFORMATIVA',
    tipo_hallazgo: 'ESCALA_AUXILIAR_COINCIDE_CON_REFERENCIA',
    papel_auxiliar_detectado: true,
    detalle: 'La tabla auxiliar detectada coincide con la escala Art. 94 de referencia aplicada por el controlador.',
    ganancia_neta_base: numero(c.ganancia_neta_base),
    tramo_referencia: t.tramo,
    escala_referencia: escalaReferencia,
  };
}

    return {
      codigo: 'V4_ESCALA_ART94',
      estado: 'ADVERTENCIA',
      severidad: 'ALTA',
      requiere_confirmacion_normativa: true,
      tipo_hallazgo: 'ESCALA_EXCEL_DISTINTA_A_ESCALA_REFERENCIA',
      papel_auxiliar_detectado: true,
      detalle: `La tabla auxiliar lateral difiere de la escala Art. 94 versionada aplicada por el controlador: ${diffs.join('; ')}. La tabla auxiliar se considera material de prueba o control manual; no modifica el calculo del controlador.`,
      ganancia_neta_base: numero(c.ganancia_neta_base),
      tramo_referencia: t.tramo,
      escala_referencia: escalaReferencia,
      escala_papel: {
        minimo: numero(minimo),
        importe_fijo: numero(fijo),
        porcentaje: numero(porcentaje),
        sobre_diferencia: sobre ? numero(sobre) : null,
        impuesto_determinado: impuesto ? numero(impuesto) : null,
        pagos_anteriores: pagos ? numero(pagos) : null,
        retencion_del_mes: retencion ? numero(retencion) : null,
      },
      diferencia_impuesto: impuesto ? numero(c.impuesto_determinado_calculado.minus(impuesto)) : null,
      diferencia_retencion_papel_vs_referencia: retencion ? numero(c.retencion_calculada.minus(retencion)) : null,
    };
  }

  private decimalOpcional(valor: unknown): Decimal | null {
    if (valor === null || valor === undefined || valor === '') return null;
    if (valor instanceof Decimal) return valor;
    try {
      if (typeof valor === 'string') {
        const texto = valor.trim();
        if (!texto) return null;
        const sinSimbolos = texto
          .replace(/\$/g, '')
          .replace(/\s/g, '');
        const limpio = sinSimbolos.includes(',')
          ? sinSimbolos.replace(/\./g, '').replace(',', '.')
          : sinSimbolos;
        if (/^-?\d+(\.\d+)?$/.test(limpio)) return D(limpio);
      }
      return D(String(valor));
    } catch {
      return null;
    }
  }

  private referenciaHijosV17(
    liq: LiquidacionNormalizada,
    mes: number,
    parametroAcumuladoMes: Decimal,
    sumaHasta: (clave: string, hasta: number) => Decimal,
  ): {
    origen: string;
    esperado: Decimal | null;
    cantidad_representativa: Decimal | null;
    equivalentes_por_mes?: Record<string, number>;
    evento?: Record<string, unknown> | null;
    detalle?: string;
  } {
    const equivalentesMensuales = this.equivalentesHijosMensuales(liq, mes);
    if (equivalentesMensuales) {
      const esperado = equivalentesMensuales.reduce(
        (total, cantidad, indice) => total.plus(this.parametroHijoMensual(indice + 1).mul(cantidad)),
        D(0),
      );
      const cantidadRepresentativa = parametroAcumuladoMes.gt(0)
        ? esperado.div(parametroAcumuladoMes)
        : D(0);

      return {
        origen: 'equivalentes_mensuales',
        esperado,
        cantidad_representativa: cantidadRepresentativa,
        equivalentes_por_mes: Object.fromEntries(
          equivalentesMensuales.map((cantidad, indice) => [MESES[indice], numero(cantidad)]),
        ),
        detalle: `La referencia de hijos se calculo con hijos equivalentes informados mes a mes en Datos Extras. El acumulado esperado hasta ${MESES[mes - 1]} es ${esperado.toFixed(2)}.`,
      };
    }

    const equivalentesPorEvento = this.equivalentesHijosPorEvento(liq, mes);
    if (equivalentesPorEvento) {
      const esperado = equivalentesPorEvento.equivalentes.reduce(
        (total, cantidad, indice) => total.plus(this.parametroHijoMensual(indice + 1).mul(cantidad)),
        D(0),
      );
      const cantidadRepresentativa = parametroAcumuladoMes.gt(0)
        ? esperado.div(parametroAcumuladoMes)
        : D(0);

      return {
        origen: 'evento_carga_familiar',
        esperado,
        cantidad_representativa: cantidadRepresentativa,
        equivalentes_por_mes: Object.fromEntries(
          equivalentesPorEvento.equivalentes.map((cantidad, indice) => [MESES[indice], numero(cantidad)]),
        ),
        evento: equivalentesPorEvento.evento,
        detalle: `La referencia de hijos se calculo con el evento informado en Datos Extras: ${equivalentesPorEvento.evento.tipo} desde ${equivalentesPorEvento.evento.desde_mes}. El acumulado esperado hasta ${MESES[mes - 1]} es ${esperado.toFixed(2)}.`,
      };
    }

    const cantidadManual = this.cantidadHijosManual(liq);
    if (cantidadManual !== null) {
      return {
        origen: 'cantidad_fija_datos_complementarios',
        esperado: parametroAcumuladoMes.mul(cantidadManual),
        cantidad_representativa: D(cantidadManual),
      };
    }

    return {
      origen: 'sin_datos',
      esperado: null,
      cantidad_representativa: null,
    };
  }

  private equivalentesHijosMensuales(liq: LiquidacionNormalizada, mes: number): Decimal[] | null {
    const valores = MESES.slice(0, mes).map((nombreMes) =>
      this.decimalOpcional(liq.legajo_empleado?.[`cargas_familia_hijos_equivalentes_${nombreMes}`]),
    );

    if (valores.every((valor) => valor !== null)) return valores as Decimal[];

    const general = this.decimalOpcional(liq.legajo_empleado?.cargas_familia_hijos_equivalentes);
    if (general !== null) return Array.from({ length: mes }, () => general);

    return null;
  }

  private equivalentesHijosPorEvento(
    liq: LiquidacionNormalizada,
    mes: number,
  ): { equivalentes: Decimal[]; evento: Record<string, unknown> } | null {
    const eventoRaw = liq.legajo_empleado?.cargas_familia_hijos_evento;
    const evento = String(eventoRaw ?? '').trim().toLowerCase();
    if (!evento) return null;

    const desdeMes = this.indiceMes(liq.legajo_empleado?.cargas_familia_hijos_desde_mes);
    const cantidadBase = this.decimalOpcional(liq.legajo_empleado?.cargas_familia_cant_hijos);
    if (!desdeMes || cantidadBase === null) return null;

    const cantidadEvento =
      this.decimalOpcional(liq.legajo_empleado?.cargas_familia_hijos_evento_cantidad) ??
      this.cantidadDesdeTexto(evento) ??
      D(1);
    const esBaja = evento.includes('baja');
    const esAlta = evento.includes('alta');
    if (!esBaja && !esAlta) return null;

    const equivalentes = MESES.slice(0, mes).map((_, indice) => {
      const numeroMes = indice + 1;
      if (esBaja) return numeroMes >= desdeMes ? Decimal.max(0, cantidadBase.minus(cantidadEvento)) : cantidadBase;
      return numeroMes >= desdeMes ? cantidadBase : Decimal.max(0, cantidadBase.minus(cantidadEvento));
    });

    return {
      equivalentes,
      evento: {
        tipo: esBaja ? 'baja' : 'alta',
        desde_mes: MESES[desdeMes - 1],
        cantidad_evento: numero(cantidadEvento),
        cantidad_base: numero(cantidadBase),
        motivo: liq.legajo_empleado?.cargas_familia_hijos_motivo ?? null,
      },
    };
  }

  private parametroHijoMensual(mes: number): Decimal {
    if (mes <= 6) return ART30_2026_S2_ACUMULADO[6].hijos.div(6);
    return ART30_2026_S2_ACUMULADO[mes].hijos.minus(ART30_2026_S2_ACUMULADO[mes - 1].hijos);
  }

  private indiceMes(valor: unknown): number | null {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 1 && valor <= 12) return valor;
    const texto = String(valor).trim().toLowerCase();
    const numeroTexto = Number(texto);
    if (Number.isInteger(numeroTexto) && numeroTexto >= 1 && numeroTexto <= 12) return numeroTexto;
    const indice = MESES.findIndex((mes) => mes === texto);
    return indice >= 0 ? indice + 1 : null;
  }

  private cantidadDesdeTexto(texto: string): Decimal | null {
    const match = texto.match(/(\d+(?:[,.]\d+)?)/);
    return match ? this.decimalOpcional(match[1]) : null;
  }

  private cantidadHijosManual(liq: LiquidacionNormalizada): number | null {
    const valor = liq.legajo_empleado?.cargas_familia_cant_hijos;
    if (valor === null || valor === undefined || valor === '') return null;
    const n = Number(valor);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.trunc(n);
  }

  private mesSinDatos(liq: LiquidacionNormalizada, mes: number): boolean {
    const nombre = MESES[mes - 1];
    const claves = ['remuneraciones_con_aporte', 'ganancia_neta_fila35', 'retencion_practicada'];
    return claves.every((clave) => (liq.acumuladores[clave]?.valores[nombre] ?? D(0)).abs().lte(0));
  }

  private ultimoMesConDatos(liq: LiquidacionNormalizada): number | null {
    for (let i = MESES.length - 1; i >= 0; i--) {
      const mes = MESES[i];
      const claves = ['remuneraciones_con_aporte', 'ganancia_neta_fila35', 'retencion_practicada'];
      if (claves.some((clave) => (liq.acumuladores[clave]?.valores[mes] ?? D(0)).abs().gt(0))) {
        return i + 1;
      }
    }
    return null;
  }

  private diagnosticoV6(
    valores: Record<string, Decimal>,
    candidatos: Record<string, Decimal[]>,
    informado: Decimal,
    tol: Decimal,
  ): {
    causa_probable: string;
    formula_probable: string;
    campos_a_revisar: string[];
    componentes_formula_probable: Record<string, number>;
    total_base_probable: Decimal;
    valor_probable: Decimal;
  } {
    const clavesBase = [
      'ganancia_no_imponible',
      'conyuge',
      'hijos',
      'otras_cargas',
      'deduccion_especial',
    ];
    const formulaSpec = '(ganancia_no_imponible + conyuge + hijos + otras_cargas + deduccion_especial) / 12';
    const variantes: Array<{
      esperado: Decimal;
      causa_probable: string;
      formula_probable: string;
      campos_a_revisar: string[];
      componentes_formula_probable: Record<string, Decimal>;
    }> = [];
    const sumar = (base: Record<string, Decimal>) =>
      clavesBase.reduce((s, c) => s.plus(base[c] ?? D(0)), D(0)).div(12);

    for (const campo of clavesBase) {
      if ((valores[campo] ?? D(0)).abs().lte(tol)) {
        continue;
      }

      const ajustado = { ...valores, [campo]: D(0) };
      variantes.push({
        esperado: sumar(ajustado),
        causa_probable: `La 12va informada parece calculada sin ${campo}.`,
        formula_probable: `${formulaSpec} excluyendo ${campo}`,
        campos_a_revisar: [campo, 'doceava_parte_art30'],
        componentes_formula_probable: ajustado,
      });
    }

    for (const campoFaltante of clavesBase) {
      if ((valores[campoFaltante] ?? D(0)).abs().gt(tol)) {
        continue;
      }

      for (const candidato of candidatos[campoFaltante] ?? []) {
        const conCandidato = { ...valores, [campoFaltante]: candidato };
        variantes.push({
          esperado: sumar(conCandidato),
          causa_probable: `La 12va informada parece usar ${campoFaltante}=${candidato.toFixed(2)} aunque el mes informa 0.`,
          formula_probable: `${formulaSpec} usando ${campoFaltante}=${candidato.toFixed(2)}`,
          campos_a_revisar: [campoFaltante, 'doceava_parte_art30'],
          componentes_formula_probable: conCandidato,
        });

        for (const campoExcluido of clavesBase) {
          if (campoExcluido === campoFaltante || (valores[campoExcluido] ?? D(0)).abs().lte(tol)) {
            continue;
          }

          const reemplazoConExclusion = { ...conCandidato, [campoExcluido]: D(0) };
          variantes.push({
            esperado: sumar(reemplazoConExclusion),
            causa_probable: `La 12va informada parece usar ${campoFaltante}=${candidato.toFixed(2)} aunque el mes informa 0 y no incluir ${campoExcluido}.`,
            formula_probable: `${formulaSpec} usando ${campoFaltante}=${candidato.toFixed(2)} y excluyendo ${campoExcluido}`,
            campos_a_revisar: [campoFaltante, campoExcluido, 'doceava_parte_art30'],
            componentes_formula_probable: reemplazoConExclusion,
          });
        }
      }
    }

    const coincidencias = variantes
      .map(v => ({ ...v, diferencia: informado.minus(v.esperado).abs() }))
      .filter(v => v.diferencia.lte(tol))
      .sort((a, b) =>
        a.campos_a_revisar.length - b.campos_a_revisar.length ||
        a.diferencia.comparedTo(b.diferencia),
      );

    if (coincidencias.length) {
      const mejor = coincidencias[0];
      const totalBaseProbable = clavesBase.reduce(
        (s, c) => s.plus(mejor.componentes_formula_probable[c] ?? D(0)),
        D(0),
      );
      return {
        causa_probable: mejor.causa_probable,
        formula_probable: mejor.formula_probable,
        campos_a_revisar: mejor.campos_a_revisar,
        componentes_formula_probable: Object.fromEntries(
          clavesBase.map(c => [c, numero(mejor.componentes_formula_probable[c] ?? D(0))]),
        ),
        total_base_probable: totalBaseProbable,
        valor_probable: mejor.esperado,
      };
    }

    const totalBase = clavesBase.reduce((s, c) => s.plus(valores[c] ?? D(0)), D(0));
    return {
      causa_probable: 'No se encontro una formula alternativa simple que explique la diferencia.',
      formula_probable: formulaSpec,
      campos_a_revisar: [
        'ganancia_no_imponible',
        'conyuge',
        'hijos',
        'otras_cargas',
        'deduccion_especial',
        'doceava_parte_art30',
      ],
      componentes_formula_probable: Object.fromEntries(
        clavesBase.map(c => [c, numero(valores[c] ?? D(0))]),
      ),
      total_base_probable: totalBase,
      valor_probable: totalBase.div(12),
    };
  }

  private explicacionAritmeticaV6(
    totalBaseEsperada: Decimal,
    esperado: Decimal,
    informado: Decimal,
    diag: {
      causa_probable: string;
      total_base_probable: Decimal;
      valor_probable: Decimal;
    },
  ): string {
    const diferenciaProbable = informado.minus(diag.valor_probable).abs();
    const coincideConFormulaProbable = diferenciaProbable.lte(D('0.05'));
    const baseEsperada = totalBaseEsperada.toFixed(2);
    const baseProbable = diag.total_base_probable.toFixed(2);
    const esperadoTexto = esperado.toFixed(2);
    const informadoTexto = informado.toFixed(2);
    const probableTexto = diag.valor_probable.toFixed(2);

    if (coincideConFormulaProbable) {
      return `El valor esperado sale de dividir la base informada del mes (${baseEsperada}) por 12: ${esperadoTexto}. El valor informado por el Excel (${informadoTexto}) coincide con otra base probable (${baseProbable}) dividida por 12: ${probableTexto}. ${diag.causa_probable}`;
    }

    return `El valor esperado sale de dividir la base informada del mes (${baseEsperada}) por 12: ${esperadoTexto}. El Excel informa ${informadoTexto}, pero no se encontro una formula alternativa simple que explique exactamente ese importe. ${diag.causa_probable}`;
  }
}
