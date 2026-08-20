import { BadRequestException, Injectable } from '@nestjs/common';
import { normalizarModoSaldoFavor } from '../normalizacion/modo-saldo-favor.util';
import { normalizarZonaGeografica } from '../normalizacion/zona-geografica.util';

const CLIENTE = [
  'cliente_nombre',
  'cliente_cuit',
  'modalidad_sac',
  'modo_saldo_favor',
  'poliza_seguro_cobra_sobre_sac',
  'cct_default',
  'zona_geografica_default',
];

const LEGAJO_BASE = [
  'legajo_numero',
  'empleado_cuil',
  'fecha_ingreso',
  'fecha_egreso',
  'zona_geografica',
  'regimen_previsional',
  'cct_aplicable',
  'categoria',
  'situacion_revista',
  'cargas_familia_conyuge',
  'cargas_familia_cant_hijos',
  'cargas_familia_otras',
  'tiene_otros_empleadores',
];

const CARGAS_FAMILIA_HIJOS_PRECISION = [
  'cargas_familia_hijos_evento',
  'cargas_familia_hijos_evento_cantidad',
  'cargas_familia_hijos_desde_mes',
  'cargas_familia_hijos_motivo',
  'cargas_familia_hijos_equivalentes',
  'cargas_familia_hijos_equivalentes_enero',
  'cargas_familia_hijos_equivalentes_febrero',
  'cargas_familia_hijos_equivalentes_marzo',
  'cargas_familia_hijos_equivalentes_abril',
  'cargas_familia_hijos_equivalentes_mayo',
  'cargas_familia_hijos_equivalentes_junio',
  'cargas_familia_hijos_equivalentes_julio',
  'cargas_familia_hijos_equivalentes_agosto',
  'cargas_familia_hijos_equivalentes_septiembre',
  'cargas_familia_hijos_equivalentes_octubre',
  'cargas_familia_hijos_equivalentes_noviembre',
  'cargas_familia_hijos_equivalentes_diciembre',
];

const SIRADIG = [
  'siradig_disponible',
  'gastos_medicos',
  'cuota_medico_asistencial',
  'gastos_educativos',
  'servicio_domestico',
  'alquileres_inquilino',
  'donaciones',
  'seguros',
  'intereses_hipotecarios',
  'otros_empleadores',
];

const NORMATIVA = [
  'normativa_oficial_validada',
  'periodo_normativo',
  'ripte',
  'parametros_por_zona',
  'topes_por_rubro',
  'tabla_regimenes_previsionales',
  'orden_topes',
  'escala_art94_version',
];

const NOVEDADES = [
  'hnh_mes',
  'modalidad_hnh',
  'distribucion_hnh',
  'conceptos_exentos_art26',
  'conceptos_egreso',
];

const HISTORIAL = [
  'historial_retenciones_disponible',
  'retenciones_efectivas_previas',
  'escala_art94_por_mes',
  'ajustes_previos',
];

const AJUSTE = [
  'ajuste_final_disponible',
  'siradig_definitivo',
  'egreso_en_periodo',
  'fecha_egreso',
  'indemnizaciones',
];

const GRUPOS_VALIDOS = [
  'datos_cliente',
  'datos_legajo',
  'datos_siradig',
  'datos_normativa',
  'datos_novedades',
  'datos_historial',
  'datos_ajuste_final',
  'datos_contexto',
];

const MODULOS = [
  {
    grupo: 'datos_cliente',
    nombre: 'Configuracion del cliente',
    descripcion: 'Politicas del cliente que cambian la interpretacion del calculo.',
    campos: CLIENTE,
    validaciones: ['V2', 'V8', 'V9', 'V10'],
    fuente: 'CONFIG_CLIENTE',
  },
  {
    grupo: 'datos_legajo',
    nombre: 'Legajo del empleado',
    descripcion: 'Datos laborales necesarios para proporcionalidad, zona y regimen.',
    campos: LEGAJO_BASE,
    validaciones: ['V5', 'V13', 'V14', 'V15', 'V16', 'V20'],
    fuente: 'MODULO_LEGAJOS',
  },
  {
    grupo: 'datos_siradig',
    nombre: 'SIRADIG y deducciones',
    descripcion: 'Declaraciones del empleado y topes de deducciones personales/generales.',
    campos: SIRADIG,
    validaciones: ['V7', 'V14', 'V18', 'V19'],
    fuente: 'SIRADIG',
  },
  {
    grupo: 'datos_normativa',
    nombre: 'Normativa, escalas y topes',
    descripcion: 'Parametros oficiales vigentes para escala, RIPTE, zona y topes.',
    campos: NORMATIVA,
    validaciones: ['V4', 'V5', 'V7', 'V12', 'V15', 'V16', 'V17', 'V18', 'V20', 'V21'],
    fuente: 'NORMATIVA',
  },
  {
    grupo: 'datos_novedades',
    nombre: 'Novedades del mes',
    descripcion: 'Eventos del periodo: HNH, conceptos exentos, egresos y ajustes.',
    campos: NOVEDADES,
    validaciones: ['V11', 'V20', 'V21'],
    fuente: 'NOVEDADES',
  },
  {
    grupo: 'datos_historial',
    nombre: 'Historial de liquidaciones',
    descripcion: 'Retenciones previas, cambios de tramo y saldos arrastrados.',
    campos: HISTORIAL,
    validaciones: ['V10', 'V12', 'V19'],
    fuente: 'HISTORIAL_LIQUIDACIONES',
  },
  {
    grupo: 'datos_ajuste_final',
    nombre: 'Ajuste anual o liquidacion final',
    descripcion: 'Informacion de cierre anual, egreso e indemnizaciones.',
    campos: AJUSTE,
    validaciones: ['V19', 'V20'],
    fuente: 'AJUSTE_FINAL',
  },
];

