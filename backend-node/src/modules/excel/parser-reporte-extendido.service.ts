import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { D } from '../../common/decimal/decimal.util';
import {
  AcumuladorMensual,
  ConfigCliente,
  LiquidacionNormalizada,
  MESES,
  Mes,
  MetadataArchivo,
  PapelTrabajoAsis,
} from '../motor-ganancias/dominio';
import { NormalizadorService } from '../normalizacion/normalizador.service';
import { normalizarModoSaldoFavor } from '../normalizacion/modo-saldo-favor.util';
import { normalizarZonaGeografica } from '../normalizacion/zona-geografica.util';

const MESES_NORM = MESES.map(m => m.toLowerCase());

const COLUMNAS_LOG_CALCULO = [
  'paso_numero',
  'paso_nombre',
  'referencia_normativa',
  'formula',
  'explicacion',
  'entradas',
  'operacion',
  'salida',
  'topes_aplicados',
  'observaciones',
] as const;

const ALIASES_LOG_CALCULO: Record<string, (typeof COLUMNAS_LOG_CALCULO)[number]> = {
  paso: 'paso_numero',
  numero: 'paso_numero',
  nombre: 'paso_nombre',
  descripcion: 'paso_nombre',
  referencia: 'referencia_normativa',
  referencia_normativa: 'referencia_normativa',
  entrada: 'entradas',
  entradas: 'entradas',
  resultado: 'salida',
  salida: 'salida',
  observacion: 'observaciones',
  observaciones: 'observaciones',
  topes: 'topes_aplicados',
  topes_aplicados: 'topes_aplicados',
};

/**
 * Parser de reporte extendido según spec-reporte-esueldos-auditoria.md.
 *
 * Hojas soportadas:
 * - Metadata         → metadata extendida
 * - Acumuladores     → acumuladores normalizados con nombres canónicos del spec
 * - PapelTrabajo     → datos AS-IS del papel de trabajo del sistema auditado
 * - Config_Cliente   → configuración del cliente
 * - Contexto_Normativo → escala / GNI / DE
 * - Log_Calculo      → pasos AS-IS (no usar como DEBE-SER)
 * - Historial_Retenciones → retenciones mensuales
 *
 * Las hojas opcionales faltantes generan advertencias pero NO lanzan error.
 */
@Injectable()
export class ParserReporteExtendidoService {
  constructor(private readonly norm: NormalizadorService) {}

