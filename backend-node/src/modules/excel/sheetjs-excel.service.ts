import { BadRequestException, Injectable } from '@nestjs/common';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { D } from '../../common/decimal/decimal.util';
import { AcumuladorMensual, EstructuraExcel, LiquidacionNormalizada, MESES, Mes, MetadataArchivo } from '../motor-ganancias/dominio';
import { NormalizadorService } from '../normalizacion/normalizador.service';
import { normalizarModoSaldoFavor } from '../normalizacion/modo-saldo-favor.util';
import { normalizarZonaGeografica } from '../normalizacion/zona-geografica.util';
import { ParserReporteExtendidoService } from './parser-reporte-extendido.service';

const PAPEL_TRABAJO_ALIASES: Record<string, string[]> = {
  total_ingresos: ['total ingresos', 'total de ingresos'],
  escala_minimo_tramo: [
    'escala_minimo_tramo',
    'escala minimo tramo',
    'escala de ganancias',
    'minimo tramo',
    'minimo del tramo',
    'minimo de escala',
  ],
  escala_maximo_tramo: [
    'escala_maximo_tramo',
    'escala maximo tramo',
    'maximo tramo',
    'maximo del tramo',
    'maximo de escala',
  ],
  escala_tramo_numero: [
    'escala_tramo_numero',
    'escala tramo numero',
    'tramo escala',
    'tramo art 94',
  ],
  sobre_diferencia: [
    'sobre_diferencia',
    'sobre diferencia',
    'sobre dif',
    'excedente sobre minimo',
    'excedente sobre mínimo',
    'sobre excedente',
  ],
  porcentaje_tramo: [
    'porcentaje_tramo',
    'porcentaje tramo',
    'porcentaje de escala',
    'alicuota marginal',
    'alícuota marginal',
    'porcentaje sobre excedente',
  ],
  importe_fijo_tramo: [
    'importe_fijo_tramo',
    'importe fijo tramo',
    'importe fijo',
    'importe fijo escala',
    'pagan segun escala',
    'pagan según escala',
  ],
  impuesto_determinado: [
    'impuesto_determinado',
    'impuesto determinado',
    'impuesto calculado',
  ],
  pagos_anteriores: [
    'pagos_anteriores',
    'pagos anteriores',
    'retenciones anteriores',
    'retencion anterior',
    'retenciones previas',
  ],
  retencion_del_mes: [
    'retencion_del_mes',
    'retencion del mes',
    'retencion calculada',
    'retencion a practicar',
  ],
};

const CARGAS_FAMILIA_HIJOS_PRECISION = [
  'cargas_familia_hijos_evento',
  'cargas_familia_hijos_evento_cantidad',
  'cargas_familia_hijos_desde_mes',
  'cargas_familia_hijos_motivo',
  'cargas_familia_hijos_equivalentes',
  ...MESES.map(mes => `cargas_familia_hijos_equivalentes_${mes}`),
];

@Injectable()
export class SheetjsExcelService {
  constructor(
    private readonly normalizador: NormalizadorService,
    private readonly parserExtendido: ParserReporteExtendidoService,
  ) {}

