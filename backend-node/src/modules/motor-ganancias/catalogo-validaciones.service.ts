import { Injectable } from '@nestjs/common';
import { ResultadoValidacion } from './dominio';

interface DefinicionValidacion {
  codigo: string;
  nombre: string;
  descripcion: string;
  datos_requeridos: string[];
  fuentes_sugeridas: string[];
  accion_recomendada: string;
  modulo_requerido: string;
  afecta_veredicto_si_ejecuta: boolean;
}

const DEFINICIONES: DefinicionValidacion[] = [
  {
    codigo: 'V1',
    nombre: 'Sincronizacion fila 35 vs papel de trabajo',
    descripcion: 'Compara la ganancia neta acumulada de la fila 35 contra la ganancia neta declarada en PapelTrabajo.',
    datos_requeridos: ['papel_trabajo.ganancia_neta'],
    fuentes_sugeridas: ['PapelTrabajo'],
    accion_recomendada: 'Incluir la hoja PapelTrabajo con campo ganancia_neta en snake_case canonico.',
    modulo_requerido: 'PapelTrabajo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V2',
    nombre: 'Composicion correcta del Total Ingresos',
    descripcion: 'Verifica que total_ingresos del papel coincida con remuneraciones, SAC computable, HNH y otras empresas.',
    datos_requeridos: ['papel_trabajo.total_ingresos', 'papel_trabajo.total_ingresos_composicion', 'sac_bruto_cobrado', 'sac_anulacion_provisiones'],
    fuentes_sugeridas: ['PapelTrabajo', 'Acumuladores', 'Config_Cliente'],
    accion_recomendada: 'Informar PapelTrabajo.total_ingresos y desglose de composicion de ingresos segun spec.',
    modulo_requerido: 'PapelTrabajo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V3',
    nombre: 'Cadena aritmetica del papel de trabajo',
    descripcion: 'Controla paso a paso que las formulas AS-IS del papel cierren matematicamente.',
    datos_requeridos: ['papel_trabajo_completo'],
    fuentes_sugeridas: ['PapelTrabajo', 'Log_Calculo'],
    accion_recomendada: 'Incluir todos los campos requeridos de PapelTrabajo y Log_Calculo con los 12 pasos canonicos.',
    modulo_requerido: 'PapelTrabajo / Log_Calculo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V4',
    nombre: 'Escala Art. 94 aplicada correctamente',
    descripcion: 'Verifica que tramo, minimo, maximo, fijo y porcentaje correspondan a la ganancia neta y periodo.',
    datos_requeridos: ['escala_art94_versionada'],
    fuentes_sugeridas: ['Contexto_Normativo', 'Normativa'],
    accion_recomendada: 'Mantener cargada la escala Art. 94 versionada por semestre/mes y validar fuente oficial antes de produccion.',
    modulo_requerido: 'Contexto_Normativo',
    afecta_veredicto_si_ejecuta: false,
  },
  {
    codigo: 'V5',
    nombre: 'Consistencia de aportes personales',
    descripcion: 'Verifica jubilacion, obra social e INSSJP contra remuneracion con aporte, regimen y topes.',
    datos_requeridos: ['legajo_empleado.regimen_previsional', 'contexto_normativo.topes_previsionales_vigentes'],
    fuentes_sugeridas: ['Legajo_Empleado', 'Contexto_Normativo'],
    accion_recomendada: 'Informar regimen_previsional del legajo y tabla de topes previsionales vigente.',
    modulo_requerido: 'Legajo_Empleado / Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V6',
    nombre: '12va parte del Art. 30',
    descripcion: 'Valida que la doceava parte coincida con la formula Art. 30 usando acumuladores del Excel.',
    datos_requeridos: [],
    fuentes_sugeridas: ['Acumuladores'],
    accion_recomendada: 'Revisar ganancia_no_imponible, deduccion_especial, cargas de familia y doceava_parte_art30.',
    modulo_requerido: 'Acumuladores',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V7',
    nombre: 'Familia de topes por rubro SIRADIG',
    descripcion: 'Controla topes y metodos de imputacion por rubro: gastos medicos, educacion, alquileres, donaciones, seguros y otros.',
    datos_requeridos: ['siradig_detallado', 'contexto_normativo.topes_por_rubro'],
    fuentes_sugeridas: ['SIRADIG', 'Contexto_Normativo'],
    accion_recomendada: 'Cargar SIRADIG por rubro y tabla topes_por_rubro del contexto normativo.',
    modulo_requerido: 'SIRADIG / Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V8',
    nombre: 'Coherencia de modalidad SAC',
    descripcion: 'Detecta si el SAC esta informado como devengado o percibido y verifica consistencia del patron mensual.',
    datos_requeridos: [],
    fuentes_sugeridas: ['Acumuladores', 'Config_Cliente'],
    accion_recomendada: 'Si el cliente tiene politica fija, informar config_cliente.modalidad_sac para contraste formal.',
    modulo_requerido: 'Acumuladores / Config_Cliente',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V9',
    nombre: 'Sobreprima de seguro sobre SAC',
    descripcion: 'Revisa si en junio/diciembre la prima de seguro se duplica por estar calculada sobre SAC.',
    datos_requeridos: ['config_cliente.poliza_seguro_cobra_sobre_sac', 'acumuladores.seguros_de_retiro'],
    fuentes_sugeridas: ['Config_Cliente', 'Acumuladores'],
    accion_recomendada: 'Informar si la poliza cobra sobre SAC y revisar la fila seguros_de_retiro.',
    modulo_requerido: 'Config_Cliente',
    afecta_veredicto_si_ejecuta: false,
  },
  {
    codigo: 'V10',
    nombre: 'Saldo a favor enmascarado',
    descripcion: 'Controla inversion de signo y tratamiento de retencion negativa segun modo_saldo_favor.',
    datos_requeridos: ['config_cliente.modo_saldo_favor', 'papel_trabajo.retencion_del_mes_efectiva'],
    fuentes_sugeridas: ['Config_Cliente', 'PapelTrabajo', 'Historial_Retenciones'],
    accion_recomendada: 'Informar modo_saldo_favor y retencion efectiva si la retencion calculada da negativa.',
    modulo_requerido: 'Config_Cliente / Historial_Retenciones',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V11',
    nombre: 'HNH prorrateado desde el mes de pago',
    descripcion: 'Verifica que haberes no habituales prorrateados incluyan la primera cuota en el mes de pago.',
    datos_requeridos: ['novedades_mes.hnh', 'modalidad_hnh', 'distribucion_efectiva_por_mes'],
    fuentes_sugeridas: ['Novedades_Mes', 'Config_Cliente'],
    accion_recomendada: 'Cargar novedades HNH, modalidad de imputacion y distribucion mensual efectiva.',
    modulo_requerido: 'Novedades_Mes',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V12',
    nombre: 'Cambio de tramo intra-anio',
    descripcion: 'Compara el tramo aplicado mes a mes contra el tramo correcto de la escala vigente.',
    datos_requeridos: ['historial_retenciones', 'escala_art94_por_mes', 'log_calculo.numero_tramo'],
    fuentes_sugeridas: ['Historial_Retenciones', 'Log_Calculo', 'Contexto_Normativo'],
    accion_recomendada: 'Informar historial de retenciones, tramo aplicado por mes y escala vigente por mes.',
    modulo_requerido: 'Historial_Retenciones / Log_Calculo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V13',
    nombre: 'Proporcionalizacion por ingreso o egreso',
    descripcion: 'Verifica proporcionalidad de deducciones Art. 30 cuando el empleado ingresa o egresa dentro del anio.',
    datos_requeridos: ['legajo_empleado.fecha_ingreso', 'legajo_empleado.fecha_egreso', 'log_calculo.factor_proporcionalidad'],
    fuentes_sugeridas: ['Legajo_Empleado', 'Log_Calculo'],
    accion_recomendada: 'Informar fecha_ingreso, fecha_egreso si existe y factor_proporcionalidad usado por el sistema.',
    modulo_requerido: 'Legajo_Empleado',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V14',
    nombre: 'Multiempleo y agente de retencion unico',
    descripcion: 'Controla remuneraciones y retenciones de otros empleadores y agente de retencion designado.',
    datos_requeridos: ['legajo_empleado.tiene_otros_empleadores', 'legajo_empleado.otros_empleadores', 'siradig_detallado'],
    fuentes_sugeridas: ['Legajo_Empleado', 'SIRADIG'],
    accion_recomendada: 'Informar si hay otros empleadores, CUIT del agente designado y valores declarados en SIRADIG.',
    modulo_requerido: 'Legajo_Empleado / SIRADIG',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V15',
    nombre: 'Zona geografica',
    descripcion: 'Valida aplicacion de deducciones incrementadas por zona patagonica o tratamiento Tierra del Fuego.',
    datos_requeridos: ['legajo_empleado.zona_geografica', 'contexto_normativo.parametros_por_zona'],
    fuentes_sugeridas: ['Legajo_Empleado', 'Contexto_Normativo'],
    accion_recomendada: 'Informar zona_geografica del legajo y parametros_por_zona vigentes.',
    modulo_requerido: 'Legajo_Empleado / Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V16',
    nombre: 'Regimen previsional diferencial',
    descripcion: 'Controla alicuotas de aportes para regimenes distintos del SIPA general.',
    datos_requeridos: ['legajo_empleado.regimen_previsional', 'contexto_normativo.tabla_regimenes_previsionales'],
    fuentes_sugeridas: ['Legajo_Empleado', 'Contexto_Normativo'],
    accion_recomendada: 'Informar regimen_previsional y tabla_regimenes_previsionales aplicable.',
    modulo_requerido: 'Legajo_Empleado / Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V17',
    nombre: 'Actualizacion semestral RIPTE',
    descripcion: 'Verifica que escala y deducciones Art. 30 correspondan a la vigencia semestral del periodo.',
    datos_requeridos: ['contexto_normativo.ripte', 'escala_art94_por_vigencia'],
    fuentes_sugeridas: ['Contexto_Normativo'],
    accion_recomendada: 'Mantener parametros RIPTE y escalas versionadas por vigencia.',
    modulo_requerido: 'Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V18',
    nombre: 'Interaccion de topes de deducciones',
    descripcion: 'Controla orden de aplicacion e interaccion entre topes de deducciones generales.',
    datos_requeridos: ['log_calculo.topes_aplicados', 'contexto_normativo.orden_topes', 'siradig_detallado'],
    fuentes_sugeridas: ['Log_Calculo', 'Contexto_Normativo', 'SIRADIG'],
    accion_recomendada: 'Informar desglose_por_rubro, orden_topes y topes_aplicados del Log_Calculo.',
    modulo_requerido: 'Log_Calculo / SIRADIG',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V19',
    nombre: 'Ajuste anual de diciembre',
    descripcion: 'Controla cierre anual, SIRADIG definitivo, SAC diciembre efectivo y saldos a favor.',
    datos_requeridos: ['ajuste_final', 'siradig_definitivo', 'historial_retenciones'],
    fuentes_sugeridas: ['Ajuste_Final', 'SIRADIG', 'Historial_Retenciones'],
    accion_recomendada: 'Cargar Ajuste_Final, SIRADIG definitivo e historial de retenciones del ejercicio.',
    modulo_requerido: 'Ajuste_Final',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V20',
    nombre: 'Liquidacion final por egreso',
    descripcion: 'Controla proporcionalidad, tratamiento fiscal de indemnizaciones y tope Vizzoti.',
    datos_requeridos: ['ajuste_final.egreso', 'conceptos_egreso', 'parametros_indemnizatorios'],
    fuentes_sugeridas: ['Ajuste_Final', 'Legajo_Empleado', 'Contexto_Normativo'],
    accion_recomendada: 'Cargar datos de egreso, conceptos indemnizatorios, CCT y parametros para tope Vizzoti.',
    modulo_requerido: 'Ajuste_Final / Legajo_Empleado',
    afecta_veredicto_si_ejecuta: true,
  },
  {
    codigo: 'V21',
    nombre: 'Exenciones Art. 26 LIG',
    descripcion: 'Controla fundamentos normativos y tratamiento de conceptos exentos o no remunerativos.',
    datos_requeridos: ['novedades_mes.clasificacion_fiscal', 'fundamento_normativo_por_concepto'],
    fuentes_sugeridas: ['Novedades_Mes', 'Contexto_Normativo'],
    accion_recomendada: 'Cargar novedades con categoria fiscal, aplica_ganancias y fundamento_normativo_clasificacion.',
    modulo_requerido: 'Novedades_Mes / Contexto_Normativo',
    afecta_veredicto_si_ejecuta: true,
  },
];

