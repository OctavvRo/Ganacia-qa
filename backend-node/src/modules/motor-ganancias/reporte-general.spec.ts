import fs from 'node:fs';
import path from 'node:path';
import { ContextoComplementarioService } from '../contexto-complementario/contexto-complementario.service';
import { SheetjsExcelService } from '../excel/sheetjs-excel.service';
import { ParserReporteExtendidoService } from '../excel/parser-reporte-extendido.service';
import { NormalizadorService } from '../normalizacion/normalizador.service';
import { CatalogoValidacionesService } from './catalogo-validaciones.service';
import { DetalleMensualService } from './detalle-mensual.service';
import { DetectorSacService } from './detector-sac.service';
import { EscalaArt94Service } from './escala-art94.service';
import { MotorGananciasService } from './motor-ganancias.service';
import { ReporteService } from './reporte.service';
import { SnapshotService } from './snapshot.service';
import { ValidacionesService } from './validaciones.service';

describe('ReporteService con Excel generales', () => {
  const normalizador = new NormalizadorService();
  const excel = new SheetjsExcelService(
    normalizador,
    new ParserReporteExtendidoService(normalizador),
  );
  const motor = new MotorGananciasService(new EscalaArt94Service());
  const validaciones = new ValidacionesService();
  const reporte = new ReporteService(
    new DetectorSacService(),
    motor,
    validaciones,
    new CatalogoValidacionesService(),
    new DetalleMensualService(motor, validaciones),
    new SnapshotService(),
    new ContextoComplementarioService(),
  );

  const nombre = 'Proyeccion_Raices_Control Ganancias 072026.xlsx';
  const rutaFixture = path.join(process.cwd(), 'test', 'fixtures', nombre);
  const itConFixture = fs.existsSync(rutaFixture) ? it : it.skip;

  itConFixture('procesa un Excel con nombre libre y aplica la escala Art. 94 S2 para julio', async () => {
    const liquidacion = await excel.leer(
      fs.readFileSync(rutaFixture),
      nombre,
    );

    expect(Object.keys(liquidacion.acumuladores).length).toBeGreaterThanOrEqual(40);
    expect(liquidacion.conceptos_no_reconocidos).toEqual([]);
    expect(Object.keys(liquidacion.papel_trabajo)).toHaveLength(0);
    expect(liquidacion.metadata).toEqual(expect.objectContaining({
      cliente: 'Raices',
      legajo: '55',
      periodo_fiscal: 2026,
      mes_liquidacion: 7,
    }));

    const resultado = reporte.analizar(liquidacion);

    expect(resultado.validacion_entrada.es_procesable).toBe(true);
    expect(resultado.analisis_sac.modalidad).toBe('devengado');
    expect(resultado.estado).toBe('analisis_completado');
    expect(resultado.contexto_normativo.version_escala_art94).toBe('ART94_2026_S2_PDF_JUL_DIC_MES_07');
    expect(resultado.calculo.ganancia_neta_base).toBe(50427472.87);
    expect(resultado.calculo.tramo_escala).toEqual(expect.objectContaining({
      tramo: 9,
      minimo: 36290871,
      importe_fijo: 8765066.75,
      porcentaje: 35,
    }));
    expect(resultado.calculo.retencion_calculada).toBe(492143.78);
    expect(resultado.snapshot.resumen.ganancia_neta_base).toBe(resultado.calculo.ganancia_neta_base);
    expect(resultado.snapshot.pasos_motor[0]).toEqual(expect.objectContaining({
      estado: 'CALCULADO',
      valor: resultado.calculo.total_ingresos_usado,
    }));
    expect(resultado.snapshot.pasos_motor[8]).toEqual(expect.objectContaining({
      estado: 'CALCULADO',
    }));
    expect(resultado.detalle_mensual[6].estado).toBe('calculado');
    const v6 = resultado.validaciones.find((v: any) => v.codigo === 'V6_12VA_PARTE_ART30') as any;
    expect(v6).toEqual(expect.objectContaining({
      estado: 'ADVERTENCIA',
      tipo_hallazgo: 'V6_12VA_PARTE_ART30_DATOS_EXCEL_INCONSISTENTES',
      categoria_hallazgo: 'CALIDAD_DATOS_EXCEL',
    }));
    expect(v6.detalle).toContain('No es un error del motor');
    expect(v6.detalle).toContain('Campos a revisar en el origen');
    expect(v6.campos_a_revisar).toEqual(expect.arrayContaining([
      'deduccion_especial',
      'hijos',
      'doceava_parte_art30',
    ]));
    expect(v6.meses_con_diferencias[0]).toEqual(expect.objectContaining({
      mes: 'enero',
      informado: 207503.15,
      total_base_esperada: 633222.17,
      total_base_probable: 2490037.88,
    }));
    expect(v6.meses_con_diferencias[0].esperado).toBeCloseTo(52768.51, 2);
    expect(v6.meses_con_diferencias[0].valor_probable).toBeCloseTo(207503.16, 2);
    expect(v6.meses_con_diferencias[0].causa_probable).toContain('deduccion_especial');
    expect(v6.meses_con_diferencias[0].explicacion_aritmetica).toContain('base informada del mes');
    expect(v6.meses_con_diferencias[0].explicacion_aritmetica).toContain('otra base probable');
    expect(v6.meses_con_diferencias[1].causa_probable).toContain('hijos');

    const v17 = resultado.validaciones.find((v: any) => v.codigo === 'V17_ACTUALIZACION_SEMESTRAL_ART30') as any;
    expect(v17).toEqual(expect.objectContaining({
      estado: 'ERROR',
      tipo_hallazgo: 'V17_ART30_PARAMETROS_SEMESTRALES_INCONSISTENTES',
    }));
    expect(v17.comparaciones).toEqual(expect.arrayContaining([
      expect.objectContaining({
        concepto: 'Ganancia no imponible',
        esperado: 3077540.53,
        informado: 3005218.16,
        formula_operacion: 'parametro_acumulado',
      }),
      expect.objectContaining({
        concepto: 'Deduccion especial Art. 30 ap. 2',
        esperado: 14772194.56,
        informado: 14425047,
        formula_valores: expect.objectContaining({
          parametro_acumulado: 14772194.56,
        }),
      }),
    ]));
  });
});
