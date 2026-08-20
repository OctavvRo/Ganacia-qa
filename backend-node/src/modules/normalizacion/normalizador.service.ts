import { Injectable } from '@nestjs/common';
import { convertirNumero } from '../../common/decimal/decimal.util';

/**
 * SPEC_ALIASES — mapeo de nombres canónicos del spec (snake_case con doble guión bajo)
 * al nombre interno de acumulador que usa el motor.
 *
 * El parser de la hoja "Acumuladores" del formato extendido genera claves
 * en la forma "grupo__concepto" (doble underscore). Este mapa las resuelve.
 */
export const SPEC_ALIASES: Record<string, string> = {
  // Deducciones Art. 30 incisos a, b, c
  'deducciones_art30_inciso_a__ganancia_no_imponible': 'ganancia_no_imponible',
  'deducciones_art30_inciso_b__conyuge': 'conyuge',
  'deducciones_art30_inciso_b__hijos': 'hijos',
  'deducciones_art30_inciso_b__otras_cargas': 'otras_cargas',
  'deducciones_art30_inciso_c__deduccion_especial': 'deduccion_especial',
  'deducciones_art30_inciso_c__12va_parte': 'doceava_parte_art30',

  // Descuentos de ley
  'descuentos_ley__sindicatos': 'sindicatos',
  'descuentos_ley__ley_19032_inssjp': 'inssjp',
  'descuentos_ley__jubilacion_otras_empresas': 'jubilacion_otras_empresas',
  'descuentos_ley__obra_social_otras_empresas': 'obra_social_otras_empresas',
  'descuentos_ley__jubilacion': 'jubilacion',
  'descuentos_ley__aportes_obra_social': 'aportes_obra_social',
  'descuentos_ley__primas_seguro': 'primas_seguro',

  // Ingresos
  'ingresos__rem_con_aporte': 'remuneraciones_con_aporte',
  'ingresos__rem_sin_aporte': 'remuneraciones_sin_aporte',
  'ingresos__haberes_no_habituales': 'haberes_no_habituales',
  'ingresos__rem_otras_empresas': 'remuneraciones_otras_empresas',
  'ingresos__sac': 'sac',
  'ingresos__sac_bruto_cobrado': 'sac_bruto_cobrado',
  'ingresos__sac_anulacion_provisiones': 'sac_anulacion_provisiones',
  'ingresos__sac_neto_a_base': 'sac_neto_a_base',

  // Otras deducciones
  'otras_deducciones__seguros_de_retiro': 'seguros_de_retiro',
  'otras_deducciones__cuotas_asistenciales_otras_empresas': 'cuotas_asistenciales_otras_empresas',
  'otras_deducciones__gastos_sepelio_dc': 'gastos_sepelio_dc',
  'otras_deducciones__otros_gastos_dc': 'otros_gastos_dc',
  'otras_deducciones__gastos_medicos_dc': 'gastos_medicos_dc',
  'otras_deducciones__seguros_dc': 'seguros_dc',
  'otras_deducciones__gastos_corredores_viajes_comercio': 'gastos_corredores_viajes_comercio',
  'otras_deducciones__intereses_hipotecarios': 'intereses_hipotecarios',
  'otras_deducciones__servicios_domesticos': 'servicios_domesticos',
  'otras_deducciones__horas_exentas': 'horas_exentas',
  'otras_deducciones__horas_gravadas': 'horas_gravadas',
  'otras_deducciones__viaticos': 'viaticos',
  'otras_deducciones__alquiler': 'alquiler',
  'otras_deducciones__diferencia_art83_ley27743': 'diferencia_art83_ley27743',
  'otras_deducciones__ganancia_neta': 'ganancia_neta_fila35',
  'otras_deducciones__educacion': 'educacion',
  'otras_deducciones__indumentaria': 'indumentaria',
  'otras_deducciones__alquileres_10_inquilino': 'alquileres_10_inquilino',
  'otras_deducciones__alquileres_10_propietario': 'alquileres_10_propietario',
  'otras_deducciones__seguros_mixtos': 'seguros_mixtos',
  'otras_deducciones__gastos_medicos': 'gastos_medicos',
  'otras_deducciones__gastos_sepelio': 'gastos_sepelio',
  'otras_deducciones__otras_deducciones': 'otras_deducciones',
  'otras_deducciones__donaciones': 'donaciones',

  // Retención
  'retencion__pago_a_cuenta': 'pago_a_cuenta',
  'retencion__retencion': 'retencion_practicada',
  'retencion__pagaran': 'pagaran',
  'retencion__impuesto_calculado': 'impuesto_calculado',
  'retencion__porcentaje': 'porcentaje_aplicado',

  // Base imponible computable (si aparece)
  'base_imponible__computable_mes': 'base_imponible_computable_mes',
};