  parsear(
    hojas: { nombre: string; filas: unknown[][] }[],
    nombreArchivo: string,
  ): LiquidacionNormalizada {
    const mapaHojas = new Map(
      hojas.map(h => [this.norm.normalizarTexto(h.nombre), h]),
    );

    const advertencias: string[] = [];
    const hojasFaltantes: string[] = [];

    // ── Metadata ──────────────────────────────────────────────────────────────
    const hojaMetadata = this.hoja(mapaHojas, 'metadata');
    const metadataRaw = hojaMetadata ? this.leerClavesValores(hojaMetadata.filas) : {};
    const metadata = this.construirMetadata(metadataRaw, nombreArchivo, advertencias);

    // ── Acumuladores ──────────────────────────────────────────────────────────
    const hojaAcum = this.hoja(mapaHojas, 'acumuladores');
    if (!hojaAcum) {
      hojasFaltantes.push('Acumuladores');
      advertencias.push('Hoja Acumuladores faltante; el análisis no puede continuar sin acumuladores.');
    }

    const { acumuladores, desconocidos } = hojaAcum
      ? this.parsearAcumuladores(hojaAcum.filas, advertencias)
      : { acumuladores: {}, desconocidos: [] };

    // ── PapelTrabajo (AS-IS) ──────────────────────────────────────────────────
    const hojaPapel = this.hoja(mapaHojas, 'papeltrabajo') ?? this.hoja(mapaHojas, 'papel trabajo');
    let papelAsis: PapelTrabajoAsis | undefined;

    if (hojaPapel) {
      papelAsis = this.parsearPapelTrabajo(hojaPapel.filas);
    } else {
      hojasFaltantes.push('PapelTrabajo');
      advertencias.push(
        'Hoja PapelTrabajo faltante; las validaciones V1, V3, V4 (con AS-IS), V10 quedan NO_EVALUADA por falta de datos del sistema auditado.',
      );
    }

    // ── Config_Cliente ─────────────────────────────────────────────────────────
    const hojaConfig = this.hoja(mapaHojas, 'config cliente') ?? this.hoja(mapaHojas, 'config_cliente');
    let configCliente: ConfigCliente | undefined;

    if (hojaConfig) {
      configCliente = this.parsearConfigCliente(this.leerClavesValores(hojaConfig.filas));
    } else {
      hojasFaltantes.push('Config_Cliente');
      advertencias.push(
        'Hoja Config_Cliente faltante; las validaciones V8, V9, V10, V11, V14, V15 pueden quedar NO_EVALUADA o usar inferencia.',
      );
    }

    // ── Contexto_Normativo ─────────────────────────────────────────────────────
    const hojaLegajo = this.hoja(mapaHojas, 'legajo empleado') ?? this.hoja(mapaHojas, 'legajo_empleado');
    let legajoEmpleado: Record<string, unknown> | undefined = hojaLegajo
      ? this.leerClavesValores(hojaLegajo.filas)
      : undefined;

    if (legajoEmpleado && legajoEmpleado.zona_geografica !== undefined) {
      legajoEmpleado = {
        ...legajoEmpleado,
        zona_geografica: normalizarZonaGeografica(legajoEmpleado.zona_geografica),
      };
    }

    if (!hojaLegajo) {
      hojasFaltantes.push('Legajo_Empleado');
      advertencias.push('Hoja Legajo_Empleado faltante; V5, V13, V14, V15, V16 y V20 pueden quedar NO_EVALUADA.');
    }

    const hojaCtx = this.hoja(mapaHojas, 'contexto normativo') ?? this.hoja(mapaHojas, 'contexto_normativo');
    const contextoNormativoExtendido: Record<string, unknown> | undefined = hojaCtx
      ? this.leerClavesValores(hojaCtx.filas)
      : undefined;

    if (!hojaCtx) {
      hojasFaltantes.push('Contexto_Normativo');
      advertencias.push(
        'Hoja Contexto_Normativo faltante; se usará la escala interna de referencia con advertencia.',
      );
    }

    // ── Log_Calculo (AS-IS, no DEBE-SER) ──────────────────────────────────────
    const hojaLog = this.hoja(mapaHojas, 'log calculo') ?? this.hoja(mapaHojas, 'log_calculo');
    const logCalculoAsis: unknown[] | undefined = hojaLog
      ? this.parsearLogCalculo(hojaLog.filas)
      : undefined;

    if (!hojaLog) {
      hojasFaltantes.push('Log_Calculo');
      advertencias.push(
        'Hoja Log_Calculo faltante; la validación V3 (cadena aritmética AS-IS) queda NO_EVALUADA.',
      );
    }

    // ── Historial_Retenciones ──────────────────────────────────────────────────
    const hojaSiradig = this.hoja(mapaHojas, 'siradig');
    const siradig: unknown[] | undefined = hojaSiradig
      ? this.parsearTablaGenerica(hojaSiradig.filas)
      : undefined;

    if (!hojaSiradig) {
      hojasFaltantes.push('SIRADIG');
      advertencias.push('Hoja SIRADIG faltante; V7, V14, V18 y V19 pueden quedar NO_EVALUADA.');
    }

    const hojaNovedades = this.hoja(mapaHojas, 'novedades mes') ?? this.hoja(mapaHojas, 'novedades_mes');
    const novedadesMes: unknown[] | undefined = hojaNovedades
      ? this.parsearTablaGenerica(hojaNovedades.filas)
      : undefined;

    if (!hojaNovedades) {
      hojasFaltantes.push('Novedades_Mes');
      advertencias.push('Hoja Novedades_Mes faltante; V11, V20 y V21 pueden quedar NO_EVALUADA.');
    }

    const hojaHistorial =
      this.hoja(mapaHojas, 'historial retenciones') ??
      this.hoja(mapaHojas, 'historial_retenciones');
    const historialRetenciones: unknown[] | undefined = hojaHistorial
      ? this.parsearHistorialRetenciones(hojaHistorial.filas)
      : undefined;

    if (!hojaHistorial) {
      hojasFaltantes.push('Historial_Retenciones');
      advertencias.push(
        'Hoja Historial_Retenciones faltante; las validaciones V10, V12 pueden quedar NO_EVALUADA.',
      );
    }

    const hojaAjuste = this.hoja(mapaHojas, 'ajuste final') ?? this.hoja(mapaHojas, 'ajuste_final');
    const ajusteFinal: Record<string, unknown> | undefined = hojaAjuste
      ? this.leerClavesValores(hojaAjuste.filas)
      : undefined;

    if (!hojaAjuste) {
      hojasFaltantes.push('Ajuste_Final');
      advertencias.push('Hoja Ajuste_Final faltante; V19 y V20 quedan NO_EVALUADA salvo que no apliquen al tipo de liquidacion.');
    }

    // ── Papel legacy (vacío en formato extendido) ──────────────────────────────
    // El papel_trabajo legacy se mantiene vacío; se usa papel_trabajo_asis en su lugar.
    const papelLegacy: Record<string, ReturnType<typeof D>> = {};

    return {
      metadata,
      acumuladores,
      papel_trabajo: papelLegacy,
      papel_trabajo_mes: metadata.mes_liquidacion,
      hojas_detectadas: hojas.map(h => h.nombre),
      hojas_faltantes: hojasFaltantes,
      advertencias,
      conceptos_no_reconocidos: desconocidos,
      papel_trabajo_asis: papelAsis,
      config_cliente: configCliente,
      legajo_empleado: legajoEmpleado,
      siradig,
      contexto_normativo_extendido: contextoNormativoExtendido,
      log_calculo_asis: logCalculoAsis,
      novedades_mes: novedadesMes,
      historial_retenciones: historialRetenciones,
      ajuste_final: ajusteFinal,
      formato_extendido: true,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parseo de Acumuladores
  // ─────────────────────────────────────────────────────────────────────────────

  private parsearAcumuladores(
    filas: unknown[][],
    advertencias: string[],
  ): { acumuladores: Record<string, AcumuladorMensual>; desconocidos: string[] } {
    const acumuladores: Record<string, AcumuladorMensual> = {};
    const desconocidos: string[] = [];

    // Detectar fila de encabezados (buscar en las primeras 20 filas)
    let filaHeader = -1;
    const cols: Record<string, number> = {};

    for (let r = 0; r < Math.min(filas.length, 20); r++) {
      const fila = (filas[r] ?? []) as unknown[];
      const textos = fila.map(v => this.norm.normalizarTexto(v));

      // La fila de encabezado debe tener "acumulador" y al menos 6 meses
      const tieneAcumulador = textos.some(t => t === 'acumulador' || t === 'acomulador');
      const mesesPresentes = MESES_NORM.filter(m => textos.includes(m));

      if (tieneAcumulador && mesesPresentes.length >= 6) {
        filaHeader = r;
        textos.forEach((t, c) => { cols[t] = c; });
        break;
      }
    }

    if (filaHeader === -1) {
      advertencias.push(
        'No se detectaron encabezados válidos en la hoja Acumuladores (se espera columna "acumulador" y al menos 6 meses).',
      );
      return { acumuladores, desconocidos };
    }

    const colAcum = cols['acumulador'] ?? cols['acomulador'];
    const colTipo = cols['tipo'];

    for (let r = filaHeader + 1; r < filas.length; r++) {
      const fila = (filas[r] ?? []) as unknown[];
      const etiqueta = fila[colAcum];

      if (etiqueta == null || String(etiqueta).trim() === '') continue;

      const clave = this.norm.normalizarClave(etiqueta);

      if (!clave) {
        const tieneValores = MESES_NORM.some(m => cols[m] !== undefined && fila[cols[m]!] != null);
        if (tieneValores) desconocidos.push(String(etiqueta).trim());
        continue;
      }

      const valores = {} as Record<Mes, ReturnType<typeof D>>;
      for (const mes of MESES) {
        const colMes = cols[mes];
        valores[mes] = colMes !== undefined ? this.norm.convertirNumero(fila[colMes]) : D(0);
      }

      const total =
        cols['total'] !== undefined
          ? this.norm.convertirNumero(fila[cols['total']])
          : Object.values(valores).reduce((a, b) => a.plus(b), D(0));

      if (acumuladores[clave]) {
        advertencias.push(`El acumulador '${clave}' aparece más de una vez; se usó la última fila.`);
      }

      acumuladores[clave] = {
        clave,
        etiqueta_original: String(etiqueta).trim(),
        tipo_original:
          colTipo !== undefined && fila[colTipo] != null
            ? String(fila[colTipo]).trim()
            : null,
        valores,
        total,
        fila_origen: r + 1,
      };
    }

    return { acumuladores, desconocidos };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parseo de PapelTrabajo (AS-IS)
  // ─────────────────────────────────────────────────────────────────────────────

  private parsearPapelTrabajo(filas: unknown[][]): PapelTrabajoAsis {
    const raw = this.leerClavesValores(filas);
    const get = (k: string) => {
      const v = this.valorPorClave(raw, k);
      if (v === undefined || v === null || v === '') return null;
      try { return this.norm.convertirNumero(v); } catch { return null; }
    };
    const getNum = (k: string): number | null => {
      const v = this.valorPorClave(raw, k);
      if (v === undefined || v === null) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    return {
      total_ingresos: get('total_ingresos') ?? get('total ingresos'),
      deducciones_personales: get('deducciones_personales'),
      educativos_domesticos: get('educativos_domesticos'),
      ganancia_neta_previa: get('ganancia_neta_previa') ?? get('ganancia neta previa'),
      deducciones_generales_previa: get('deducciones_generales_previa'),
      deducciones_art30: get('deducciones_art30'),
      cm_asistencial: get('cm_asistencial'),
      ganancia_neta: get('ganancia_neta') ?? get('ganancia neta'),
      escala_tramo_numero: getNum('escala_tramo_numero') ?? getNum('tramo'),
      escala_minimo_tramo: get('escala_minimo_tramo') ?? get('escala minimo tramo'),
      escala_maximo_tramo: get('escala_maximo_tramo'),
      escala_importe_fijo: get('escala_importe_fijo') ?? get('importe fijo'),
      escala_porcentaje: get('escala_porcentaje') ?? get('porcentaje'),
      sobre_diferencia: get('sobre_diferencia') ?? get('sobre diferencia'),
      impuesto_determinado: get('impuesto_determinado') ?? get('impuesto determinado'),
      pagos_anteriores: get('pagos_anteriores') ?? get('pagos anteriores'),
      retencion_del_mes_calculada:
        get('retencion_del_mes_calculada') ?? get('retencion calculada'),
      retencion_del_mes_efectiva:
        get('retencion_del_mes_efectiva') ?? get('retencion efectiva'),
      saldo_a_favor_acumulado:
        get('saldo_a_favor_acumulado') ?? get('saldo a favor acumulado'),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parseo de Config_Cliente
  // ─────────────────────────────────────────────────────────────────────────────

  private parsearConfigCliente(raw: Record<string, unknown>): ConfigCliente {
    const s = (k: string): string | null => {
      const v = this.valorPorClave(raw, k);
      return v != null && String(v).trim() !== '' ? String(v).trim().toLowerCase() : null;
    };

    return {
      modalidad_sac: s('modalidad_sac'),
      modo_saldo_favor: normalizarModoSaldoFavor(s('modo_saldo_favor')),
      poliza_seguro_cobra_sobre_sac: s('poliza_seguro_cobra_sobre_sac'),
      modalidad_hnh_default: s('modalidad_hnh_default'),
      agente_retencion_unico: this.parseBool(this.valorPorClave(raw, 'agente_retencion_unico')),
      zona_geografica_default: normalizarZonaGeografica(s('zona_geografica_default')),
    };
  }

  private parseBool(v: unknown): boolean | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim().toLowerCase();
    if (s === 'true' || s === 'si' || s === 'sí' || s === '1') return true;
    if (s === 'false' || s === 'no' || s === '0') return false;
    return null;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parseo de Log_Calculo (AS-IS)
  // ─────────────────────────────────────────────────────────────────────────────

  private parsearLogCalculo(filas: unknown[][]): unknown[] {
    const pasos: unknown[] = [];
    let filaHeader = -1;
    const cols: Record<string, number> = {};

    for (let r = 0; r < Math.min(filas.length, 10); r++) {
      const claves = (filas[r] ?? []).map(v => this.claveTecnica(v));
      if (claves.some(t => ['paso_numero', 'paso', 'paso_nombre', 'nombre'].includes(t))) {
        filaHeader = r;
        claves.forEach((t, c) => {
          const canonica = ALIASES_LOG_CALCULO[t] ?? (
            COLUMNAS_LOG_CALCULO.includes(t as (typeof COLUMNAS_LOG_CALCULO)[number])
              ? t as (typeof COLUMNAS_LOG_CALCULO)[number]
              : undefined
          );
          if (canonica) cols[canonica] = c;
        });
        break;
      }
    }

    const start = filaHeader >= 0 ? filaHeader + 1 : 0;
    for (let r = start; r < filas.length; r++) {
      const fila = (filas[r] ?? []) as unknown[];
      if (fila.every(v => v == null || String(v).trim() === '')) continue;
      const paso: Record<string, unknown> = {};
      for (const columna of COLUMNAS_LOG_CALCULO) {
        paso[columna] =
          cols[columna] !== undefined
            ? this.parsearValorEstructurado(fila[cols[columna]])
            : null;
      }

      // Compatibilidad con la variante corta del XLSX de spec completo:
      // paso | nombre | entrada | formula | resultado | observacion.
      if (paso.paso_numero == null) paso.paso_numero = fila[0] ?? null;
      if (paso.paso_nombre == null) paso.paso_nombre = fila[1] ?? null;
      if (paso.entradas == null) paso.entradas = fila[2] ?? null;
      if (paso.formula == null) paso.formula = fila[3] ?? null;
      if (paso.salida == null) paso.salida = fila[4] ?? null;
      if (paso.observaciones == null) paso.observaciones = fila[5] ?? null;

      pasos.push(paso);
    }

    return pasos;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Parseo de Historial_Retenciones
  // ─────────────────────────────────────────────────────────────────────────────

  private parsearHistorialRetenciones(filas: unknown[][]): unknown[] {
    const registros: unknown[] = [];
    const cols: Record<string, number> = {};
    let filaHeader = -1;

    for (let r = 0; r < Math.min(filas.length, 10); r++) {
      const claves = (filas[r] ?? []).map(v => this.claveTecnica(v));
      const tieneRetenc = claves.some(t => t.includes('retencion') || t.includes('mes'));
      if (tieneRetenc && claves.some(t => MESES_NORM.includes(t) || t === 'mes')) {
        filaHeader = r;
        claves.forEach((t, c) => { if (t) cols[t] = c; });
        break;
      }
    }

    const start = filaHeader >= 0 ? filaHeader + 1 : 0;
    for (let r = start; r < filas.length; r++) {
      const fila = (filas[r] ?? []) as unknown[];
      if (fila.every(v => v == null)) continue;
      registros.push(Object.fromEntries(Object.entries(cols).map(([k, c]) => [k, fila[c]])));
    }

    return registros;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Parsea hojas tabulares del spec preservando nombres tecnicos de columnas.
   *
   * Se usa para SIRADIG y Novedades_Mes, donde el contrato maquina esta en
   * encabezados snake_case. Si el archivo trae encabezados humanizados, se
   * normalizan solo como fallback de lectura; el valor de negocio no se inventa.
   */
  private parsearTablaGenerica(filas: unknown[][]): unknown[] {
    const registros: unknown[] = [];
    const cols: Record<string, number> = {};
    let filaHeader = -1;

    for (let r = 0; r < Math.min(filas.length, 15); r++) {
      const claves = (filas[r] ?? []).map(v => this.claveTecnica(v));
      const validas = claves.filter(Boolean);
      if (validas.length >= 2) {
        filaHeader = r;
        claves.forEach((t, c) => { if (t) cols[t] = c; });
        break;
      }
    }

    if (filaHeader < 0) return registros;

    for (let r = filaHeader + 1; r < filas.length; r++) {
      const fila = (filas[r] ?? []) as unknown[];
      if (fila.every(v => v == null || String(v).trim() === '')) continue;
      registros.push(
        Object.fromEntries(
          Object.entries(cols).map(([k, c]) => [k, this.parsearValorEstructurado(fila[c])]),
        ),
      );
    }

    return registros;
  }

  private hoja(
    mapaHojas: Map<string, { nombre: string; filas: unknown[][] }>,
    nombreNorm: string,
  ): { nombre: string; filas: unknown[][] } | undefined {
    // Búsqueda exacta
    if (mapaHojas.has(nombreNorm)) return mapaHojas.get(nombreNorm);
    // Búsqueda parcial
    for (const [k, v] of mapaHojas) {
      if (k.includes(nombreNorm) || nombreNorm.includes(k)) return v;
    }
    return undefined;
  }

  /**
   * Lee una hoja con estructura clave | valor (dos columnas).
   * También soporta formato vertical: clave en col 0, valor en col 1.
   * Si la clave ya viene en snake_case del spec, se preserva exacta, incluidos
   * dobles underscores. Las variantes humanizadas quedan solo como fallback legacy.
   */
  private leerClavesValores(filas: unknown[][]): Record<string, unknown> {
    const resultado: Record<string, unknown> = {};
    for (const fila of filas) {
      const f = (fila ?? []) as unknown[];
      if (f.length < 2) continue;
      const clave = this.claveTecnica(f[0]);
      if (!clave) continue;
      resultado[clave] = f[1];

      const claveLegacy = this.norm.normalizarTexto(f[0]);
      if (claveLegacy) {
        resultado[claveLegacy] ??= f[1];
        resultado[claveLegacy.replace(/\s+/g, '_')] ??= f[1];
      }
    }
    return resultado;
  }

  /**
   * Convierte encabezados y campos de contrato a clave técnica.
   * Preserva snake_case ya emitido por el spec, dobles underscores y rutas con punto.
   */
  private claveTecnica(valor: unknown): string {
    const raw = String(valor ?? '')
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!raw) return '';

    return raw
      .replace(/[^a-z0-9_.]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private valorPorClave(raw: Record<string, unknown>, clave: string): unknown {
    const claveCanonica = this.claveTecnica(clave);
    return raw[claveCanonica] ?? raw[this.norm.normalizarTexto(clave)];
  }

  private parsearValorEstructurado(valor: unknown): unknown {
    if (typeof valor !== 'string') return valor ?? null;
    const texto = valor.trim();
    if (!texto) return null;
    if (!['{', '['].includes(texto[0])) return valor;
    try {
      return JSON.parse(texto);
    } catch {
      return valor;
    }
  }

  private construirMetadata(
    raw: Record<string, unknown>,
    nombreArchivo: string,
    advertencias: string[],
  ): MetadataArchivo {
    const s = (k: string) => {
      const v = raw[k];
      return v != null && String(v).trim() !== '' ? String(v).trim() : null;
    };
    const n = (k: string): number | null => {
      const v = raw[k];
      if (v == null) return null;
      const num = Number(v);
      return isNaN(num) ? null : num;
    };

    const cliente = s('cliente_nombre') ?? s('cliente') ?? null;
    const legajo = s('legajo_numero') ?? s('legajo') ?? null;
    const periodoFiscal = n('periodo_fiscal') ?? n('periodo') ?? null;
    const mesLiquidacion = n('mes_liquidacion') ?? n('mes') ?? null;

    if (!periodoFiscal) {
      advertencias.push('Hoja Metadata: periodo_fiscal no encontrado; las validaciones de escala pueden fallar.');
    }
    if (!mesLiquidacion) {
      advertencias.push('Hoja Metadata: mes_liquidacion no encontrado.');
    }

    return {
      archivo: nombreArchivo,
      hoja: 'Acumuladores',
      cliente,
      legajo,
      periodo_fiscal: periodoFiscal,
      mes_liquidacion: mesLiquidacion,
      tipo_liquidacion: s('tipo_liquidacion'),
      motor_ganancias_version: s('motor_ganancias_version'),
      schema_version: s('schema_version'),
    };
  }
}