  async leer(buffer: Buffer, nombreArchivo: string): Promise<LiquidacionNormalizada> {
    if (path.extname(nombreArchivo).toLowerCase() !== '.xlsx') {
      throw new BadRequestException('El archivo debe tener extension .xlsx');
    }

    let libro: XLSX.WorkBook;

    try {
      libro = XLSX.read(buffer, {
        type: 'buffer',
        cellFormula: false,
        cellDates: false,
        raw: true,
      });
    } catch (error) {
      throw new BadRequestException(`No se pudo abrir el libro: ${String(error)}`);
    }

    const hojas = libro.SheetNames.map(nombre => ({
      nombre,
      filas: XLSX.utils.sheet_to_json<unknown[]>(libro.Sheets[nombre], {
        header: 1,
        raw: true,
        defval: null,
      }),
    }));
    const estructuras = Object.fromEntries(
      libro.SheetNames.map(nombre => [nombre, this.estructuraExcel(nombre, libro.Sheets[nombre])]),
    );

    // DETECCIÓN DE FORMATO:
    // Si alguna hoja tiene un nombre que normaliza a "acumuladores", usamos el parser extendido.
    const tieneAcumuladores = hojas.some(
      h => this.normalizador.normalizarTexto(h.nombre) === 'acumuladores',
    );

    if (tieneAcumuladores) {
      const liquidacion = this.parserExtendido.parsear(hojas, nombreArchivo);
      const hojaAcumuladores = hojas.find(
        h => this.normalizador.normalizarTexto(h.nombre) === 'acumuladores',
      );
      return {
        ...liquidacion,
        ...(hojaAcumuladores ? { estructura_excel: estructuras[hojaAcumuladores.nombre] } : {}),
      };
    }

    // Formato Legacy actual:
    const principal = this.detectarHoja(hojas);
    const { filaEncabezado, columnas } = this.detectarColumnas(principal.filas);
    const acumuladores: Record<string, AcumuladorMensual> = {};
    const desconocidos: string[] = [];
    const advertencias: string[] = [];

    for (let indice = filaEncabezado + 1; indice < principal.filas.length; indice++) {
      const fila = principal.filas[indice] ?? [];
      const etiqueta = fila[columnas.concepto];

      if (etiqueta == null || String(etiqueta).trim() === '') continue;

      const clave = this.normalizador.normalizarClave(etiqueta);

      if (!clave) {
        const parece =
          columnas.tipo !== undefined
            ? Boolean(fila[columnas.tipo])
            : MESES.some(m => columnas[m] !== undefined && fila[columnas[m]!] != null);

        if (parece) desconocidos.push(String(etiqueta).trim());
        continue;
      }

      const valores = {} as Record<Mes, ReturnType<typeof D>>;

      for (const mes of MESES) {
        valores[mes] =
          columnas[mes] !== undefined
            ? this.normalizador.convertirNumero(fila[columnas[mes]!])
            : D(0);
      }

      const total =
        columnas.total !== undefined
          ? this.normalizador.convertirNumero(fila[columnas.total])
          : Object.values(valores).reduce((a, b) => a.plus(b), D(0));

      if (acumuladores[clave]) {
        advertencias.push(`El concepto '${clave}' aparece mas de una vez; se uso la ultima fila.`);
      }

      acumuladores[clave] = {
        clave,
        etiqueta_original: String(etiqueta).trim(),
        tipo_original:
          columnas.tipo !== undefined && fila[columnas.tipo] != null
            ? String(fila[columnas.tipo]).trim()
            : null,
        valores,
        total,
        fila_origen: indice + 1,
      };
    }

    if (!Object.keys(acumuladores).length) {
      throw new BadRequestException('No se reconio ningun acumulador en el libro');
    }

    const metadata = this.metadata(nombreArchivo, principal.nombre, principal.filas[0]?.[0]);
    const papel = this.extraerPapelTrabajo(hojas, principal);
    const contextoEmbebido = this.combinarContextosComplementarios([
      this.extraerContextoComplementarioEmbebido(principal.filas, metadata, advertencias),
      ...hojas
        .filter(hoja => hoja.nombre !== principal.nombre && this.esHojaDatosExtras(hoja.nombre))
        .map(hoja => this.extraerContextoComplementarioEmbebido(hoja.filas, metadata, advertencias, true)),
    ]);
    const datosCliente = contextoEmbebido.datos_cliente as Record<string, unknown> | undefined;
    const datosLegajo = contextoEmbebido.datos_legajo as Record<string, unknown> | undefined;

    return {
      metadata,
      acumuladores,
      papel_trabajo: papel,
      papel_trabajo_mes: metadata.mes_liquidacion,
      hojas_detectadas: libro.SheetNames,
      hojas_faltantes: [],
      advertencias,
      conceptos_no_reconocidos: desconocidos,
      estructura_excel: estructuras[principal.nombre],
      ...(Object.keys(contextoEmbebido).length
        ? { contexto_complementario_excel: contextoEmbebido }
        : {}),
      ...(datosCliente && Object.keys(datosCliente).length
        ? {
            config_cliente: {
              modalidad_sac: this.texto(datosCliente.modalidad_sac),
              modo_saldo_favor: this.texto(datosCliente.modo_saldo_favor),
              poliza_seguro_cobra_sobre_sac: this.texto(datosCliente.poliza_seguro_cobra_sobre_sac),
              modalidad_hnh_default: this.texto(datosCliente.modalidad_hnh_default),
              agente_retencion_unico: this.booleano(datosCliente.agente_retencion_unico),
              zona_geografica_default: this.texto(datosCliente.zona_geografica_default),
            },
          }
        : {}),
      ...(datosLegajo && Object.keys(datosLegajo).length ? { legajo_empleado: datosLegajo } : {}),
    };
  }

