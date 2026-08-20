import { ExplicacionesIaService } from './explicaciones-ia.service';

describe('ExplicacionesIaService', () => {
  const apiKeyOriginal = process.env.GEMINI_API_KEY;
  const modeloOriginal = process.env.GEMINI_MODEL;
  const modelosOriginal = process.env.GEMINI_MODELOS;
  const reintentosOriginal = process.env.GEMINI_REINTENTOS;
  const reintentoBaseOriginal = process.env.GEMINI_REINTENTO_BASE_MS;
  const fetchOriginal = global.fetch;

  afterEach(() => {
    process.env.GEMINI_API_KEY = apiKeyOriginal;
    process.env.GEMINI_MODEL = modeloOriginal;
    process.env.GEMINI_MODELOS = modelosOriginal;
    process.env.GEMINI_REINTENTOS = reintentosOriginal;
    process.env.GEMINI_REINTENTO_BASE_MS = reintentoBaseOriginal;
    global.fetch = fetchOriginal;
  });

  it('devuelve explicacion local accionable cuando Gemini no esta configurado', async () => {
    delete process.env.GEMINI_API_KEY;
    const service = new ExplicacionesIaService();
    const respuesta = await service.explicar({
      metadata: { cliente: 'Prueba', legajo: '11', periodo_fiscal: 2026, mes_liquidacion: 6 },
      estado: 'analisis_completado',
      veredicto: 'CON_ADVERTENCIAS',
      validaciones: [{
        codigo: 'V6_12VA_PARTE_ART30',
        estado: 'ADVERTENCIA',
        detalle: 'La 12va parte Art. 30 no coincide con la formula del spec.',
        meses_con_diferencias: [{
          mes: 'enero',
          esperado: 52768.51,
          informado: 207503.15,
          diferencia: 154734.64,
          formula_detallada: '12va parte = base Art. 30 / 12',
          formula_operacion: 'division_12',
          formula_valores: {
            base_art30: 633222.17,
          },
          total_base_esperada: 633222.17,
          total_base_probable: 2490037.88,
          valor_probable: 207503.16,
          explicacion_aritmetica: 'El valor esperado sale de dividir la base informada del mes (633222.17) por 12: 52768.51. El valor informado por el Excel (207503.15) coincide con otra base probable (2490037.88) dividida por 12: 207503.16.',
          causa_probable: 'La 12va informada parece usar deduccion_especial aunque el mes informa 0.',
          campos_a_revisar: ['deduccion_especial', 'hijos', 'doceava_parte_art30'],
        }],
      }],
    });

    expect(respuesta.estado).toBe('fallback_local');
    expect(respuesta.proveedor).toBe('local');
    expect(respuesta.hallazgos[0].donde_revisar).toContain('Hoja Acumuladores');
    expect(respuesta.hallazgos[0].campos).toContain('deduccion_especial');
    expect(respuesta.hallazgos[0].comparaciones[0]).toEqual(expect.objectContaining({
      concepto: '12va parte Art. 30',
      mes: 'enero',
      esperado: 52768.51,
      informado: 207503.15,
      total_base_esperada: 633222.17,
      total_base_probable: 2490037.88,
      valor_probable: 207503.16,
      formula_detallada: '12va parte = base Art. 30 / 12',
      formula_operacion: 'division_12',
      formula_valores: expect.objectContaining({ base_art30: 633222.17 }),
    }));
    expect(respuesta.pasos.join(' ')).toContain('V6_12VA_PARTE_ART30');
    expect(respuesta.pasos.join(' ')).toContain('Comparacion');
    expect(respuesta.hallazgos[0].comparaciones[0].por_que_revisar).toContain('base informada del mes');
  });

  it('traduce abort de Gemini a mensaje de timeout accionable', () => {
    const service = new ExplicacionesIaService() as any;
    const mensaje = service.mensajeError(new Error('This operation was aborted'));

    expect(mensaje).toContain('tiempo agotado');
    expect(mensaje).toContain('GEMINI_TIMEOUT_MS');
  });

  it('reconstruye bases explicativas V6 cuando el snapshot viejo no las trae', async () => {
    delete process.env.GEMINI_API_KEY;
    const service = new ExplicacionesIaService();
    const respuesta = await service.explicar({
      metadata: { cliente: 'Prueba', legajo: '11', periodo_fiscal: 2026, mes_liquidacion: 6 },
      validaciones: [{
        codigo: 'V6_12VA_PARTE_ART30',
        estado: 'ADVERTENCIA',
        detalle: 'La 12va parte Art. 30 no coincide con la formula del spec.',
        meses_con_diferencias: [{
          mes: 'enero',
          esperado: 52768.51,
          informado: 207503.15,
          diferencia: 154734.64,
          causa_probable: 'La 12va informada parece usar otra base.',
          campos_a_revisar: ['deduccion_especial', 'doceava_parte_art30'],
        }],
      }],
    });

    const comparacion = respuesta.hallazgos[0].comparaciones[0];
    expect(comparacion.total_base_esperada).toBeCloseTo(633222.12, 2);
    expect(comparacion.total_base_probable).toBeCloseTo(2490037.8, 2);
    expect(comparacion.valor_probable).toBe(207503.15);
  });

  it('reintenta cuando Gemini devuelve HTTP 503 y usa la respuesta exitosa posterior', async () => {
    process.env.GEMINI_API_KEY = 'clave-test';
    process.env.GEMINI_MODELOS = 'gemini-test';
    process.env.GEMINI_REINTENTOS = '2';
    process.env.GEMINI_REINTENTO_BASE_MS = '1';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  resumen: 'Revisar datos Art. 30.',
                  pasos: ['Abrir Acumuladores y revisar deduccion_especial.'],
                  hallazgos: [],
                }),
              }],
            },
          }],
        }),
      }) as any;

    const service = new ExplicacionesIaService();
    const respuesta = await service.explicar({
      metadata: { cliente: 'Prueba', legajo: '11', periodo_fiscal: 2026, mes_liquidacion: 6 },
      estado: 'analisis_completado',
      veredicto: 'CON_ADVERTENCIAS',
      validaciones: [{
        codigo: 'V6_12VA_PARTE_ART30',
        estado: 'ADVERTENCIA',
        detalle: 'La 12va parte Art. 30 no coincide con la formula del spec.',
      }],
    });

    expect(respuesta.estado).toBe('generada');
    expect(respuesta.proveedor).toBe('gemini');
    expect(respuesta.modelo).toBe('gemini-test');
    expect(respuesta.resumen).toContain('Art. 30');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('cambia de modelo cuando el primero devuelve HTTP 503', async () => {
    process.env.GEMINI_API_KEY = 'clave-test';
    process.env.GEMINI_MODELOS = 'modelo-saturado,modelo-respaldo';
    process.env.GEMINI_REINTENTOS = '1';
    process.env.GEMINI_REINTENTO_BASE_MS = '1';
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  resumen: 'Modelo de respaldo disponible.',
                  pasos: ['Usar la explicacion generada.'],
                  hallazgos: [],
                }),
              }],
            },
          }],
        }),
      }) as any;

    const service = new ExplicacionesIaService();
    const respuesta = await service.explicar({
      metadata: { cliente: 'Prueba', legajo: '11', periodo_fiscal: 2026, mes_liquidacion: 6 },
      validaciones: [{ codigo: 'V10_RETENCION', estado: 'NO_EVALUADA', detalle: 'Falta modo_saldo_favor.' }],
    });

    expect(respuesta.estado).toBe('generada');
    expect(respuesta.modelo).toBe('modelo-respaldo');
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain('modelo-saturado');
    expect(String((global.fetch as jest.Mock).mock.calls[1][0])).toContain('modelo-respaldo');
  });

  it('traduce HTTP 503 persistente a mensaje de disponibilidad temporal', () => {
    const service = new ExplicacionesIaService() as any;
    const mensaje = service.mensajeError(new Error('Gemini respondio HTTP 503'));

    expect(mensaje).toContain('no esta disponible temporalmente');
    expect(mensaje).toContain('guia local');
  });
});
