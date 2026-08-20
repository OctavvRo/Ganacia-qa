import { Injectable } from '@nestjs/common';

/**
 * Arma el snapshot tecnico que consume el frontend.
 *
 * La secuencia de pasos respeta los 12 pasos canonicos definidos por
 * spec-reporte-esueldos-auditoria.md. El frontend no calcula importes:
 * solo presenta estos valores y las validaciones devueltas por el backend.
 */
@Injectable()
export class SnapshotService {
  agregar(reporte: any) {
    const metadata = reporte.metadata ?? {};
    const calculo = reporte.calculo ?? reporte.calculo_parcial ?? {};
    const validaciones = reporte.validaciones ?? [];
    const controlTope = validaciones.find(
      (x: any) => x.codigo === 'V11_TOPE_LCT_35' || x.codigo === 'CTRL_TOPE_LCT_35',
    );
    const calculoDisponible = Object.keys(calculo).length > 0;
    const calculoCompleto = Boolean(reporte.calculo);

    reporte.snapshot = {
      origen: 'AUDITORIA_EXCEL',
      cliente: metadata.cliente,
      legajo: metadata.legajo,
      periodo:
        Number.isInteger(metadata.periodo_fiscal) && Number.isInteger(metadata.mes_liquidacion)
          ? `${String(metadata.periodo_fiscal).padStart(4, '0')}-${String(metadata.mes_liquidacion).padStart(2, '0')}`
          : null,
      archivo_origen: metadata.archivo,
      motor_version: '2.1.0-ANALISIS_BASICO_NODE',
      escala_art94_version:
        reporte.contexto_normativo?.version_escala_art94 ?? 'ART94_NO_INFORMADA',
      modalidad_sac: reporte.analisis_sac?.modalidad,
      fecha_analisis: new Date().toISOString(),
      veredicto: reporte.veredicto ?? reporte.estado,
      resumen: {
        total_ingresos_usado: calculo.total_ingresos_usado,
        ganancia_neta_base: calculo.ganancia_neta_base,
        impuesto_determinado: calculo.impuesto_determinado_calculado,
        retencion_calculada: calculo.retencion_calculada,
        retencion_informada: calculo.retencion_excel,
        diferencia_retencion: calculo.diferencia_retencion,
      },
      precondiciones: {
        acumuladores: 'CARGADOS_DESDE_EXCEL',
        parametros_art30: reporte.estado !== 'no_procesable' ? 'DISPONIBLES' : 'INCOMPLETOS',
        escala_art94:
          reporte.estado === 'analisis_completado'
            ? 'DISPONIBLE'
            : 'NO_DISPONIBLE_PARA_EL_CALCULO',
        topes_siradig: 'NO_EVALUADOS_EN_MVP',
        siradig: 'NO_DISPONIBLE_EN_EXCEL_ANALISIS_BASICO',
        novedades_periodo: 'LEIDAS_DESDE_ACUMULADORES_EXCEL',
      },
      advertencias: [
        'SIRADIG no disponible en el Excel: analisis basico.',
        ...(reporte.estado === 'analisis_no_soportado'
          ? [
              reporte.detalle_tecnico ??
                'El Excel fue leido, pero falta parametrizar la escala Art. 94 para completar el calculo.',
            ]
          : []),
        ...(controlTope?.estado === 'NO_EVALUADA' ? [controlTope.detalle] : []),
      ],
      pasos_motor: this.pasosCanonicos(calculo, calculoDisponible, calculoCompleto, reporte),
      detalle_mensual: structuredClone(reporte.detalle_mensual ?? []),
      validaciones: structuredClone(validaciones),
      cobertura_validaciones: structuredClone(reporte.cobertura_validaciones ?? {}),
      controles_tecnicos: structuredClone(reporte.controles_tecnicos ?? []),
    };

    return reporte;
  }

  private pasosCanonicos(calculo: any, disponible: boolean, completo = true, reporte?: any) {
    const estadoBase = (parcial = false) => {
      if (!disponible) return 'NO_EJECUTADO';
      if (!completo) return 'PARCIAL_MVP';
      return parcial ? 'PARCIAL_MVP' : 'CALCULADO';
    };
    const estadoEscala = () => {
      if (!disponible) return 'NO_EJECUTADO';
      return completo ? 'CALCULADO' : 'PENDIENTE_ESCALA';
    };
    const detalleEscala = !completo && disponible
      ? reporte?.detalle_tecnico ?? reporte?.motivo ?? 'Falta cargar la escala Art. 94 para completar este calculo.'
      : undefined;

    return [
      {
        numero: 1,
        nombre: 'Composición del total de ingresos',
        estado: estadoBase(),
        valor: calculo.total_ingresos_usado,
      },
      {
        numero: 2,
        nombre: 'Cálculo del SAC computable',
        estado: estadoBase(),
        valor: calculo.total_ingresos_composicion?.sac_computable,
      },
      {
        numero: 3,
        nombre: 'Deducciones personales del Art. 82',
        estado: estadoBase(),
        valor: calculo.deducciones_personales,
      },
      {
        numero: 4,
        nombre: 'Deducciones generales con topes',
        estado: estadoBase(true),
        valor: calculo.deducciones_generales,
        detalle: 'Análisis básico: algunos topes requieren SIRADIG y contexto normativo extendido.',
      },
      {
        numero: 5,
        nombre: 'Deducciones del Art. 30',
        estado: estadoBase(),
        valor: calculo.deducciones_art30,
      },
      {
        numero: 6,
        nombre: '12va parte del Art. 30',
        estado: estadoBase(),
        valor: null,
        detalle: 'Validado por V6 con los acumuladores del Excel.',
      },
      {
        numero: 7,
        nombre: 'Ganancia Neta Previa',
        estado: estadoBase(true),
        valor: null,
        detalle: 'No se expone como importe independiente en el reporte básico actual.',
      },
      {
        numero: 8,
        nombre: 'Ganancia Neta',
        estado: estadoBase(),
        valor: calculo.ganancia_neta_base,
      },
      {
        numero: 9,
        nombre: 'Identificación del tramo Art. 94',
        estado: estadoEscala(),
        valor: null,
        detalle: calculo.tramo_escala
          ? `Tramo ${calculo.tramo_escala.tramo} - alícuota ${calculo.tramo_escala.porcentaje}%`
          : detalleEscala,
      },
      {
        numero: 10,
        nombre: 'Cálculo del impuesto determinado',
        estado: estadoEscala(),
        valor: calculo.impuesto_determinado_calculado,
        detalle: !completo && disponible ? 'Pendiente hasta cargar la escala Art. 94 aplicable.' : undefined,
      },
      {
        numero: 11,
        nombre: 'Pagos anteriores acumulados',
        estado: estadoBase(),
        valor: calculo.retenciones_anteriores,
      },
      {
        numero: 12,
        nombre: 'Retención del mes',
        estado: completo ? estadoBase() : estadoEscala(),
        valor: calculo.retencion_calculada,
        detalle:
          calculo.retencion_excel !== undefined
            ? completo
              ? `Retención informada: ${this.moneda(calculo.retencion_excel)}. Diferencia: ${this.moneda(calculo.diferencia_retencion)}.`
              : `Retención informada: ${this.moneda(calculo.retencion_excel)}. Falta escala Art. 94 para calcular la retención de referencia.`
            : detalleEscala,
      },
    ];
  }

  private moneda(valor: unknown): string {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 'No disponible';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numero);
  }
}