  /**
   * Lee bloques complementarios embebidos en Excel legacy.
   *
   * Algunos archivos reales conservan la hoja unica de acumuladores y agregan,
   * debajo o a la derecha, secciones con marcas como "HOJA: Config_Cliente".
   * Esta lectura respeta las claves tecnicas antes del separador "|" y toma el
   * valor de la celda inmediata a la derecha para no usar notas visuales como
   * datos de calculo.
   */
  private extraerContextoComplementarioEmbebido(
    filas: unknown[][],
    metadata: MetadataArchivo,
    advertencias: string[],
    permitirClavesSimples = false,
  ): Record<string, unknown> {
    const gruposPorHoja: Record<string, string> = {
      config_cliente: 'datos_cliente',
      legajo_empleado: 'datos_legajo',
      siradig: 'datos_siradig',
      contexto_normativo: 'datos_normativa',
      novedades_mes: 'datos_novedades',
      historial_retenciones: 'datos_historial',
      ajuste_final: 'datos_ajuste_final',
    };
    const gruposPorCampo: Record<string, string> = {
      cliente_cuit: 'datos_cliente',
      modalidad_sac: 'datos_cliente',
      modo_saldo_favor: 'datos_cliente',
      poliza_seguro_cobra_sobre_sac: 'datos_cliente',
      cct_default: 'datos_cliente',
      zona_geografica_default: 'datos_cliente',
      legajo_numero: 'datos_legajo',
      empleado_cuil: 'datos_legajo',
      fecha_ingreso: 'datos_legajo',
      fecha_egreso: 'datos_legajo',
      zona_geografica: 'datos_legajo',
      regimen_previsional: 'datos_legajo',
      cct_aplicable: 'datos_legajo',
      categoria: 'datos_legajo',
      situacion_revista: 'datos_legajo',
      cargas_familia_conyuge: 'datos_legajo',
      cargas_familia_cant_hijos: 'datos_legajo',
      cargas_familia_otras: 'datos_legajo',
      tiene_otros_empleadores: 'datos_legajo',
      ...Object.fromEntries(CARGAS_FAMILIA_HIJOS_PRECISION.map(clave => [clave, 'datos_legajo'])),
      siradig_disponible: 'datos_siradig',
      gastos_medicos: 'datos_siradig',
      cuota_medico_asistencial: 'datos_siradig',
      gastos_educativos: 'datos_siradig',
      servicio_domestico: 'datos_siradig',
      alquileres_inquilino: 'datos_siradig',
      donaciones: 'datos_siradig',
      seguros: 'datos_siradig',
      intereses_hipotecarios: 'datos_siradig',
      otros_empleadores: 'datos_siradig',
      normativa_oficial_validada: 'datos_normativa',
      periodo_normativo: 'datos_normativa',
      ripte: 'datos_normativa',
      parametros_por_zona: 'datos_normativa',
      topes_por_rubro: 'datos_normativa',
      tabla_regimenes_previsionales: 'datos_normativa',
      orden_topes: 'datos_normativa',
      escala_art94_version: 'datos_normativa',
      hnh_mes: 'datos_novedades',
      modalidad_hnh: 'datos_novedades',
      distribucion_hnh: 'datos_novedades',
      conceptos_exentos_art26: 'datos_novedades',
      conceptos_egreso: 'datos_novedades',
      historial_retenciones_disponible: 'datos_historial',
      retenciones_efectivas_previas: 'datos_historial',
      escala_art94_por_mes: 'datos_historial',
      ajustes_previos: 'datos_historial',
      ajuste_final_disponible: 'datos_ajuste_final',
      siradig_definitivo: 'datos_ajuste_final',
      egreso_en_periodo: 'datos_ajuste_final',
      indemnizaciones: 'datos_ajuste_final',
    };
    const contexto: Record<string, Record<string, unknown>> = {};
    let grupoActual: string | null = null;

    for (const fila of filas) {
      const celdas = (fila ?? []) as unknown[];
      const indiceHoja = celdas.findIndex(celda => this.esMarcaHojaEmbebida(celda));

      if (indiceHoja >= 0) {
        const nombreHoja = this.claveTecnica(String(celdas[indiceHoja]).replace(/^hoja\s*:/i, ''));
        grupoActual = gruposPorHoja[nombreHoja] ?? null;
        if (grupoActual) contexto[grupoActual] ??= {};
        continue;
      }

      for (let c = 0; c < celdas.length - 1; c++) {
        const clave = this.claveCampoEmbebido(celdas[c], permitirClavesSimples);
        if (!clave) continue;
        const grupoDestino = grupoActual ?? gruposPorCampo[clave];
        if (!grupoDestino) continue;

        const valor = this.valorComplementario(clave, celdas[c + 1]);
        if (!this.tieneValorComplementario(valor)) continue;

        contexto[grupoDestino] ??= {};
        contexto[grupoDestino][clave] = valor;
        break;
      }
    }

    if (metadata.cliente) {
      contexto.datos_cliente ??= {};
      contexto.datos_cliente.cliente_nombre ??= metadata.cliente;
    }

    if (metadata.legajo) {
      contexto.datos_legajo ??= {};
      const legajoEmbebido = contexto.datos_legajo.legajo_numero;
      if (
        this.tieneValorComplementario(legajoEmbebido) &&
        String(legajoEmbebido).trim() !== String(metadata.legajo).trim()
      ) {
        advertencias.push(
          `El bloque Legajo_Empleado informa legajo_numero=${legajoEmbebido}, pero el archivo/hoja identifica legajo=${metadata.legajo}; se mantiene el legajo del archivo.`,
        );
      }
      contexto.datos_legajo.legajo_numero = metadata.legajo;
    }

    return Object.fromEntries(
      Object.entries(contexto).filter(([, valores]) => Object.keys(valores).length),
    );
  }

