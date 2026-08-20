import { ParserReporteExtendidoService } from './parser-reporte-extendido.service';
import { NormalizadorService } from '../normalizacion/normalizador.service';

describe('ParserReporteExtendidoService', () => {
  let parser: ParserReporteExtendidoService;
  let normalizador: NormalizadorService;

  beforeEach(() => {
    normalizador = new NormalizadorService();
    parser = new ParserReporteExtendidoService(normalizador);
  });

  it('preserva claves tecnicas del spec en acumuladores con doble underscore', () => {
    const liquidacion = parser.parsear(
      [
        {
          nombre: 'Metadata',
          filas: [
            ['campo', 'valor'],
            ['cliente_nombre', 'Demo'],
            ['legajo_numero', '99'],
            ['periodo_fiscal', 2026],
            ['mes_liquidacion', 6],
          ],
        },
        {
          nombre: 'Acumuladores',
          filas: [
            ['tipo', 'acumulador', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'total'],
            ['ingresos', 'ingresos__rem_con_aporte', 1, 2, 3, 4, 5, 6, 21],
            ['ingresos', 'ingresos__sac', 0, 0, 0, 0, 0, 0, 0],
          ],
        },
      ],
      'demo.xlsx',
    );

    expect(liquidacion.acumuladores.remuneraciones_con_aporte).toBeDefined();
    expect(liquidacion.acumuladores.remuneraciones_con_aporte.etiqueta_original).toBe(
      'ingresos__rem_con_aporte',
    );
    expect(liquidacion.acumuladores.remuneraciones_con_aporte.total.toString()).toBe('21');
    expect(liquidacion.acumuladores.sac).toBeDefined();
  });

  it('lee PapelTrabajo usando campo tecnico snake_case sin humanizarlo', () => {
    const liquidacion = parser.parsear(
      [
        {
          nombre: 'Metadata',
          filas: [
            ['campo', 'valor'],
            ['cliente_nombre', 'Demo'],
            ['legajo_numero', '99'],
            ['periodo_fiscal', 2026],
            ['mes_liquidacion', 6],
          ],
        },
        {
          nombre: 'Acumuladores',
          filas: [
            ['tipo', 'acumulador', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'total'],
            ['ingresos', 'ingresos__rem_con_aporte', 1, 2, 3, 4, 5, 6, 21],
          ],
        },
        {
          nombre: 'PapelTrabajo',
          filas: [
            ['campo', 'valor'],
            ['deducciones_personales', 123],
            ['ganancia_neta_previa', 456],
            ['retencion_del_mes_calculada', 789],
          ],
        },
      ],
      'demo.xlsx',
    );

    expect(liquidacion.papel_trabajo_asis?.deducciones_personales?.toString()).toBe('123');
    expect(liquidacion.papel_trabajo_asis?.ganancia_neta_previa?.toString()).toBe('456');
    expect(liquidacion.papel_trabajo_asis?.retencion_del_mes_calculada?.toString()).toBe('789');
  });

  it('devuelve Log_Calculo con columnas canonicas del spec', () => {
    const liquidacion = parser.parsear(
      [
        {
          nombre: 'Metadata',
          filas: [
            ['campo', 'valor'],
            ['cliente_nombre', 'Demo'],
            ['legajo_numero', '99'],
            ['periodo_fiscal', 2026],
            ['mes_liquidacion', 6],
          ],
        },
        {
          nombre: 'Acumuladores',
          filas: [
            ['tipo', 'acumulador', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'total'],
            ['ingresos', 'ingresos__rem_con_aporte', 1, 2, 3, 4, 5, 6, 21],
          ],
        },
        {
          nombre: 'Log_Calculo',
          filas: [
            [
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
            ],
            [
              1,
              'Composicion del Total de Ingresos',
              'Art. 82 LIG',
              'TI = rem',
              'Detalle',
              '[{"nombre":"rem","valor":21,"origen":"acumulador:ingresos__rem_con_aporte.total"}]',
              '21',
              21,
              '[]',
              'OK',
            ],
          ],
        },
      ],
      'demo.xlsx',
    );

    const paso = liquidacion.log_calculo_asis?.[0] as Record<string, unknown>;
    expect(paso.paso_numero).toBe(1);
    expect(paso.paso_nombre).toBe('Composicion del Total de Ingresos');
    expect(paso.referencia_normativa).toBe('Art. 82 LIG');
    expect(paso.salida).toBe(21);
    expect(paso).not.toHaveProperty('paso');
    expect(paso).not.toHaveProperty('descripcion');
  });

  it('normaliza la variante corta del Log_Calculo del XLSX de referencia a columnas canonicas', () => {
    const liquidacion = parser.parsear(
      [
        {
          nombre: 'Metadata',
          filas: [
            ['campo', 'valor'],
            ['cliente_nombre', 'Demo'],
            ['legajo_numero', '99'],
            ['periodo_fiscal', 2026],
            ['mes_liquidacion', 6],
          ],
        },
        {
          nombre: 'Acumuladores',
          filas: [
            ['tipo', 'acumulador', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'total'],
            ['ingresos', 'ingresos__rem_con_aporte', 1, 2, 3, 4, 5, 6, 21],
          ],
        },
        {
          nombre: 'Log_Calculo',
          filas: [
            ['paso', 'nombre', 'entrada', 'formula', 'resultado', 'observacion'],
            [1, 'Ganancia Bruta', 'rem_con_aporte', 'Σ ingresos computables', 21, 'OK'],
          ],
        },
      ],
      'demo.xlsx',
    );

    const paso = liquidacion.log_calculo_asis?.[0] as Record<string, unknown>;
    expect(paso.paso_numero).toBe(1);
    expect(paso.paso_nombre).toBe('Ganancia Bruta');
    expect(paso.entradas).toBe('rem_con_aporte');
    expect(paso.salida).toBe(21);
    expect(paso.observaciones).toBe('OK');
  });

  it('reconoce todas las hojas del reporte extendido y preserva claves tecnicas', () => {
    const liquidacion = parser.parsear(
      [
        {
          nombre: 'Metadata',
          filas: [
            ['campo', 'valor'],
            ['cliente_nombre', 'Demo'],
            ['legajo_numero', '99'],
            ['periodo_fiscal', 2026],
            ['mes_liquidacion', 6],
          ],
        },
        {
          nombre: 'Acumuladores',
          filas: [
            ['tipo', 'acumulador', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'total'],
            ['ingresos', 'ingresos__rem_con_aporte', 1, 2, 3, 4, 5, 6, 21],
            ['deducciones', 'ganancia_neta_fila35', 1, 2, 3, 4, 5, 6, 21],
          ],
        },
        {
          nombre: 'PapelTrabajo',
          filas: [
            ['campo', 'valor'],
            ['ganancia_neta', 21],
          ],
        },
        {
          nombre: 'Config_Cliente',
          filas: [
            ['campo', 'valor'],
            ['modalidad_sac', 'devengado'],
            ['modo_saldo_favor', 'Trasladar a SIRADIG'],
            ['zona_geografica_default', 'Tierra del Fuego'],
          ],
        },
        {
          nombre: 'Legajo_Empleado',
          filas: [
            ['campo', 'valor'],
            ['zona_geografica', 'patagonia'],
          ],
        },
        {
          nombre: 'SIRADIG',
          filas: [
            ['periodo', 'rubro', 'importe_informado'],
            ['2026-06', 'alquileres', 1000],
          ],
        },
        {
          nombre: 'Contexto_Normativo',
          filas: [
            ['campo', 'valor'],
            ['escala_art94_version', 'ART94_2026_S1_SPEC2_REFERENCIA'],
          ],
        },
        {
          nombre: 'Log_Calculo',
          filas: [
            ['paso_numero', 'paso_nombre', 'salida'],
            [1, 'Ganancia Bruta', 21],
          ],
        },
        {
          nombre: 'Novedades_Mes',
          filas: [
            ['concepto_codigo', 'clasificacion_fiscal', 'importe'],
            ['HNH', 'gravado', 500],
          ],
        },
        {
          nombre: 'Historial_Retenciones',
          filas: [
            ['mes', 'retencion_informada', 'retencion_calculada'],
            ['junio', 100, 100],
          ],
        },
        {
          nombre: 'Ajuste_Final',
          filas: [
            ['campo', 'valor'],
            ['tipo_ajuste', 'no_aplica'],
          ],
        },
      ],
      'demo.xlsx',
    );

    expect(liquidacion.hojas_faltantes).toEqual([]);
    expect(liquidacion.legajo_empleado?.['zona_geografica']).toBe('patagonica');
    expect(liquidacion.config_cliente?.modalidad_sac).toBe('devengado');
    expect(liquidacion.config_cliente?.modo_saldo_favor).toBe('saldo_para_siradig');
    expect(liquidacion.config_cliente?.zona_geografica_default).toBe('tdf');
    expect((liquidacion.siradig?.[0] as Record<string, unknown>).importe_informado).toBe(1000);
    expect((liquidacion.novedades_mes?.[0] as Record<string, unknown>).clasificacion_fiscal).toBe('gravado');
    expect(liquidacion.ajuste_final?.['tipo_ajuste']).toBe('no_aplica');
  });
});