@Injectable()
export class ContextoComplementarioService {
  normalizar(entrada: any = {}) {
    for (const grupo of Object.keys(entrada)) {
      if (!GRUPOS_VALIDOS.includes(grupo)) {
        throw new BadRequestException(`Grupo de contexto complementario desconocido: ${grupo}`);
      }
    }

    const cliente = this.grupo(entrada.datos_cliente, CLIENTE, 'datos_cliente');
    const legajo = this.grupo(
      entrada.datos_legajo,
      LEGAJO_BASE,
      'datos_legajo',
      CARGAS_FAMILIA_HIJOS_PRECISION,
    );
    this.normalizarModoSaldoFavorCliente(cliente);
    this.normalizarCampoZona(cliente, 'zona_geografica_default');
    this.normalizarCampoZona(legajo, 'zona_geografica');
    const siradig = this.grupo(entrada.datos_siradig, SIRADIG, 'datos_siradig');
    const normativa = this.grupo(entrada.datos_normativa, NORMATIVA, 'datos_normativa');
    const novedades = this.grupo(entrada.datos_novedades, NOVEDADES, 'datos_novedades');
    const historial = this.grupo(entrada.datos_historial, HISTORIAL, 'datos_historial');
    const ajuste = this.grupo(entrada.datos_ajuste_final, AJUSTE, 'datos_ajuste_final');
    const ctx = this.grupo(
      entrada.datos_contexto,
      ['periodo_fiscal', 'mes_liquidacion', 'observaciones', 'fuente_datos'],
      'datos_contexto',
    );
    ctx.fuente_datos ??= 'manual';

    const valoresPorGrupo: Record<string, Record<string, any>> = {
      datos_cliente: cliente,
      datos_legajo: legajo,
      datos_siradig: siradig,
      datos_normativa: normativa,
      datos_novedades: novedades,
      datos_historial: historial,
      datos_ajuste_final: ajuste,
    };

    const informados: string[] = [];
    const faltantes: string[] = [];
    const modulos_datos = MODULOS.map((modulo) => {
      const valores = valoresPorGrupo[modulo.grupo] ?? {};
      const camposAplicables = this.camposAplicables(modulo.grupo, modulo.campos, valoresPorGrupo);
      const campos_informados = camposAplicables.filter((campo) => this.tieneValor(valores[campo]));
      const campos_faltantes = camposAplicables.filter((campo) => !this.tieneValor(valores[campo]));

      informados.push(...campos_informados.map((campo) => `${modulo.grupo}.${campo}`));
      faltantes.push(...campos_faltantes.map((campo) => `${modulo.grupo}.${campo}`));

      return {
        grupo: modulo.grupo,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        fuente_sugerida: modulo.fuente,
        validaciones_habilitadas: modulo.validaciones,
        total_campos: camposAplicables.length,
        campos_informados: campos_informados.length,
        campos_faltantes: campos_faltantes.length,
        porcentaje_completitud: Math.round((campos_informados.length * 100) / camposAplicables.length),
        estado: campos_faltantes.length === 0 ? 'COMPLETO' : campos_informados.length ? 'PARCIAL' : 'PENDIENTE',
        detalle_faltantes: campos_faltantes,
      };
    });

    if (ctx.observaciones) {
      informados.push('datos_contexto.observaciones');
    }
    if (ctx.periodo_fiscal) {
      informados.push('datos_contexto.periodo_fiscal');
    }
    if (ctx.mes_liquidacion) {
      informados.push('datos_contexto.mes_liquidacion');
    }
    informados.push(
      ...CARGAS_FAMILIA_HIJOS_PRECISION
        .filter((campo) => this.tieneValor(legajo[campo]))
        .map((campo) => `datos_legajo.${campo}`),
    );

    const origen: Record<string, string> = {
      manual: 'MANUAL',
      sistema_legajos: 'MODULO_LEGAJOS',
      sistema_cliente: 'CONFIG_CLIENTE',
      pendiente_integracion: 'NO_DISPONIBLE',
    };

    return {
      datos_cliente: cliente,
      datos_legajo: legajo,
      datos_siradig: siradig,
      datos_normativa: normativa,
      datos_novedades: novedades,
      datos_historial: historial,
      datos_ajuste_final: ajuste,
      datos_contexto: ctx,
      origen: origen[ctx.fuente_datos] ?? 'MANUAL',
      campos_informados: informados,
      campos_faltantes: faltantes,
      modulos_datos,
    };
  }