  /**
   * Lee la estructura fisica de la hoja usada por el motor.
   *
   * Este control no interpreta impuestos: solamente deja evidencia de si la
   * tabla base A1:O49 respeta el formato operativo esperado. Cualquier bloque
   * auxiliar fuera de esa tabla se ignora para no penalizar datos extras,
   * referencias manuales o notas de trabajo.
   */
  private estructuraExcel(nombre: string, hoja: XLSX.WorkSheet): EstructuraExcel {
    const filasEsperadas = 49;
    const columnasEsperadas = 15;
    const rangoTablaEsperado = 'A1:O49';
    const columnasEsperadasDetalle = Array.from({ length: columnasEsperadas }, (_, i) =>
      XLSX.utils.encode_col(i),
    );
    const mesesEsperados = [...MESES];
    const ref = hoja['!ref'] ?? null;

    if (!ref) {
      return {
        hoja: nombre,
        rango_detectado: null,
        rango_hoja_detectado: null,
        rango_tabla_esperado: rangoTablaEsperado,
        controla_solo_tabla: true,
        filas_esperadas: filasEsperadas,
        filas_detectadas: 0,
        filas_1_49_detectadas: false,
        filas_faltantes: Array.from({ length: filasEsperadas }, (_, i) => i + 1),
        filas_extras: [],
        filas_ignoradas_fuera_tabla: 0,
        columnas_esperadas: columnasEsperadas,
        columnas_detectadas: 0,
        columnas_esperadas_detalle: columnasEsperadasDetalle,
        columnas_presentes: [],
        columnas_faltantes: columnasEsperadasDetalle,
        columnas_extras: [],
        columnas_ignoradas_fuera_tabla: [],
        columnas_a_o_presentes: false,
        meses_esperados: mesesEsperados,
        meses_presentes: [],
        meses_faltantes: mesesEsperados,
        meses_enero_diciembre_presentes: false,
      };
    }

    const rango = XLSX.utils.decode_range(ref);
    const filasEsperadasDetalle = Array.from({ length: filasEsperadas }, (_, i) => i + 1);
    const columnasPresentes = columnasEsperadasDetalle.filter((_, i) => i >= rango.s.c && i <= rango.e.c);
    const columnasFaltantes = columnasEsperadasDetalle.filter((_, i) => i < rango.s.c || i > rango.e.c);
    const columnasIgnoradasFueraTabla = Array.from(
      { length: Math.max(rango.e.c - Math.max(rango.s.c, columnasEsperadas) + 1, 0) },
      (_, i) => XLSX.utils.encode_col(Math.max(rango.s.c, columnasEsperadas) + i),
    );
    const filasPresentes = filasEsperadasDetalle.filter(
      fila => fila - 1 >= rango.s.r && fila - 1 <= rango.e.r,
    );
    const filasFaltantes = filasEsperadasDetalle.filter(
      fila => fila - 1 < rango.s.r || fila - 1 > rango.e.r,
    );
    const filasIgnoradasFueraTabla = Math.max(rango.e.r - (filasEsperadas - 1), 0);
    const mesesPresentes = this.mesesPresentesEnTabla(hoja);
    const mesesFaltantes = mesesEsperados.filter(m => !mesesPresentes.includes(m));

    return {
      hoja: nombre,
      rango_detectado: rangoTablaEsperado,
      rango_hoja_detectado: ref,
      rango_tabla_esperado: rangoTablaEsperado,
      controla_solo_tabla: true,
      filas_esperadas: filasEsperadas,
      filas_detectadas: filasPresentes.length,
      filas_1_49_detectadas: filasFaltantes.length === 0,
      filas_faltantes: filasFaltantes,
      filas_extras: [],
      filas_ignoradas_fuera_tabla: filasIgnoradasFueraTabla,
      columnas_esperadas: columnasEsperadas,
      columnas_detectadas: columnasPresentes.length,
      columnas_esperadas_detalle: columnasEsperadasDetalle,
      columnas_presentes: columnasPresentes,
      columnas_faltantes: columnasFaltantes,
      columnas_extras: [],
      columnas_ignoradas_fuera_tabla: columnasIgnoradasFueraTabla,
      columnas_a_o_presentes: columnasFaltantes.length === 0,
      meses_esperados: mesesEsperados,
      meses_presentes: mesesPresentes,
      meses_faltantes: mesesFaltantes,
      meses_enero_diciembre_presentes: mesesFaltantes.length === 0,
    };
  }

