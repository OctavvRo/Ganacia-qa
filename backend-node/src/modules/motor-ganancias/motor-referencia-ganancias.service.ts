import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { D, centavos, numero } from '../../common/decimal/decimal.util';
import { LiquidacionNormalizada, MESES, Mes, PasoCalculo, TramoEscala } from './dominio';
import { EscalaArt94Service } from './escala-art94.service';

export interface ReporteDebeSer {
  pasos: PasoCalculo[];
  total_ingresos: Decimal;
  ganancia_neta_previa: Decimal;
  ganancia_neta: Decimal;
  impuesto_determinado: Decimal;
  retencion_del_mes: Decimal;
  retencion_efectiva: Decimal;
  saldo_a_favor_acumulado: Decimal;
  pagos_anteriores: Decimal;
  sac_computable: Decimal;
  deducciones_personales: Decimal;
  deducciones_generales: Decimal;
  deducciones_art30: Decimal;
  tramo_escala: TramoEscala;
}

@Injectable()
export class MotorReferenciaGananciasService {
  constructor(private readonly escalaService: EscalaArt94Service) {}

  calcular(liq: LiquidacionNormalizada, mes = liq.metadata.mes_liquidacion ?? 12): ReporteDebeSer {
    const periodo = liq.metadata.periodo_fiscal ?? 2026;
    const modoSaldoFavor = liq.config_cliente?.modo_saldo_favor ?? 'compensar';
    const modalidadSac = liq.config_cliente?.modalidad_sac ?? 'devengado';

    const sumOf = (clave: string): Decimal => {
      const acum = liq.acumuladores[clave];
      if (!acum) return D(0);
      let sum = D(0);
      for (let i = 0; i < mes; i++) {
        sum = sum.plus(acum.valores[MESES[i]] ?? 0);
      }
      return sum;
    };

    const getMensual = (clave: string): Decimal => {
      const acum = liq.acumuladores[clave];
      if (!acum) return D(0);
      let sum = D(0);
      for (let i = 0; i < mes; i++) {
        sum = sum.plus(acum.valores[MESES[i]] ?? 0);
      }
      return sum.div(mes);
    };

    // ── Paso 2: Cálculo del SAC computable ────────────────────────────────────
    let sacComputable = D(0);
    let sumAnulaciones = D(0);
    if (modalidadSac === 'devengado') {
      let sumSac = D(0);
      for (let i = 0; i < mes; i++) {
        const val = liq.acumuladores.sac?.valores[MESES[i]] ?? D(0);
        sumSac = sumSac.plus(val);
        if (val.lt(0)) {
          sumAnulaciones = sumAnulaciones.plus(val.abs());
        }
      }
      sacComputable = centavos(sumSac.plus(sumAnulaciones));
    } else {
      sacComputable = centavos(sumOf('sac'));
    }

    const paso2: PasoCalculo = {
      paso: 2,
      descripcion: 'Cálculo del SAC computable',
      referencia_normativa: 'Art. 24, 82 inc. f) LIG; RG 5417 punto B.4',
      formula: modalidadSac === 'devengado'
        ? 'SAC_comp = Σ(fila_sac_meses) + Σ(anulaciones_en_meses_pago)'
        : 'SAC_comp = Σ(fila_sac_meses)',
      entradas: modalidadSac === 'devengado'
        ? {
            'Σ(fila_sac_meses)': sumOf('sac').toFixed(2),
            'Σ(anulaciones_en_meses_pago)': sumAnulaciones.toFixed(2),
          }
        : {
            'Σ(fila_sac_meses)': sumOf('sac').toFixed(2),
          },
      operacion: modalidadSac === 'devengado'
        ? `${sumOf('sac').toFixed(2)} + ${sumAnulaciones.toFixed(2)}`
        : `${sumOf('sac').toFixed(2)}`,
      resultado: sacComputable.toFixed(2),
    };

    // ── Paso 1: Composición del Total de Ingresos ─────────────────────────────
    const remCA = sumOf('remuneraciones_con_aporte');
    const remSA = sumOf('remuneraciones_sin_aporte');
    const remOE = sumOf('remuneraciones_otras_empresas');

    // Corrección V11 (haberes no habituales prorrateados con offset)
    let hnhAcum = D(0);
    let deltaHnhV11 = D(0);
    const hnhValores = liq.acumuladores.haberes_no_habituales?.valores;
    if (hnhValores) {
      let firstMonthWithVal = -1;
      for (let i = 0; i < 12; i++) {
        if ((hnhValores[MESES[i]] ?? D(0)).abs().gt(0.05)) {
          firstMonthWithVal = i;
          break;
        }
      }
      if (firstMonthWithVal >= 0 && firstMonthWithVal > mes - 1) {
        const cuota = hnhValores[MESES[firstMonthWithVal]] ?? D(0);
        deltaHnhV11 = cuota.mul(firstMonthWithVal - (mes - 1));
      }
      for (let i = 0; i < mes; i++) {
        hnhAcum = hnhAcum.plus(hnhValores[MESES[i]] ?? D(0));
      }
      hnhAcum = hnhAcum.plus(deltaHnhV11);
    }

    const totalIngresos = centavos(remCA.plus(remSA).plus(sacComputable).plus(hnhAcum).plus(remOE));

    const paso1: PasoCalculo = {
      paso: 1,
      descripcion: 'Composición del Total de Ingresos',
      referencia_normativa: 'Art. 82 LIG; RG 5417/2023 Anexo I punto A',
      formula: 'TI = Σ(RemCA) + Σ(RemSA) + SAC_computable + Σ(HNH) + Σ(RemOE)',
      entradas: {
        'Σ(RemCA)': remCA.toFixed(2),
        'Σ(RemSA)': remSA.toFixed(2),
        'SAC_computable': sacComputable.toFixed(2),
        'Σ(HNH)': hnhAcum.toFixed(2),
        'Σ(RemOE)': remOE.toFixed(2),
      },
      operacion: `${remCA.toFixed(2)} + ${remSA.toFixed(2)} + ${sacComputable.toFixed(2)} + ${hnhAcum.toFixed(2)} + ${remOE.toFixed(2)}`,
      resultado: totalIngresos.toFixed(2),
    };

    // ── Paso 3: Deducciones personales del Art. 82 ────────────────────────────
    const jub = sumOf('jubilacion');
    const os = sumOf('aportes_obra_social');
    const inssjp = sumOf('inssjp');
    const sind = sumOf('sindicatos');
    const jubOE = sumOf('jubilacion_otras_empresas');
    const osOE = sumOf('obra_social_otras_empresas');
    const deduccionesPersonales = centavos(jub.plus(os).plus(inssjp).plus(sind).plus(jubOE).plus(osOE));

    const paso3: PasoCalculo = {
      paso: 3,
      descripcion: 'Deducciones personales del Art. 82',
      referencia_normativa: 'Art. 82 inc. c) y d) LIG',
      formula: 'DP = Σ(Jub) + Σ(OS) + Σ(INSSJP) + Σ(Sindicatos) + Σ(JubOE) + Σ(OSOE)',
      entradas: {
        'Σ(Jub)': jub.toFixed(2),
        'Σ(OS)': os.toFixed(2),
        'Σ(INSSJP)': inssjp.toFixed(2),
        'Σ(Sindicatos)': sind.toFixed(2),
        'Σ(JubOE)': jubOE.toFixed(2),
        'Σ(OSOE)': osOE.toFixed(2),
      },
      operacion: `${jub.toFixed(2)} + ${os.toFixed(2)} + ${inssjp.toFixed(2)} + ${sind.toFixed(2)} + ${jubOE.toFixed(2)} + ${osOE.toFixed(2)}`,
      resultado: deduccionesPersonales.toFixed(2),
    };

    // ── Paso 6: 12va parte del Art. 30 ────────────────────────────────────────
    const gniMensual = getMensual('ganancia_no_imponible');
    const deMensual = getMensual('deduccion_especial');
    const conyugeMensual = getMensual('conyuge');
    const hijoMensual = getMensual('hijos');
    const otrasCargasMensual = getMensual('otras_cargas');

    const doceavaParteMensual = centavos(
      gniMensual.plus(deMensual).plus(conyugeMensual).plus(hijoMensual).plus(otrasCargasMensual).div(12)
    );
    const doceavaParteAcum = centavos(doceavaParteMensual.mul(mes));

    const paso6: PasoCalculo = {
      paso: 6,
      descripcion: '12va parte del Art. 30',
      referencia_normativa: 'Art. 30 último párrafo LIG',
      formula: '12va_mensual = (GNI_mensual + DE_mensual + Conyuge_mensual + Hijos_mensual + OtrasCargas_mensual) / 12',
      entradas: {
        'GNI_mensual': gniMensual.toFixed(2),
        'DE_mensual': deMensual.toFixed(2),
        'Conyuge_mensual': conyugeMensual.toFixed(2),
        'Hijos_mensual': hijoMensual.toFixed(2),
        'OtrasCargas_mensual': otrasCargasMensual.toFixed(2),
      },
      operacion: `(${gniMensual.toFixed(2)} + ${deMensual.toFixed(2)} + ${conyugeMensual.toFixed(2)} + ${hijoMensual.toFixed(2)} + ${otrasCargasMensual.toFixed(2)}) / 12`,
      resultado: doceavaParteAcum.toFixed(2),
    };

    // ── Paso 5: Deducciones del Art. 30 ───────────────────────────────────────
    const gniAcum = sumOf('ganancia_no_imponible');
    const deAcum = sumOf('deduccion_especial');
    const conyugeAcum = sumOf('conyuge');
    const hijosAcum = sumOf('hijos');
    const otrasCargasAcum = sumOf('otras_cargas');
    const deduccionesArt30 = centavos(gniAcum.plus(deAcum).plus(conyugeAcum).plus(hijosAcum).plus(otrasCargasAcum).plus(doceavaParteAcum));

    const paso5: PasoCalculo = {
      paso: 5,
      descripcion: 'Deducciones del Art. 30',
      referencia_normativa: 'Art. 30 LIG, actualización RG semestral',
      formula: 'D30 = Σ(GNI) + Σ(DE) + Σ(Conyuge) + Σ(Hijos) + Σ(OtrasCargas) + 12va_acum',
      entradas: {
        'Σ(GNI)': gniAcum.toFixed(2),
        'Σ(DE)': deAcum.toFixed(2),
        'Σ(Conyuge)': conyugeAcum.toFixed(2),
        'Σ(Hijos)': hijosAcum.toFixed(2),
        'Σ(OtrasCargas)': otrasCargasAcum.toFixed(2),
        '12va_acum': doceavaParteAcum.toFixed(2),
      },
      operacion: `${gniAcum.toFixed(2)} + ${deAcum.toFixed(2)} + ${conyugeAcum.toFixed(2)} + ${hijosAcum.toFixed(2)} + ${otrasCargasAcum.toFixed(2)} + ${doceavaParteAcum.toFixed(2)}`,
      resultado: deduccionesArt30.toFixed(2),
    };

    // ── Paso 7: Ganancia Neta Previa ──────────────────────────────────────────
    // Educativos y Domésticos se restan en este paso
    const sdTope = centavos(gniMensual.mul(12));
    const sdRaw = sumOf('servicios_domesticos');
    const sdComp = centavos(Decimal.min(sdRaw, sdTope));

    const educTope = centavos(gniMensual.mul(12).mul(0.40));
    const educRaw = sumOf('educacion');
    const educComp = centavos(Decimal.min(educRaw, educTope));

    const gananciaNetaPrevia = centavos(
      totalIngresos.minus(deduccionesPersonales).minus(sdComp).minus(educComp)
    );

    const paso7: PasoCalculo = {
      paso: 7,
      descripcion: 'Ganancia Neta Previa',
      referencia_normativa: 'RG 5417 Anexo I punto E',
      formula: 'GNP = TI - DP - Domésticos_comp - Educativos_comp',
      entradas: {
        'TI': totalIngresos.toFixed(2),
        'DP': deduccionesPersonales.toFixed(2),
        'Domésticos_comp': sdComp.toFixed(2),
        'Educativos_comp': educComp.toFixed(2),
      },
      operacion: `${totalIngresos.toFixed(2)} - ${deduccionesPersonales.toFixed(2)} - ${sdComp.toFixed(2)} - ${educComp.toFixed(2)}`,
      resultado: gananciaNetaPrevia.toFixed(2),
    };

    // ── Paso 4: Deducciones generales (con topes) ─────────────────────────────
    const segurosRetiro = sumOf('seguros_de_retiro');
    const segurosDC = sumOf('seguros_dc').plus(sumOf('primas_seguro'));
    const indumentaria = sumOf('indumentaria');
    const interesesHipotecarios = sumOf('intereses_hipotecarios');
    const otrasDeducciones = sumOf('otras_deducciones');

    // Alquileres limited to GNI anual
    const alquileresRaw = sumOf('alquileres_10_inquilino').plus(sumOf('alquiler'));
    const alquileresComp = centavos(Decimal.min(alquileresRaw, gniMensual.mul(12)));

    const deduccionesGeneralesSinLim = segurosRetiro
      .plus(segurosDC)
      .plus(indumentaria)
      .plus(alquileresComp)
      .plus(interesesHipotecarios)
      .plus(otrasDeducciones);

    // Limitados basados en GN
    let gnTemp = gananciaNetaPrevia.minus(deduccionesGeneralesSinLim).minus(deduccionesArt30);
    if (gnTemp.lt(0)) gnTemp = D(0);

    const donacionesRaw = sumOf('donaciones');
    const donacionesComp = centavos(Decimal.min(donacionesRaw, gnTemp.mul(0.05)));

    const deduccionesGenerales = centavos(deduccionesGeneralesSinLim.plus(donacionesComp));

    const paso4: PasoCalculo = {
      paso: 4,
      descripcion: 'Deducciones generales (con topes)',
      referencia_normativa: 'Art. 85 LIG; RG 5417 Anexo I punto D',
      formula: 'DG = SegurosRetiro + SegurosDC + Indumentaria + Alquileres_comp + Intereses_comp + Otras_comp + Donaciones_comp',
      entradas: {
        'SegurosRetiro': segurosRetiro.toFixed(2),
        'SegurosDC': segurosDC.toFixed(2),
        'Indumentaria': indumentaria.toFixed(2),
        'Alquileres_comp': alquileresComp.toFixed(2),
        'Intereses_comp': interesesHipotecarios.toFixed(2),
        'Otras_comp': otrasDeducciones.toFixed(2),
        'Donaciones_comp': donacionesComp.toFixed(2),
      },
      operacion: `${segurosRetiro.toFixed(2)} + ${segurosDC.toFixed(2)} + ${indumentaria.toFixed(2)} + ${alquileresComp.toFixed(2)} + ${interesesHipotecarios.toFixed(2)} + ${otrasDeducciones.toFixed(2)} + ${donacionesComp.toFixed(2)}`,
      resultado: deduccionesGenerales.toFixed(2),
    };

    // ── Paso 8: Ganancia Neta ─────────────────────────────────────────────────
    // CM Asistencial (prepaga) limited to 5% GN
    let gnPreCma = gananciaNetaPrevia.minus(deduccionesGenerales).minus(deduccionesArt30);
    if (gnPreCma.lt(0)) gnPreCma = D(0);

    const cmaRaw = sumOf('aportes_obra_social').plus(sumOf('gastos_medicos')); // prepaga/cuota médica
    const cmaComp = centavos(Decimal.min(cmaRaw, gnPreCma.mul(0.05)));

    let gananciaNeta = centavos(gnPreCma.minus(cmaComp));
    if (gananciaNeta.lt(0)) gananciaNeta = D(0);

    const paso8: PasoCalculo = {
      paso: 8,
      descripcion: 'Ganancia Neta',
      referencia_normativa: 'Art. 93 LIG',
      formula: 'GN = GNP - DG - D30 - CMA_comp',
      entradas: {
        'GNP': gananciaNetaPrevia.toFixed(2),
        'DG': deduccionesGenerales.toFixed(2),
        'D30': deduccionesArt30.toFixed(2),
        'CMA_comp': cmaComp.toFixed(2),
      },
      operacion: `${gananciaNetaPrevia.toFixed(2)} - ${deduccionesGenerales.toFixed(2)} - ${deduccionesArt30.toFixed(2)} - ${cmaComp.toFixed(2)}`,
      resultado: gananciaNeta.toFixed(2),
    };

    // ── Paso 9: Identificación del tramo de la escala Art. 94 ─────────────────
    const tramo = this.escalaService.buscar(gananciaNeta, periodo, mes);

    const paso9: PasoCalculo = {
      paso: 9,
      descripcion: 'Identificación del tramo de la escala Art. 94',
      referencia_normativa: 'Art. 94 LIG',
      formula: 'Buscar tramo T tal que T.mínimo <= GN < T.máximo',
      entradas: {
        'GN': gananciaNeta.toFixed(2),
      },
      operacion: `Lookup(${gananciaNeta.toFixed(2)}) en escala S1_2026`,
      resultado: `Tramo ${tramo.tramo} (alícuota ${tramo.porcentaje}%)`,
    };

    // ── Paso 10: Cálculo del impuesto determinado ────────────────────────────
    const sobreDiferencia = centavos(gananciaNeta.minus(tramo.minimo));
    const impuestoDeterminado = centavos(tramo.importe_fijo.plus(sobreDiferencia.mul(tramo.porcentaje).div(100)));

    const paso10: PasoCalculo = {
      paso: 10,
      descripcion: 'Cálculo del impuesto determinado',
      referencia_normativa: 'Art. 94 LIG',
      formula: 'Impuesto = T.importe_fijo + (GN - T.mínimo) * T.porcentaje / 100',
      entradas: {
        'T.importe_fijo': tramo.importe_fijo.toFixed(2),
        'T.mínimo': tramo.minimo.toFixed(2),
        'T.porcentaje': tramo.porcentaje.toFixed(2),
        'GN': gananciaNeta.toFixed(2),
      },
      operacion: `${tramo.importe_fijo.toFixed(2)} + (${gananciaNeta.toFixed(2)} - ${tramo.minimo.toFixed(2)}) * ${tramo.porcentaje.toFixed(2)} / 100`,
      resultado: impuestoDeterminado.toFixed(2),
    };

    // ── Paso 11: Pagos anteriores acumulados ──────────────────────────────────
    let pagosAnteriores = D(0);
    let saldoFavorAcumuladoPrevio = D(0);
    for (let i = 0; i < mes - 1; i++) {
      const val = liq.acumuladores.retencion_practicada?.valores[MESES[i]] ?? D(0);
      if (val.lt(0)) {
        if (modoSaldoFavor === 'compensar') {
          saldoFavorAcumuladoPrevio = saldoFavorAcumuladoPrevio.plus(val.abs());
        } else {
          pagosAnteriores = pagosAnteriores.plus(val);
        }
      } else {
        pagosAnteriores = pagosAnteriores.plus(val);
      }
    }
    pagosAnteriores = centavos(pagosAnteriores);

    const paso11: PasoCalculo = {
      paso: 11,
      descripcion: 'Pagos anteriores acumulados',
      referencia_normativa: 'RG 5417 Anexo I punto G',
      formula: 'Pagos_Anteriores = Σ(retenciones_practicadas_meses_previos)',
      entradas: {
        'Σ(retenciones_previas)': pagosAnteriores.toFixed(2),
      },
      operacion: `${pagosAnteriores.toFixed(2)}`,
      resultado: pagosAnteriores.toFixed(2),
    };

    // ── Paso 12: Retención del mes ────────────────────────────────────────────
    const retencionCalculada = centavos(impuestoDeterminado.minus(pagosAnteriores));
    let retencionEfectiva = retencionCalculada;
    let saldoFavorAcumulado = saldoFavorAcumuladoPrevio;

    if (retencionCalculada.lt(0)) {
      if (modoSaldoFavor === 'compensar') {
        retencionEfectiva = D(0);
        saldoFavorAcumulado = saldoFavorAcumulado.plus(retencionCalculada.abs());
      }
    }

    const paso12: PasoCalculo = {
      paso: 12,
      descripcion: 'Retención del mes',
      referencia_normativa: 'RG 5417 Anexo I punto H',
      formula: 'Ret_calc = Impuesto_Determinado - Pagos_Anteriores',
      entradas: {
        'Impuesto_Determinado': impuestoDeterminado.toFixed(2),
        'Pagos_Anteriores': pagosAnteriores.toFixed(2),
        'modo_saldo_favor': modoSaldoFavor,
      },
      operacion: `${impuestoDeterminado.toFixed(2)} - ${pagosAnteriores.toFixed(2)}`,
      resultado: `Calculada: ${retencionCalculada.toFixed(2)} | Efectiva: ${retencionEfectiva.toFixed(2)}`,
    };

    return {
      pasos: [paso1, paso2, paso3, paso4, paso5, paso6, paso7, paso8, paso9, paso10, paso11, paso12],
      total_ingresos: totalIngresos,
      ganancia_neta_previa: gananciaNetaPrevia,
      ganancia_neta: gananciaNeta,
      impuesto_determinado: impuestoDeterminado,
      retencion_del_mes: retencionCalculada,
      retencion_efectiva: retencionEfectiva,
      saldo_a_favor_acumulado: saldoFavorAcumulado,
      pagos_anteriores: pagosAnteriores,
      sac_computable: sacComputable,
      deducciones_personales: deduccionesPersonales,
      deducciones_generales: deduccionesGenerales,
      deducciones_art30: deduccionesArt30,
      tramo_escala: tramo,
    };
  }
}