  aplicar(reporte: any, entrada: any) {
    const contexto = this.normalizar(entrada);
    const tipo = contexto.campos_informados.length ? 'ANALISIS_ENRIQUECIDO' : 'ANALISIS_BASICO';
    reporte.contexto_complementario = contexto;
    reporte.tipo_analisis = tipo;

    const validaciones = reporte.cobertura_validaciones?.validaciones ?? [];
    const totalCampos = contexto.modulos_datos.reduce(
      (total: number, modulo: any) => total + modulo.total_campos,
      0,
    );

    reporte.cobertura_reporte = {
      tipo_analisis: tipo,
      tipo_reporte: 'CONTROLADOR',
      hojas_detectadas: reporte.hojas_detectadas ?? [reporte.metadata?.hoja].filter(Boolean),
      hojas_faltantes: [],
      porcentaje_cobertura_aproximado: Math.min(
        100,
        40 + Math.round((60 * contexto.campos_informados.length) / totalCampos),
      ),
      criterio_porcentaje:
        '40% estructura Excel + hasta 60% por datos complementarios manuales o integraciones futuras. El controlador no inventa datos faltantes.',
      datos_excel: [
        'metadata_basica',
        'acumuladores_mensuales',
        'ganancia_neta_fila35',
        'retencion_practicada_como_dato',
        'impuesto_calculado_como_dato',
        'porcentaje_aplicado_como_dato',
        'sac',
        'remuneraciones_con_aporte',
        'deducciones_art30',
      ],
      datos_complementarios: contexto.campos_informados,
      datos_faltantes: contexto.campos_faltantes,
      modulos_datos: contexto.modulos_datos,
      validaciones_ejecutables: validaciones
        .filter((v: any) => v.estado !== 'NO_EVALUADA')
        .map((v: any) => v.codigo),
      validaciones_no_ejecutables: validaciones
        .filter((v: any) => v.estado === 'NO_EVALUADA')
        .map((v: any) => v.codigo),
      fuentes_sugeridas: [...new Set(MODULOS.map((modulo) => modulo.fuente))],
    };

    if (reporte.snapshot) {
      reporte.snapshot.tipo_analisis = tipo;
      reporte.snapshot.contexto_complementario = structuredClone(contexto);
      reporte.snapshot.cobertura_reporte = structuredClone(reporte.cobertura_reporte);
    }

    return reporte;
  }

  private grupo(valor: any, campos: string[], nombre: string, opcionales: string[] = []): Record<string, any> {
    if (valor == null) return {};
    if (typeof valor !== 'object' || Array.isArray(valor)) {
      throw new BadRequestException(`${nombre} debe ser un objeto JSON`);
    }

    const permitidos = [...campos, ...opcionales];
    const extras = Object.keys(valor).filter((campo) => !permitidos.includes(campo));
    if (extras.length) {
      throw new BadRequestException(`Campos desconocidos en ${nombre}: ${extras.join(', ')}`);
    }

    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, x]) => x !== null && x !== '')
        .map(([k, x]) => [k, typeof x === 'string' ? x.trim() : x]),
    );
  }

  private tieneValor(valor: any): boolean {
    return valor !== undefined && valor !== null && valor !== '' && valor !== 'desconocido';
  }

  private camposAplicables(
    grupo: string,
    campos: string[],
    valoresPorGrupo: Record<string, Record<string, any>>,
  ): string[] {
    const legajo = valoresPorGrupo.datos_legajo ?? {};
    const ajuste = valoresPorGrupo.datos_ajuste_final ?? {};

    if (grupo === 'datos_siradig' && this.esFalso(legajo.tiene_otros_empleadores)) {
      return campos.filter((campo) => campo !== 'otros_empleadores');
    }

    if (grupo === 'datos_legajo' && !this.esVerdadero(ajuste.egreso_en_periodo)) {
      return campos.filter((campo) => campo !== 'fecha_egreso');
    }

    if (grupo === 'datos_ajuste_final' && !this.esVerdadero(ajuste.egreso_en_periodo)) {
      return campos.filter((campo) => campo !== 'fecha_egreso' && campo !== 'indemnizaciones');
    }

    return campos;
  }

  private esVerdadero(valor: any): boolean {
    return valor === true || String(valor).trim().toLowerCase() === 'true' || String(valor).trim().toLowerCase() === 'si';
  }

  private esFalso(valor: any): boolean {
    return valor === false || ['false', 'no'].includes(String(valor).trim().toLowerCase());
  }

  private normalizarCampoZona(grupo: Record<string, any>, campo: string) {
    if (grupo[campo] !== undefined && grupo[campo] !== null && grupo[campo] !== '') {
      grupo[campo] = normalizarZonaGeografica(grupo[campo]);
    }
  }

  private normalizarModoSaldoFavorCliente(cliente: Record<string, any>) {
    if (
      cliente.modo_saldo_favor !== undefined &&
      cliente.modo_saldo_favor !== null &&
      cliente.modo_saldo_favor !== ''
    ) {
      cliente.modo_saldo_favor = normalizarModoSaldoFavor(cliente.modo_saldo_favor);
    }
  }
}