  private mesesPresentesEnTabla(hoja: XLSX.WorkSheet): string[] {
    const encontrados = new Set<string>();

    for (let r = 0; r < 49; r++) {
      for (let c = 0; c < 15; c++) {
        const direccion = XLSX.utils.encode_cell({ r, c });
        const valor = (hoja[direccion] as XLSX.CellObject | undefined)?.v;
        const texto = this.normalizador.normalizarTexto(valor);
        if ((MESES as readonly string[]).includes(texto)) encontrados.add(texto);
      }
    }

    return MESES.filter(m => encontrados.has(m));
  }

  private esMarcaHojaEmbebida(valor: unknown): boolean {
    return /^hoja\s*:/i.test(String(valor ?? '').trim());
  }

  private esHojaDatosExtras(nombre: string): boolean {
    const normalizado = this.normalizador.normalizarTexto(nombre);
    return normalizado === 'datos extras' || normalizado === 'datos_extra' || normalizado === 'datos_extras';
  }

  private combinarContextosComplementarios(contextos: Record<string, unknown>[]): Record<string, unknown> {
    const salida: Record<string, Record<string, unknown>> = {};

    for (const contexto of contextos) {
      for (const [grupo, valores] of Object.entries(contexto)) {
        if (!valores || typeof valores !== 'object' || Array.isArray(valores)) continue;
        salida[grupo] = {
          ...(salida[grupo] ?? {}),
          ...(valores as Record<string, unknown>),
        };
      }
    }

    return Object.fromEntries(
      Object.entries(salida).filter(([, valores]) => Object.keys(valores).length),
    );
  }

