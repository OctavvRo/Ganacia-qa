import Decimal from 'decimal.js';

export const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'] as const;
export type Mes = typeof MESES[number];

export interface MetadataArchivo {
  archivo: string;
  hoja: string;
  cliente: string | null;
  legajo: string | null;
  periodo_fiscal: number | null;
  mes_liquidacion: number | null;
  /** Sólo presente en formato extendido spec */
  tipo_liquidacion?: string | null;
  motor_ganancias_version?: string | null;
  schema_version?: string | null;
}

export interface AcumuladorMensual {
  clave: string;
  etiqueta_original: string;
  tipo_original: string | null;
  valores: Record<Mes, Decimal>;
  total: Decimal;
  fila_origen: number;
}

/** Paso individual del papel de trabajo de referencia (DEBE-SER) */
export interface PasoCalculo {
  paso: number;
  descripcion: string;
  referencia_normativa?: string;
  entradas: Record<string, string>;
  formula: string;
  operacion?: string;
  resultado: string;
}

/**
 * Configuración del cliente leída de la hoja Config_Cliente del formato extendido.
 * Todos los campos son opcionales; su ausencia se registra como advertencia.
 */
export interface ConfigCliente {
  modalidad_sac?: string | null;
  modo_saldo_favor?: string | null;
  poliza_seguro_cobra_sobre_sac?: string | null;
  modalidad_hnh_default?: string | null;
  agente_retencion_unico?: boolean | null;
  zona_geografica_default?: string | null;
}

/**
 * Datos AS-IS de escala/papel de trabajo declarados por el sistema auditado.
 * Provienen de la hoja PapelTrabajo o Log_Calculo del reporte extendido.
 */
export interface PapelTrabajoAsis {
  total_ingresos?: Decimal | null;
  deducciones_personales?: Decimal | null;
  educativos_domesticos?: Decimal | null;
  ganancia_neta_previa?: Decimal | null;
  deducciones_generales_previa?: Decimal | null;
  deducciones_art30?: Decimal | null;
  cm_asistencial?: Decimal | null;
  ganancia_neta?: Decimal | null;
  escala_tramo_numero?: number | null;
  escala_minimo_tramo?: Decimal | null;
  escala_maximo_tramo?: Decimal | null;
  escala_importe_fijo?: Decimal | null;
  escala_porcentaje?: Decimal | null;
  sobre_diferencia?: Decimal | null;
  impuesto_determinado?: Decimal | null;
  pagos_anteriores?: Decimal | null;
  retencion_del_mes_calculada?: Decimal | null;
  retencion_del_mes_efectiva?: Decimal | null;
  saldo_a_favor_acumulado?: Decimal | null;
  [clave: string]: Decimal | number | string | null | undefined;
}

export interface LiquidacionNormalizada {
  metadata: MetadataArchivo;
  acumuladores: Record<string, AcumuladorMensual>;
  /** Datos del papel de trabajo del formato legacy (escalas laterales, etc.) */
  papel_trabajo: Record<string, Decimal>;
  papel_trabajo_mes: number | null;
  hojas_detectadas: string[];
  hojas_faltantes: string[];
  advertencias: string[];
  conceptos_no_reconocidos: string[];
  /** Control tecnico de estructura fisica de la hoja de acumuladores. */
  estructura_excel?: EstructuraExcel;

  /** Formato extendido — se llena sólo si existe la hoja PapelTrabajo AS-IS */
  papel_trabajo_asis?: PapelTrabajoAsis;
  /** Configuración leída de la hoja Config_Cliente */
  config_cliente?: ConfigCliente;
  legajo_empleado?: Record<string, unknown>;
  siradig?: unknown[];
  /** Datos de contexto normativo de la hoja Contexto_Normativo */
  contexto_normativo_extendido?: Record<string, unknown>;
  /** Pasos del Log_Calculo AS-IS (no usar como DEBE-SER) */
  log_calculo_asis?: unknown[];
  novedades_mes?: unknown[];
  /** Historial de retenciones mensuales */
  historial_retenciones?: unknown[];
  ajuste_final?: Record<string, unknown>;
  contexto_complementario_excel?: Record<string, unknown>;
  /** ¿El origen es formato extendido spec? */
  formato_extendido?: boolean;
}

export interface EstructuraExcel {
  hoja: string;
  rango_detectado: string | null;
  rango_hoja_detectado?: string | null;
  rango_tabla_esperado?: string;
  controla_solo_tabla?: boolean;
  filas_esperadas: number;
  filas_detectadas: number;
  filas_1_49_detectadas: boolean;
  filas_faltantes: number[];
  filas_extras: number[];
  filas_ignoradas_fuera_tabla?: number;
  columnas_esperadas: number;
  columnas_detectadas: number;
  columnas_esperadas_detalle: string[];
  columnas_presentes: string[];
  columnas_faltantes: string[];
  columnas_extras: string[];
  columnas_ignoradas_fuera_tabla?: string[];
  columnas_a_o_presentes: boolean;
  meses_esperados: string[];
  meses_presentes: string[];
  meses_faltantes: string[];
  meses_enero_diciembre_presentes: boolean;
}

export interface TramoEscala {
  tramo: number;
  minimo: Decimal;
  maximo: Decimal | null;
  importe_fijo: Decimal;
  porcentaje: Decimal;
}

export interface ResultadoValidacion {
  codigo: string;
  estado: string;
  detalle: string;
  [clave: string]: unknown;
}
