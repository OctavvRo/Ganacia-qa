import { Injectable } from '@nestjs/common';

type HallazgoAccionable = {
  codigo: string;
  estado: string;
  titulo: string;
  detalle_tecnico: string;
  donde_revisar: string[];
  meses: string[];
  campos: string[];
  accion_recomendada: string;
  comparaciones: ComparacionHallazgo[];
};

type ExplicacionIa = {
  estado: 'generada' | 'fallback_local' | 'sin_hallazgos';
  proveedor: 'gemini' | 'local';
  modelo: string | null;
  resumen: string;
  diagnostico_humano?: string;
  pasos: string[];
  preguntas_sugeridas?: string[];
  mensaje_para_responsable?: string;
  limites?: string[];
  hallazgos: HallazgoAccionable[];
  advertencias: string[];
};

type ComparacionHallazgo = {
  concepto: string;
  mes?: string;
  esperado?: number | null;
  informado?: number | null;
  diferencia?: number | null;
  total_base_esperada?: number | null;
  total_base_probable?: number | null;
  valor_probable?: number | null;
  componentes?: Record<string, number> | null;
  componentes_formula_probable?: Record<string, number> | null;
  formula_spec?: string | null;
  formula_detallada?: string | null;
  formula_operacion?: string | null;
  formula_valores?: Record<string, number | string> | null;
  formula_probable?: string | null;
  causa_probable?: string | null;
  por_que_revisar: string;
  campos_a_revisar: string[];
};