  private claveCampoEmbebido(valor: unknown, permitirClavesSimples = false): string | null {
    const texto = String(valor ?? '').trim();
    if (!texto) return null;
    const clave = this.claveTecnica(texto.split('|')[0]);
    if (!permitirClavesSimples && !texto.includes('|') && !/[a-z0-9]+_[a-z0-9_]+/.test(texto)) return null;
    return clave || null;
  }

  private valorComplementario(clave: string, valor: unknown): unknown {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (!texto) return null;

      if (clave === 'modalidad_sac') {
        const normalizado = this.normalizador.normalizarTexto(texto);
        if (normalizado.includes('prorrateado') || normalizado.includes('devengado')) return 'devengado';
        if (normalizado.includes('pago unico') || normalizado.includes('percibido')) return 'percibido';
        return texto.toLowerCase();
      }

      if (clave === 'modo_saldo_favor') {
        return normalizarModoSaldoFavor(texto);
      }

      if (this.esCampoZonaGeografica(clave)) {
        return normalizarZonaGeografica(texto);
      }

      if (this.esCampoBooleano(clave)) {
        const b = this.booleano(texto);
        return b === null ? texto : b;
      }

      if (this.esCampoNumeroComplementario(clave)) {
        return this.numeroComplementario(texto);
      }

      return texto;
    }

    if (this.esCampoNumeroComplementario(clave) && typeof valor === 'number') {
      return valor;
    }

    if (this.esCampoFecha(clave) && typeof valor === 'number') {
      const fecha = XLSX.SSF.parse_date_code(valor);
      if (fecha) {
        return `${fecha.y}-${String(fecha.m).padStart(2, '0')}-${String(fecha.d).padStart(2, '0')}`;
      }
    }