const SUBVALIDACIONES_V7 = [
  'V7.a_gastos_medicos',
  'V7.b_cuota_medico_asistencial',
  'V7.c_gastos_educativos',
  'V7.d_servicios_domesticos',
  'V7.e_alquileres_inquilino',
  'V7.f_donaciones',
  'V7.g_seguros',
  'V7.h_intereses_hipotecarios',
  'V7.i_metodo_imputacion',
];

const EQUIVALENCIAS: Record<string, string[]> = {
  V1: ['V1_SINCRONIZACION_FILA35'],
  V2: ['V2_TOTAL_INGRESOS'],
  V3: ['V3_CADENA_ARITMETICA'],
  V4: ['V4_ESCALA_ART94'],
  V5: ['V5_APORTES_PERSONALES'],
  V6: ['V6_12VA_PARTE_ART30'],
  V8: ['V8_MODALIDAD_SAC'],
  V9: ['V9_SOBREPRIMA_SEGURO_SAC'],
  V10: ['V10_RETENCION'],
  V17: ['V17_ACTUALIZACION_SEMESTRAL_ART30'],
};

@Injectable()
export class CatalogoValidacionesService {
  /**
   * Devuelve la matriz completa V1-V21 del spec.
   *
   * Todas las V quedan invocadas a nivel de cobertura. Las que no tienen
   * insumos confiables se informan como NO_EVALUADA con dato faltante,
   * fuente sugerida y accion recomendada.
   */
  cobertura(validaciones: ResultadoValidacion[]) {
    const porCodigo = Object.fromEntries(validaciones.map(v => [v.codigo, v]));
    const resultados = DEFINICIONES.map(def => {
      const ejecutada = this.buscarEjecutada(def.codigo, porCodigo);
      if (ejecutada) {
        return {
          ...ejecutada,
          codigo: def.codigo,
          codigo_interno: ejecutada.codigo,
          nombre: def.nombre,
          descripcion: def.descripcion,
          datos_faltantes: (ejecutada as any).datos_faltantes ?? [],
          fuentes_sugeridas: (ejecutada as any).fuentes_sugeridas ?? def.fuentes_sugeridas,
          modulo_requerido: def.modulo_requerido,
          accion_recomendada: (ejecutada as any).accion_recomendada ?? def.accion_recomendada,
          invocada: true,
          evaluada: ejecutada.estado !== 'NO_EVALUADA',
          afecta_veredicto: def.afecta_veredicto_si_ejecuta,
        };
      }

      const detalle =
        `No se puede validar ${def.codigo} (${def.nombre}) hasta que se informe: ` +
        `${def.datos_requeridos.join(', ') || 'sin datos adicionales'}. ` +
        `Fuente sugerida: ${def.fuentes_sugeridas.join(', ')}.`;

      return {
        codigo: def.codigo,
        nombre: def.nombre,
        descripcion: def.descripcion,
        estado: 'NO_EVALUADA',
        detalle,
        datos_faltantes: def.datos_requeridos,
        fuentes_sugeridas: def.fuentes_sugeridas,
        modulo_requerido: def.modulo_requerido,
        accion_recomendada: def.accion_recomendada,
        invocada: true,
        evaluada: false,
        afecta_veredicto: false,
        ...(def.codigo === 'V7'
          ? {
              subvalidaciones: SUBVALIDACIONES_V7.map(codigo => ({
                codigo,
                estado: 'NO_EVALUADA',
                detalle: 'Requiere SIRADIG detallado y tabla topes_por_rubro para evaluar este rubro.',
                datos_faltantes: ['siradig_detallado', 'contexto_normativo.topes_por_rubro'],
              })),
            }
          : {}),
      };
    });

    return {
      version: 'CONTROLADOR_GANANCIAS_1.0_2026-07',
      nivel_cobertura: 'ANALISIS_BASICO',
      total_catalogo: DEFINICIONES.length,
      invocadas: resultados.length,
      evaluadas: resultados.filter(x => x.estado !== 'NO_EVALUADA').length,
      no_evaluadas: resultados.filter(x => x.estado === 'NO_EVALUADA').length,
      validaciones: resultados,
    };
  }

  controles(validaciones: ResultadoValidacion[]) {
    const map: Record<string, string> = { V11_TOPE_LCT_35: 'CTRL_TOPE_LCT_35' };
    return validaciones
      .filter(v => map[v.codigo])
      .map(v => ({
        ...v,
        codigo_legacy: v.codigo,
        codigo: map[v.codigo],
        nombre: 'Tope tecnico LCT 35%',
        descripcion: 'Control tecnico informativo. No reemplaza V11 del spec, que refiere a HNH prorrateado.',
        afecta_veredicto: false,
      }));
  }

  private buscarEjecutada(codigo: string, porCodigo: Record<string, ResultadoValidacion>): ResultadoValidacion | undefined {
    for (const interno of EQUIVALENCIAS[codigo] ?? []) {
      if (porCodigo[interno]) return porCodigo[interno];
    }
    return undefined;
  }
}