@Injectable()
export class ExplicacionesIaService {
  private readonly modelos = this.modelosConfigurados();
  private readonly endpointBase = process.env.GEMINI_ENDPOINT ?? 'https://generativelanguage.googleapis.com/v1beta';
  private readonly timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS ?? 45000);
  private readonly reintentos = Math.max(1, Number(process.env.GEMINI_REINTENTOS ?? 3));
  private readonly reintentoBaseMs = Number(process.env.GEMINI_REINTENTO_BASE_MS ?? 1200);

  /**
   * Genera una explicacion accionable para el usuario.
   * Gemini no calcula impuestos ni modifica veredictos: solo redacta sobre los hallazgos del motor deterministico.
   */
  async explicar(analisis: any): Promise<ExplicacionIa> {
    const hallazgos = this.hallazgosAccionables(analisis);
    const local = this.explicacionLocal(analisis, hallazgos);

    if (!hallazgos.length) {
      return {
        ...local,
        estado: 'sin_hallazgos',
        resumen: 'No hay errores o advertencias accionables para explicar en este analisis.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        ...local,
        estado: 'fallback_local',
        advertencias: [
          ...local.advertencias,
          'Gemini no esta configurado. Se muestra una explicacion local generada por el backend.',
        ],
      };
    }

    try {
      const respuesta = await this.llamarGemini(apiKey, analisis, hallazgos);
      return {
        ...local,
        ...respuesta,
        estado: 'generada',
        proveedor: 'gemini',
        modelo: respuesta.modelo,
        hallazgos,
        advertencias: local.advertencias,
      };
    } catch (error) {
      return {
        ...local,
        estado: 'fallback_local',
        advertencias: [
          ...local.advertencias,
          `No se pudo generar la explicacion con Gemini; se muestra fallback local. Motivo: ${this.mensajeError(error)}`,
        ],
      };
    }
  }

  private hallazgosAccionables(analisis: any): HallazgoAccionable[] {
    const validaciones = Array.isArray(analisis?.validaciones) ? analisis.validaciones : [];
    return validaciones
      .filter((v: any) => {
        const estado = String(v?.estado ?? '').toUpperCase();
        return estado !== 'OK' && estado !== 'INFORMATIVA';
      })
      .slice(0, 12)
      .map((v: any) => this.normalizarHallazgo(v));
  }

  private normalizarHallazgo(v: any): HallazgoAccionable {
    const codigo = String(v?.codigo ?? 'VALIDACION');
    const mesesConDiferencias = Array.isArray(v?.meses_con_diferencias) ? v.meses_con_diferencias : [];
    const meses = [
      ...new Set([
        ...mesesConDiferencias.map((m: any) => String(m?.mes ?? '').trim()).filter(Boolean),
        ...(Array.isArray(v?.meses) ? v.meses.map((m: any) => String(m)) : []),
      ]),
    ];
    const comparaciones = this.comparaciones(v, mesesConDiferencias);
    const campos = [
      ...new Set([
        ...(Array.isArray(v?.datos_faltantes) ? v.datos_faltantes.map((x: any) => String(x)) : []),
        ...mesesConDiferencias.flatMap((m: any) =>
          Array.isArray(m?.campos_a_revisar) ? m.campos_a_revisar.map((x: any) => String(x)) : [],
        ),
        ...comparaciones.flatMap((c) => c.campos_a_revisar),
      ]),
    ];

    return {
      codigo,
      estado: String(v?.estado ?? 'PENDIENTE'),
      titulo: this.titulo(codigo),
      detalle_tecnico: String(v?.detalle ?? ''),
      donde_revisar: this.dondeRevisar(codigo, campos),
      meses,
      campos,
      accion_recomendada: this.accionRecomendada(v, campos),
      comparaciones,
    };
  }

  private explicacionLocal(analisis: any, hallazgos: HallazgoAccionable[]): ExplicacionIa {
    const cliente = analisis?.metadata?.cliente ?? 'cliente no informado';
    const legajo = analisis?.metadata?.legajo ?? 'legajo no informado';
    const periodo = `${String(analisis?.metadata?.mes_liquidacion ?? '').padStart(2, '0')}/${analisis?.metadata?.periodo_fiscal ?? ''}`;
    const pasos = hallazgos.flatMap((h) => {
      const pasosHallazgo = [
        `${h.codigo}: revisar ${h.donde_revisar.join(', ') || 'los datos de entrada del reporte'}.`,
        h.campos.length ? `Campos a revisar: ${h.campos.join(', ')}.` : h.accion_recomendada,
      ];

      const comparacion = h.comparaciones[0];
      if (comparacion) {
        const mes = comparacion.mes ? ` en ${comparacion.mes}` : '';
        pasosHallazgo.push(
          `Comparacion${mes}: esperado ${this.valorComparacion(comparacion.esperado)}, informado ${this.valorComparacion(comparacion.informado)}, diferencia ${this.valorComparacion(comparacion.diferencia)}. ${comparacion.por_que_revisar}`,
        );
      }

      return pasosHallazgo;
    });

    return {
      estado: 'fallback_local',
      proveedor: 'local',
      modelo: null,
      resumen: hallazgos.length
        ? `Se detectaron ${hallazgos.length} hallazgo(s) accionable(s) para ${cliente}, legajo ${legajo}, periodo ${periodo}.`
        : `El analisis de ${cliente}, legajo ${legajo}, periodo ${periodo}, no tiene hallazgos accionables.`,
      diagnostico_humano: hallazgos.length
        ? 'El backend muestra la cuenta exacta y los valores comparados. La guia local indica que campos revisar, pero no reemplaza el criterio profesional del contador.'
        : 'No se detectaron hallazgos que requieran una explicacion accionable.',
      pasos,
      preguntas_sugeridas: [],
      mensaje_para_responsable: '',
      limites: [],
      hallazgos,
      advertencias: [],
    };
  }

  private async llamarGemini(apiKey: string, analisis: any, hallazgos: HallazgoAccionable[]) {
    const contexto = {
      metadata: {
        cliente: analisis?.metadata?.cliente,
        legajo: analisis?.metadata?.legajo,
        periodo_fiscal: analisis?.metadata?.periodo_fiscal,
        mes_liquidacion: analisis?.metadata?.mes_liquidacion,
      },
      veredicto: analisis?.veredicto,
      nota_veredicto: 'El veredicto global es una sintesis del motor; no lo uses para agravar una validacion individual. Explica cada hallazgo segun su estado, detalle y comparaciones.',
      nota_tablas: 'El frontend ya muestra una tabla deterministica con esperado, informado, diferencia, formula_operacion y formula_valores. No repitas esa tabla en prosa salvo que sea imprescindible; usala como evidencia para explicar causa probable, pasos de correccion y preguntas al responsable.',
      estado: analisis?.estado,
      hallazgos,
    };

    const cuerpo = JSON.stringify({
      systemInstruction: {
        parts: [{
          text: [
            'Sos un asistente de auditoria de Impuesto a las Ganancias de 4ta categoria.',
            'No calcules impuestos, no inventes normativa y no cambies el veredicto.',
            'Usa solo los hallazgos recibidos del motor deterministico.',
            'Tu tarea NO es repetir la tabla del backend. La UI ya muestra esperado, informado, diferencia, formula y valores.',
            'Tu tarea es interpretar esos datos para un usuario contador: por que probablemente pasa, donde revisar y que accion concreta tomar.',
            'Si hay formula_valores, no copies todos los numeros; menciona solo los que aclaran la causa y remiti al detalle tecnico del motor.',
            'Inclui preguntas utiles para enviar al responsable si el dato podria ser de proyeccion, ajuste manual o configuracion del cliente.',
            'No digas que hay que corregir una formula si el motor solo indica inconsistencia de datos; deci revisar el dato de origen y corregir si corresponde.',
            'No inventes hojas, filas, celdas ni causas que no esten en el JSON recibido.',
            'Devuelve JSON valido con estas claves: resumen, diagnostico_humano, pasos, preguntas_sugeridas, mensaje_para_responsable, limites.',
          ].join(' '),
        }],
      },
      contents: [{
        role: 'user',
        parts: [{
          text: JSON.stringify(contexto),
        }],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    let ultimoError: unknown;
    for (const modelo of this.modelos) {
      for (let intento = 1; intento <= this.reintentos; intento += 1) {
        try {
          const respuesta = await this.enviarSolicitudGemini(apiKey, cuerpo, modelo);
          if (!respuesta.ok) {
            const error = new Error(`Gemini respondio HTTP ${respuesta.status} con ${modelo}`);
            ultimoError = error;
            if (this.esHttpReintentable(respuesta.status) && intento < this.reintentos) {
              await this.esperarReintento(intento);
              continue;
            }
            if (this.esHttpReintentable(respuesta.status) && this.hayOtroModelo(modelo)) {
              break;
            }
            throw error;
          }

          const data = await respuesta.json() as any;
          const texto = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('') ?? '';
          const json = this.parsearJson(texto);
          return {
            modelo,
            resumen: String(json?.resumen ?? 'Gemini genero una explicacion sin resumen.'),
            diagnostico_humano: String(json?.diagnostico_humano ?? ''),
            pasos: Array.isArray(json?.pasos) ? json.pasos.map((p: any) => String(p)) : [],
            preguntas_sugeridas: Array.isArray(json?.preguntas_sugeridas) ? json.preguntas_sugeridas.map((p: any) => String(p)) : [],
            mensaje_para_responsable: json?.mensaje_para_responsable ? String(json.mensaje_para_responsable) : '',
            limites: Array.isArray(json?.limites) ? json.limites.map((p: any) => String(p)) : [],
            hallazgos,
          };
        } catch (error) {
          ultimoError = error;
          if (this.esErrorReintentable(error) && intento < this.reintentos) {
            await this.esperarReintento(intento);
            continue;
          }
          if (this.esErrorReintentable(error) && this.hayOtroModelo(modelo)) {
            break;
          }
          throw error;
        }
      }
    }

    throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
  }

  private async enviarSolicitudGemini(apiKey: string, cuerpo: string, modelo: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(`${this.endpointBase}/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: cuerpo,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private esHttpReintentable(status: number): boolean {
    return status === 429 || status === 503 || status === 502 || status === 504 || status >= 500;
  }

  private esErrorReintentable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const mensaje = error.message.toLowerCase();
    return mensaje.includes('fetch failed') || mensaje.includes('econnreset') || mensaje.includes('etimedout');
  }

  private esperarReintento(intento: number): Promise<void> {
    const ms = this.reintentoBaseMs * intento;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private modelosConfigurados(): string[] {
    const principal = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash';
    const texto = process.env.GEMINI_MODELOS ?? [
      principal,
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
    ].join(',');
    return [...new Set(texto.split(',').map((m) => m.trim()).filter(Boolean))];
  }

  private hayOtroModelo(modelo: string): boolean {
    return this.modelos.indexOf(modelo) < this.modelos.length - 1;
  }

  private parsearJson(texto: string): any {
    const limpio = texto
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(limpio);
  }

  private titulo(codigo: string): string {
    if (codigo.startsWith('V6')) return '12va parte Art. 30 inconsistente';
    if (codigo.startsWith('V8')) return 'Modalidad SAC';
    if (codigo.startsWith('V10')) return 'Retencion calculada / saldo a favor';
    if (codigo.startsWith('V11')) return 'Tope LCT 35%';
    if (codigo.startsWith('V17')) return 'Actualizacion semestral Art. 30';
    return codigo;
  }

  private dondeRevisar(codigo: string, campos: string[]): string[] {
    if (codigo.startsWith('V6')) return ['Hoja Acumuladores', ...campos];
    if (codigo.startsWith('V10')) return ['Datos complementarios', 'Config_Cliente.modo_saldo_favor', ...campos];
    if (codigo.startsWith('V11')) return ['Novedades_Mes.bruto_mensual', 'Hoja Acumuladores.remuneraciones_con_aporte', ...campos];
    return campos.length ? campos : ['Datos de entrada del Excel'];
  }

  private accionRecomendada(v: any, campos: string[]): string {
    if (v?.accion_recomendada) return String(v.accion_recomendada);
    const codigo = String(v?.codigo ?? '');
    if (codigo.startsWith('V6')) {
      return 'Revisar deduccion_especial, hijos y doceava_parte_art30 en los meses indicados. El motor no marca error del sistema: marca inconsistencia de datos del Excel.';
    }
    if (codigo.startsWith('V10')) {
      return 'Completar modo_saldo_favor del cliente para saber si corresponde compensar o devolver una retencion negativa.';
    }
    if (campos.length) return `Completar o revisar: ${campos.join(', ')}.`;
    return 'Revisar el detalle tecnico del hallazgo y los datos de entrada asociados.';
  }

  private comparaciones(v: any, mesesConDiferencias: any[]): ComparacionHallazgo[] {
    const directas = Array.isArray(v?.comparaciones)
      ? v.comparaciones.map((c: any) => this.normalizarComparacion(c)).filter(Boolean) as ComparacionHallazgo[]
      : [];

    const desdeMeses = mesesConDiferencias
      .filter((m: any) => m && (m.esperado !== undefined || m.informado !== undefined || m.diferencia !== undefined))
      .map((m: any) => this.normalizarComparacion({
        concepto: '12va parte Art. 30',
        mes: m.mes,
        esperado: m.esperado,
        informado: m.informado,
        diferencia: m.diferencia,
        formula_spec: '(ganancia_no_imponible + conyuge + hijos + otras_cargas + deduccion_especial) / 12',
        formula_detallada: m.formula_detallada,
        formula_operacion: m.formula_operacion,
        formula_valores: m.formula_valores,
        formula_probable: m.formula_probable,
        total_base_esperada: m.total_base_esperada,
        total_base_probable: m.total_base_probable,
        valor_probable: m.valor_probable,
        componentes: m.componentes,
        componentes_formula_probable: m.componentes_formula_probable,
        causa_probable: m.causa_probable,
        campos_a_revisar: m.campos_a_revisar,
        por_que_revisar: m.explicacion_aritmetica ?? (m.causa_probable
          ? `La fila doceava_parte_art30 no coincide con la formula del spec. ${m.causa_probable}`
          : 'La fila doceava_parte_art30 no coincide con la formula del spec para este mes.'),
      }))
      .filter(Boolean) as ComparacionHallazgo[];

    return [...directas, ...desdeMeses].slice(0, 12);
  }

  private normalizarComparacion(c: any): ComparacionHallazgo | null {
    if (!c) return null;
    const campos = Array.isArray(c.campos_a_revisar)
      ? c.campos_a_revisar.map((x: any) => String(x)).filter(Boolean)
      : [];
    const concepto = String(c.concepto ?? c.campo ?? 'Dato auditado');
    const esperado = this.numeroOpcional(c.esperado);
    const informado = this.numeroOpcional(c.informado);
    const valorProbable = this.numeroOpcional(c.valor_probable) ?? informado;
    const esDoceavaArt30 = concepto.toLowerCase().includes('12va') || String(c.formula_spec ?? '').includes('/ 12');

    return {
      concepto,
      mes: c.mes ? String(c.mes) : undefined,
      esperado,
      informado,
      diferencia: this.numeroOpcional(c.diferencia),
      total_base_esperada: this.numeroOpcional(c.total_base_esperada) ?? (esDoceavaArt30 && esperado !== null ? esperado * 12 : null),
      total_base_probable: this.numeroOpcional(c.total_base_probable) ?? (esDoceavaArt30 && valorProbable !== null ? valorProbable * 12 : null),
      valor_probable: valorProbable,
      componentes: this.objetoNumerico(c.componentes),
      componentes_formula_probable: this.objetoNumerico(c.componentes_formula_probable),
      formula_spec: c.formula_spec ? String(c.formula_spec) : null,
      formula_detallada: c.formula_detallada ? String(c.formula_detallada) : null,
      formula_operacion: c.formula_operacion ? String(c.formula_operacion) : null,
      formula_valores: this.objetoFormula(c.formula_valores),
      formula_probable: c.formula_probable ? String(c.formula_probable) : null,
      causa_probable: c.causa_probable ? String(c.causa_probable) : null,
      por_que_revisar: String(c.por_que_revisar ?? c.detalle ?? c.causa_probable ?? 'El valor informado no coincide con el valor esperado por el spec.'),
      campos_a_revisar: campos,
    };
  }

  private numeroOpcional(valor: unknown): number | null {
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }

  private valorComparacion(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) return 'No disponible';
    return Number(valor).toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private objetoNumerico(valor: unknown): Record<string, number> | null {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
    const salida: Array<[string, number]> = [];
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      const numeroValor = this.numeroOpcional(v);
      if (numeroValor !== null) salida.push([clave, numeroValor]);
    }
    return salida.length ? Object.fromEntries(salida) : null;
  }

  private objetoFormula(valor: unknown): Record<string, number | string> | null {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
    const salida: Array<[string, number | string]> = [];
    for (const [clave, v] of Object.entries(valor as Record<string, unknown>)) {
      const numeroValor = this.numeroOpcional(v);
      salida.push([clave, numeroValor ?? String(v)]);
    }
    return salida.length ? Object.fromEntries(salida) : null;
  }

  private mensajeError(error: unknown): string {
    if (error instanceof Error) {
      const mensaje = error.message.toLowerCase();
      if (error.name === 'AbortError' || mensaje.includes('aborted')) {
        return `tiempo agotado esperando respuesta de Gemini (${this.timeoutMs} ms). Revisar conexion, firewall/proxy o aumentar GEMINI_TIMEOUT_MS.`;
      }
      if (mensaje.includes('http 503')) {
        return 'Gemini no esta disponible temporalmente (HTTP 503). El backend ya intento reintentar la solicitud y por seguridad muestra la guia local.';
      }
      if (mensaje.includes('http 429')) {
        return 'Gemini rechazo la solicitud por limite de cuota o demasiadas peticiones (HTTP 429). Revisar cuota o esperar unos minutos.';
      }
      if (mensaje.includes('http 500') || mensaje.includes('http 502') || mensaje.includes('http 504')) {
        return `Gemini devolvio un error temporal del servicio (${error.message}). Se muestra la guia local.`;
      }
      return error.message;
    }
    return String(error);
  }
}