    return valor;
  }

  private esCampoFecha(clave: string): boolean {
    return ['fecha_ingreso', 'fecha_egreso'].includes(clave);
  }

  private esCampoZonaGeografica(clave: string): boolean {
    return ['zona_geografica', 'zona_geografica_default'].includes(clave);
  }

  private esCampoBooleano(clave: string): boolean {
    return [
      'cargas_familia_conyuge',
      'tiene_otros_empleadores',
      'agente_retencion_unico',
      'siradig_disponible',
      'historial_retenciones_disponible',
      'ajuste_final_disponible',
      'siradig_definitivo',
      'egreso_en_periodo',
      'normativa_oficial_validada',
    ].includes(clave);
  }

  private esCampoNumeroComplementario(clave: string): boolean {
    return [
      'cargas_familia_cant_hijos',
      'cargas_familia_otras',
      'cargas_familia_hijos_evento_cantidad',
      'cargas_familia_hijos_equivalentes',
      ...MESES.map(mes => `cargas_familia_hijos_equivalentes_${mes}`),
    ].includes(clave);
  }

  private numeroComplementario(valor: string): number | string {
    try {
      return this.normalizador.convertirNumero(valor).toNumber();
    } catch {
      return valor;
    }
  }

  private tieneValorComplementario(valor: unknown): boolean {
    return valor !== null && valor !== undefined && String(valor).trim() !== '';
  }

  private texto(valor: unknown): string | null {
    return this.tieneValorComplementario(valor) ? String(valor).trim() : null;
  }

  private claveTecnica(valor: unknown): string {
    return String(valor ?? '')
      .trim()
      .toLocaleLowerCase('es')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_.]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private booleano(valor: unknown): boolean | null {
    if (valor === null || valor === undefined || valor === '') return null;
    if (typeof valor === 'boolean') return valor;
    const texto = this.normalizador.normalizarTexto(valor);
    if (['true', 'si', 's', '1'].includes(texto)) return true;
    if (['false', 'no', 'n', '0'].includes(texto)) return false;
    return null;
  }

  private extraerPapelTrabajo(
    hojas: { nombre: string; filas: unknown[][] }[],
    principal: { nombre: string; filas: unknown[][] },
  ): Record<string, ReturnType<typeof D>> {
    const papel: Record<string, ReturnType<typeof D>> = {};

    const hojasEstructuradas = hojas.filter(hoja => {
      const nombre = this.normalizador.normalizarTexto(hoja.nombre);

      return (
        (nombre.includes('papel') && nombre.includes('trabajo')) ||
        nombre.includes('log calculo') ||
        nombre.includes('logcalculo')
      );
    });

    for (const hoja of hojasEstructuradas) {
      Object.assign(papel, this.extraerCamposPapel(hoja.filas));
    }

    if (!Object.keys(papel).length && principal.filas.length) {
      // En los Excel legacy reales puede haber tablas laterales de prueba o
      // papeles manuales agregados por la contadora. Segun el spec, esos datos
      // solo son contrato maquina cuando vienen en una hoja formal
      // PapelTrabajo/Log_Calculo. No se usan como insumo ni como comparacion.
      return {};
    }

    return papel;
  }

  private extraerCamposPapel(
    filas: unknown[][],
    clavesPermitidas?: Set<string>,
  ): Record<string, ReturnType<typeof D>> {
    const papel: Record<string, ReturnType<typeof D>> = {};

    for (let r = 0; r < filas.length; r++) {
      const fila = filas[r] ?? [];

      for (let c = 0; c < fila.length; c++) {
        const clave = this.clavePapelTrabajo(fila[c]);

        if (!clave || (clavesPermitidas && !clavesPermitidas.has(clave))) continue;

        const valor = this.valorAsociado(filas, r, c);

        if (valor !== null) {
          papel[clave] = valor;
        }
      }
    }

    return papel;
  }

  private clavePapelTrabajo(valor: unknown): string | null {
    const texto = this.normalizador.normalizarTexto(valor);

    if (!texto) return null;

    for (const [clave, aliases] of Object.entries(PAPEL_TRABAJO_ALIASES)) {
      for (const alias of aliases) {
        const normalizado = this.normalizador.normalizarTexto(alias);

        if (texto === normalizado || texto.includes(normalizado)) {
          return clave;
        }
      }
    }

    return null;
  }

  private valorAsociado(filas: unknown[][], r: number, c: number): ReturnType<typeof D> | null {
    const mismaCelda = filas[r]?.[c];

    if (
      typeof mismaCelda === 'string' &&
      /[:=]/.test(mismaCelda) &&
      this.esCeldaNumerica(mismaCelda)
    ) {
      try {
        return this.normalizador.convertirNumero(mismaCelda);
      } catch {
        // continua con celdas cercanas
      }
    }

    const fila = filas[r] ?? [];

    for (let offset = 1; offset <= 8; offset++) {
      const candidato = fila[c + offset];

      if (!this.esCeldaNumerica(candidato)) continue;

      try {
        return this.normalizador.convertirNumero(candidato);
      } catch {
        // prueba siguiente celda
      }
    }

    for (let offset = 1; offset <= 3; offset++) {
      const candidato = filas[r + offset]?.[c];

      if (!this.esCeldaNumerica(candidato)) continue;

      try {
        return this.normalizador.convertirNumero(candidato);
      } catch {
        // prueba siguiente celda
      }
    }

    return null;
  }

  private esCeldaNumerica(valor: unknown): boolean {
    if (valor === null || valor === undefined || valor === '') return false;
    if (typeof valor === 'number' || typeof valor === 'bigint') return true;
    if (typeof valor !== 'string') return false;

    const texto = valor.trim();

    if (!texto || !/[0-9]/.test(texto)) return false;

    const limpio = texto.replace(/\u00a0|\s/g, '').replace(/[^0-9,.+\-()]/g, '');

    return /[0-9]/.test(limpio);
  }

  private detectarHoja(hojas: { nombre: string; filas: unknown[][] }[]) {
    let mejor: (typeof hojas)[number] | undefined;
    let p = -1;

    for (const h of hojas) {
      let q = 0;

      for (const f of h.filas.slice(0, 30)) {
        for (const v of f.slice(0, 25)) {
          const t = this.normalizador.normalizarTexto(v);

          if ((MESES as readonly string[]).includes(t)) q += 2;
          if (t === 'acumulador' || t === 'acomulador') q += 8;
          if (this.normalizador.normalizarClave(v)) q++;
        }
      }

      if (q > p) {
        mejor = h;
        p = q;
      }
    }

    if (!mejor || p < 10) {
      throw new BadRequestException('No se encontro una hoja principal compatible');
    }

    return mejor;
  }

  private detectarColumnas(filas: unknown[][]) {
    for (let f = 0; f < Math.min(filas.length, 30); f++) {
      const e: Record<string, number> = {};

      (filas[f] ?? []).slice(0, 40).forEach((v, c) => {
        if (v != null) e[this.normalizador.normalizarTexto(v)] = c;
      });

      const concepto = e.acumulador ?? e.acomulador;
      const meses = MESES.filter(m => e[m] !== undefined);

      if (concepto !== undefined && meses.length >= 6) {
        const columnas: Record<string, number> = { concepto };

        meses.forEach(m => (columnas[m] = e[m]));

        if (e.tipo !== undefined) columnas.tipo = e.tipo;

        const total = Object.entries(e).find(
          ([k]) => k.includes('total') && !(MESES as readonly string[]).includes(k),
        );

        if (total) columnas.total = total[1];

        return { filaEncabezado: f, columnas };
      }
    }

    throw new BadRequestException('No se detectaron los encabezados de meses');
  }

  private metadata(nombre: string, hoja: string, titulo: unknown) {
    const stem = path.basename(nombre, path.extname(nombre));
    const m =
      /(?:(?:review|auditoria)_)?(.+?)_legajo_?(\d+)_m?(0[1-9]|1[0-2])[-_]?(\d{4})(?:_|$)/i.exec(
        stem,
      );
    const periodoLibre = /(0[1-9]|1[0-2])[-_\s]?((?:20)?\d{2})(?!\d)/.exec(stem);
    const legajoLibre = /legajo(?:\s*nro\.?|\s*num(?:ero)?\.?|\s*n\.?|_)?\s*_?(\d+)/i.exec(
      `${stem} ${hoja}`,
    );
    const clienteTitulo = titulo
      ? String(titulo).split(/\s*-\s*legajos/i)[0].trim()
      : null;
    const clienteLibre = this.clienteDesdeNombreLibre(stem);

    return {
      archivo: nombre,
      hoja,
      cliente: m ? m[1].replace(/_/g, ' ').trim() : clienteLibre ?? clienteTitulo,
      legajo: m ? m[2] : legajoLibre ? legajoLibre[1] : null,
      periodo_fiscal: m
        ? Number(m[4])
        : periodoLibre
          ? this.normalizarAnio(periodoLibre[2])
          : null,
      mes_liquidacion: m ? Number(m[3]) : periodoLibre ? Number(periodoLibre[1]) : null,
    };
  }

  private normalizarAnio(valor: string): number {
    return valor.length === 2 ? Number(`20${valor}`) : Number(valor);
  }

  private clienteDesdeNombreLibre(stem: string): string | null {
    const limpio = stem
      .replace(/^(review|auditoria|proyeccion)[_\s-]*/i, '')
      .replace(/[_\s-]*legajo[_\s-]*\d+.*$/i, '')
      .replace(/[_\s-]*control[_\s-]*ganancias.*$/i, '')
      .replace(/[_\s-]*ganancias?.*$/i, '')
      .replace(/[_\s-]*(0[1-9]|1[0-2])[-_\s]?(?:20)?\d{2}.*$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim();

    return limpio || null;
  }
}