const ALIASES: Record<string, string[]> = {
  ganancia_no_imponible: ['ganancia no imponible'],
  conyuge: ['conyuge'],
  hijos: ['hijos'],
  otras_cargas: ['otras cargas'],
  deduccion_especial: ['deduccion especial'],
  doceava_parte_art30: [
    '12va parte deducciones art 30',
    '12va parte art 30',
    'doceava parte deducciones art 30',
  ],
  sindicatos: ['sindicatos'],
  inssjp: ['ley 19 032 inssjp', 'ley 19032 inssjp', 'inssjp'],
  jubilacion_otras_empresas: ['jubilacion otras empresas'],
  obra_social_otras_empresas: ['obra social otras empresas'],
  jubilacion: ['jubilacion'],
  aportes_obra_social: ['aportes obra social', 'obra social'],
  primas_seguro: ['primas de seguro'],
  remuneraciones_con_aporte: [
    'total de remuneraciones con aporte',
    'remuneraciones con aporte',
  ],
  remuneraciones_sin_aporte: [
    'total de remuneraciones sin aporte',
    'remuneraciones sin aporte',
  ],
  haberes_no_habituales: ['haberes no habituales'],
  remuneraciones_otras_empresas: [
    'total de remuneraciones otras empresas',
    'remuneraciones otras empresas',
  ],
  sac: ['sac', 'sueldo anual complementario'],
  seguros_de_retiro: ['seguros de retiro'],
  cuotas_asistenciales_otras_empresas: ['cuotas asistenciales otras empresas'],
  gastos_sepelio_dc: ['gastos de sepelio datos complementarios'],
  otros_gastos_dc: ['otros gastos datos complementarios'],
  gastos_medicos_dc: ['gastos medicos datos complementarios'],
  seguros_dc: ['seguros datos complementarios', 'seguros dc'],
  gastos_corredores_viajes_comercio: ['gastos estimados de corredores y viajes de comercio'],
  intereses_hipotecarios: ['intereses hipotecarios'],
  servicios_domesticos: ['servicios domesticos'],
  horas_exentas: ['horas exentas'],
  horas_gravadas: ['horas gravadas'],
  viaticos: ['viaticos'],
  alquiler: ['alquiler'],
  diferencia_art83_ley27743: [
    'diferencia art 83 ley 27743',
    'diferencia art83 ley27743',
  ],
  ganancia_neta_fila35: ['ganancia neta'],
  educacion: ['educacion'],
  indumentaria: ['indumentaria'],
  alquileres_10_inquilino: ['alquileres 10 inquilino'],
  alquileres_10_propietario: ['alquileres 10 propietario'],
  seguros_mixtos: ['seguros mixtos'],
  gastos_medicos: ['gastos medicos'],
  gastos_sepelio: ['gastos de sepelio'],
  otras_deducciones: ['otras deducciones'],
  donaciones: ['donaciones'],
  pago_a_cuenta: ['pago a cuenta'],
  retencion_practicada: ['retencion'],
  pagaran: ['pagaran'],
  impuesto_calculado: ['impuesto calculado'],
  porcentaje_aplicado: ['porcentaje'],
};

@Injectable()
export class NormalizadorService {
  private readonly mapa = Object.fromEntries(
    Object.entries(ALIASES).flatMap(([clave, aliases]) =>
      aliases.map(alias => [this.normalizarTexto(alias), clave]),
    ),
  );

  normalizarTexto(valor: unknown): string {
    return String(valor ?? '')
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Normaliza un valor de celda a clave interna de acumulador.
   *
   * Prioridad:
   * 1. SPEC_ALIASES: nombres canónicos del spec en snake_case con doble guión bajo.
   * 2. Mapa ALIASES: nombres legacy en texto humano.
   *
   * Retorna null si no se reconoce.
   */
  normalizarClave(valor: unknown): string | null {
    const raw = String(valor ?? '')
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Construir specKey preservando underscores dobles del contrato del spec.
    // Ejemplo: ingresos__rem_con_aporte NO debe convertirse a ingresos_rem_con_aporte.
    const specKeyExacta = raw
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (SPEC_ALIASES[specKeyExacta]) {
      return SPEC_ALIASES[specKeyExacta];
    }

    // Compatibilidad defensiva con archivos viejos o editados a mano que hayan
    // colapsado los underscores. Esta rama no reemplaza el contrato canónico.
    const specKeyColapsada = specKeyExacta.replace(/_+/g, '_');
    if (SPEC_ALIASES[specKeyColapsada]) {
      return SPEC_ALIASES[specKeyColapsada];
    }

    // Caer al mapa legacy
    return this.mapa[this.normalizarTexto(valor)] ?? null;
  }

  convertirNumero(valor: unknown) {
    return convertirNumero(valor);
  }
}
