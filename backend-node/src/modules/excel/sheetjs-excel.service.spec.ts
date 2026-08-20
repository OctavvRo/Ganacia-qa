import * as XLSX from 'xlsx';
import { NormalizadorService } from '../normalizacion/normalizador.service';
import { ParserReporteExtendidoService } from './parser-reporte-extendido.service';
import { SheetjsExcelService } from './sheetjs-excel.service';

describe('SheetjsExcelService', () => {
  function servicio() {
    const normalizador = new NormalizadorService();
    return new SheetjsExcelService(
      normalizador,
      new ParserReporteExtendidoService(normalizador),
    );
  }

  function libroLegacyConContextoEmbebido() {
    const meses = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
      'Total',
    ];
    const fila = (tipo: string, acumulador: string, valor = 0) => [
      tipo,
      acumulador,
      ...Array.from({ length: 12 }, () => valor),
      valor * 12,
    ];
    const hoja = XLSX.utils.aoa_to_sheet([
      ['PARODI - Legajos Liquidados Detalle'],
      ['Tipo', 'Acomulador', ...meses],
      fila('Deducciones Art. 30', 'GANANCIA NO IMPONIBLE', 429316.88),
      fila('Deducciones Art. 30', 'CONYUGE', 0),
      fila('Deducciones Art. 30', 'HIJOS', 0),
      fila('Deducciones Art. 30', 'OTRAS CARGAS', 0),
      fila('Deducciones Art. 30', 'DEDUCCION ESPECIAL', 2060721),
      fila('Deducciones Art. 30', 'DOCEAVA PARTE ART.30', 207503.16),
      fila('Ingresos', 'REMUNERACION CON APORTE', 1000000),
      fila('Ingresos', 'SAC', 0),
      fila('Resultado', 'GANANCIA NETA FILA35', 500000),
      fila('Retencion', 'RETENCION', 0),
      fila('Retencion', 'IMPUESTO CALCULADO', 0),
      fila('Retencion', 'PORCENTAJE', 0),
      [],
      [null, 'Parametros del Legajo Numero:', 53],
      [null, 'cliente_cuit', 20205889522],
      [null, 'modalidad_sac', 'Prorrateado'],
      [null, 'modo_saldo_favor', 'Compensar'],
      [null, 'zona_geografica_default', 'Mendoza'],
      [],
      [null, 'legajo_numero', 128],
      [null, 'fecha_ingreso', 36769],
      [null, 'zona_geografica', 'Mendoza'],
      [null, 'cargas_familia_conyuge', 'Si'],
      [null, 'cargas_familia_cant_hijos', 2],
      [null, 'tiene_otros_empleadores', 'No'],
      [null, 'GASTOS EDUCATIVOS', 'NOTA: 40% DE GMNI'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hoja, 'Legajo nro 53');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  function libroLegacyConEstructura(
    opciones: { columnasHasta?: string; meses?: string[]; rangoRef?: string } = {},
  ) {
    const meses = opciones.meses ?? [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];
    const totalIncluido = opciones.columnasHasta !== 'N';
    const encabezado = ['Tipo', 'Acumulador', ...meses, ...(totalIncluido ? ['Total'] : [])];
    const fila = (tipo: string, acumulador: string, valor = 0) => [
      tipo,
      acumulador,
      ...Array.from({ length: meses.length }, () => valor),
      ...(totalIncluido ? [valor * meses.length] : []),
    ];
    const filas = [
      ['PRUEBA - Legajos Liquidados Detalle'],
      encabezado,
      fila('Deducciones Art. 30', 'GANANCIA NO IMPONIBLE', 429316.88),
      fila('Deducciones Art. 30', 'CONYUGE', 0),
      fila('Deducciones Art. 30', 'HIJOS', 0),
      fila('Deducciones Art. 30', 'OTRAS CARGAS', 0),
      fila('Deducciones Art. 30', 'DEDUCCION ESPECIAL', 2060721),
      fila('Deducciones Art. 30', 'DOCEAVA PARTE ART.30', 207503.16),
      fila('Ingresos', 'REMUNERACION CON APORTE', 1000000),
      fila('Ingresos', 'SAC', 0),
      fila('Resultado', 'GANANCIA NETA FILA35', 500000),
      fila('Retencion', 'RETENCION', 0),
      fila('Retencion', 'IMPUESTO CALCULADO', 0),
      fila('Retencion', 'PORCENTAJE', 0),
      ...Array.from({ length: 35 }, () => Array.from({ length: encabezado.length }, () => null)),
    ];
    const hoja = XLSX.utils.aoa_to_sheet(filas);
    hoja['!ref'] = opciones.rangoRef ?? `A1:${opciones.columnasHasta ?? 'O'}49`;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hoja, 'Legajo nro 99');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  it('lee datos complementarios embebidos en una hoja legacy sin tomar notas visuales', async () => {
    const liquidacion = await servicio().leer(
      libroLegacyConContextoEmbebido(),
      'Parodi Control Ganancias  072026.xlsx',
    );

    expect(liquidacion.contexto_complementario_excel).toEqual({
      datos_cliente: {
        cliente_nombre: 'Parodi',
        cliente_cuit: 20205889522,
        modalidad_sac: 'devengado',
        modo_saldo_favor: 'compensar',
        zona_geografica_default: 'general',
      },
      datos_legajo: {
        legajo_numero: '53',
        fecha_ingreso: '2000-08-31',
        zona_geografica: 'general',
        cargas_familia_conyuge: true,
        cargas_familia_cant_hijos: 2,
        tiene_otros_empleadores: false,
      },
    });
    expect(liquidacion.config_cliente?.modo_saldo_favor).toBe('compensar');
    expect(liquidacion.config_cliente?.modalidad_sac).toBe('devengado');
    expect(liquidacion.legajo_empleado?.legajo_numero).toBe('53');
    expect(liquidacion.legajo_empleado).not.toHaveProperty('gastos_educativos');
    expect(liquidacion.advertencias).toContain(
      'El bloque Legajo_Empleado informa legajo_numero=128, pero el archivo/hoja identifica legajo=53; se mantiene el legajo del archivo.',
    );
  });

  it('lee datos complementarios desde una hoja Datos Extras', async () => {
    const wbBase = XLSX.read(libroLegacyConContextoEmbebido(), { type: 'buffer' });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wbBase.Sheets[wbBase.SheetNames[0]], 'Legajo nro 53');
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['cliente_cuit', 20205889522],
        ['modalidad_sac', 'Prorrateado'],
        ['modo_saldo_favor', 'Compensar'],
        ['zona_geografica_default', 'Mendoza'],
        ['legajo_numero', 128],
        ['empleado_cuil', ''],
        ['fecha_ingreso ', 36769],
        ['fecha_egreso ', ''],
        ['zona_geografica ', 'Mendoza'],
        ['categoria', 50],
        ['cargas_familia_conyuge', 'Si'],
        ['cargas_familia_cant_hijos', 2],
        ['cargas_familia_otras', 0],
        ['cargas_familia_hijos_evento', 'baja'],
        ['cargas_familia_hijos_evento_cantidad', 1],
        ['cargas_familia_hijos_desde_mes', 'julio'],
        ['cargas_familia_hijos_motivo', 'baja_real'],
        ['cargas_familia_hijos_equivalentes_enero', '2,5'],
        ['cargas_familia_hijos_equivalentes_julio', 1.5],
        ['tiene_otros_empleadores', 'No'],
      ]),
      'Datos Extras',
    );

    const liquidacion = await servicio().leer(
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }),
      'Parodi Control Ganancias  072026.xlsx',
    );

    expect(liquidacion.hojas_detectadas).toContain('Datos Extras');
    expect(liquidacion.contexto_complementario_excel?.datos_cliente).toMatchObject({
      cliente_cuit: 20205889522,
      modalidad_sac: 'devengado',
      modo_saldo_favor: 'compensar',
      zona_geografica_default: 'general',
    });
    expect(liquidacion.contexto_complementario_excel?.datos_legajo).toMatchObject({
      legajo_numero: '53',
      fecha_ingreso: '2000-08-31',
      zona_geografica: 'general',
      categoria: 50,
      cargas_familia_conyuge: true,
      cargas_familia_cant_hijos: 2,
      cargas_familia_otras: 0,
      cargas_familia_hijos_evento: 'baja',
      cargas_familia_hijos_evento_cantidad: 1,
      cargas_familia_hijos_desde_mes: 'julio',
      cargas_familia_hijos_motivo: 'baja_real',
      cargas_familia_hijos_equivalentes_enero: 2.5,
      cargas_familia_hijos_equivalentes_julio: 1.5,
      tiene_otros_empleadores: false,
    });
    expect(liquidacion.config_cliente?.modo_saldo_favor).toBe('compensar');
    expect(liquidacion.legajo_empleado?.cargas_familia_cant_hijos).toBe(2);
    expect(liquidacion.legajo_empleado?.categoria).toBe(50);
    expect(liquidacion.legajo_empleado?.cargas_familia_hijos_equivalentes_enero).toBe(2.5);
  });

  it('informa CTRL_ESTRUCTURA_EXCEL con filas 1-49, columnas A-O y meses enero-diciembre', async () => {
    const liquidacion = await servicio().leer(
      libroLegacyConEstructura(),
      'Prueba_Legajo_99_062026.xlsx',
    );

    expect(liquidacion.estructura_excel).toEqual(expect.objectContaining({
      hoja: 'Legajo nro 99',
      rango_detectado: 'A1:O49',
      rango_hoja_detectado: 'A1:O49',
      rango_tabla_esperado: 'A1:O49',
      controla_solo_tabla: true,
      filas_esperadas: 49,
      filas_detectadas: 49,
      filas_1_49_detectadas: true,
      columnas_esperadas: 15,
      columnas_detectadas: 15,
      columnas_a_o_presentes: true,
      meses_enero_diciembre_presentes: true,
    }));
    expect(liquidacion.estructura_excel?.columnas_presentes).toEqual([
      'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O',
    ]);
    expect(liquidacion.estructura_excel?.meses_faltantes).toEqual([]);
    expect(liquidacion.estructura_excel?.filas_faltantes).toEqual([]);
  });

  it('ignora filas y columnas fuera de la tabla A1:O49', async () => {
    const liquidacion = await servicio().leer(
      libroLegacyConEstructura({ rangoRef: 'A1:Z1000' }),
      'Prueba_Legajo_99_062026.xlsx',
    );

    expect(liquidacion.estructura_excel).toEqual(expect.objectContaining({
      rango_detectado: 'A1:O49',
      rango_hoja_detectado: 'A1:Z1000',
      filas_detectadas: 49,
      columnas_detectadas: 15,
      filas_1_49_detectadas: true,
      columnas_a_o_presentes: true,
      meses_enero_diciembre_presentes: true,
      filas_extras: [],
      columnas_extras: [],
      filas_ignoradas_fuera_tabla: 951,
    }));
    expect(liquidacion.estructura_excel?.columnas_ignoradas_fuera_tabla).toEqual([
      'P','Q','R','S','T','U','V','W','X','Y','Z',
    ]);
  });

  it('detecta columnas y meses faltantes en la estructura del Excel', async () => {
    const liquidacion = await servicio().leer(
      libroLegacyConEstructura({
        columnasHasta: 'N',
        meses: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre'],
      }),
      'Prueba_Legajo_99_062026.xlsx',
    );

    expect(liquidacion.estructura_excel).toEqual(expect.objectContaining({
      rango_detectado: 'A1:O49',
      rango_hoja_detectado: 'A1:N49',
      filas_detectadas: 49,
      columnas_detectadas: 14,
      columnas_a_o_presentes: false,
      meses_enero_diciembre_presentes: false,
    }));
    expect(liquidacion.estructura_excel?.columnas_faltantes).toEqual(['O']);
    expect(liquidacion.estructura_excel?.meses_faltantes).toEqual(['diciembre']);
  });
});
