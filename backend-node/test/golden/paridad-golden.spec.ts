import fs from 'node:fs';
import path from 'node:path';
import { NormalizadorService } from '../../src/modules/normalizacion/normalizador.service';
import { SheetjsExcelService } from '../../src/modules/excel/sheetjs-excel.service';
import { ParserReporteExtendidoService } from '../../src/modules/excel/parser-reporte-extendido.service';
import { EscalaArt94Service } from '../../src/modules/motor-ganancias/escala-art94.service';
import { DetectorSacService } from '../../src/modules/motor-ganancias/detector-sac.service';
import { MotorGananciasService } from '../../src/modules/motor-ganancias/motor-ganancias.service';
import { ValidacionesService } from '../../src/modules/motor-ganancias/validaciones.service';
import { CatalogoValidacionesService } from '../../src/modules/motor-ganancias/catalogo-validaciones.service';
import { DetalleMensualService } from '../../src/modules/motor-ganancias/detalle-mensual.service';
import { SnapshotService } from '../../src/modules/motor-ganancias/snapshot.service';
import { ContextoComplementarioService } from '../../src/modules/contexto-complementario/contexto-complementario.service';
import { ReporteService } from '../../src/modules/motor-ganancias/reporte.service';

const CASOS:[string,string][]=[
 ['Review_Netser_Legajo_67_062026.xlsx','netser_062026.python.golden.json'],
 ['Review_Marinaro_Legajo_1_062026.xlsx','marinaro_062026.python.golden.json'],
 ['Review_CasoPrueba_Legajo_99_062026.xlsx','caso_prueba_error_062026.python.golden.json'],
 ['Review_CasoPrueba_Legajo_99_062026_CORRECTO.xlsx','caso_prueba_correcto_062026.python.golden.json'],
 ['Review_PruebaIntegral_Legajo_303_062026.xlsx','prueba_integral_303_062026.python.golden.json'],
 ['CMuniz_Legajo_180_M062026.xlsx','cmuniz_180_062026.python.golden.json'],
];

const normalizador=new NormalizadorService(),excel=new SheetjsExcelService(normalizador,new ParserReporteExtendidoService(normalizador)),escala=new EscalaArt94Service(),detector=new DetectorSacService(),motor=new MotorGananciasService(escala),validaciones=new ValidacionesService(),catalogo=new CatalogoValidacionesService(),detalle=new DetalleMensualService(motor,validaciones),snapshot=new SnapshotService(),contexto=new ContextoComplementarioService(),reporte=new ReporteService(detector,motor,validaciones,catalogo,detalle,snapshot,contexto);

const VALIDACIONES_NODE_ONLY = new Set(['V4_ESCALA_ART94', 'V10_RETENCION']);

function funcional(r: any) {
  return {
    estado: r.estado,
    tipo_analisis: r.tipo_analisis,
    metadata: r.metadata,
    analisis_sac: r.analisis_sac,
    calculo: normalizarCalculo(r.calculo),
    validaciones: (r.validaciones ?? []).filter(
      (v: any) => !VALIDACIONES_NODE_ONLY.has(v.codigo),
    ),
    veredicto: normalizarVeredicto(r.veredicto),
    detalle_mensual: normalizarDetalleMensual(r.detalle_mensual),
    cobertura_validaciones: normalizarCobertura(r.cobertura_validaciones),
    controles_tecnicos: (r.controles_tecnicos ?? [])
      .filter(
        (v: any) => !['CTRL_CONCILIACION_RETENCION', 'CTRL_RETENCION_INFORMADA'].includes(v.codigo),
      )
      .map((v: any) => ({
        codigo: v.codigo,
        codigo_legacy: v.codigo_legacy,
        estado: v.estado,
        bruto_mensual: v.bruto_mensual,
        tope_35: v.tope_35,
        retencion_calculada: v.retencion_calculada,
        excedente_sobre_tope: v.excedente_sobre_tope,
        detalle: v.detalle,
        afecta_veredicto: v.afecta_veredicto,
      })),
  };
}

function normalizarDetalleMensual(detalle: any[] = []) {
  return detalle.map((m: any) => ({
    ...m,
    calculo: normalizarCalculo(m.calculo),
    veredicto: normalizarVeredicto(m.veredicto),
    validaciones: (m.validaciones ?? []).filter((v: any) => v.codigo !== 'V10_RETENCION'),
  }));
}

function normalizarCalculo(calculo: any) {
  if (!calculo) return calculo;
  const copia = structuredClone(calculo);
  delete copia.total_ingresos_usado;
  delete copia.total_ingresos_composicion;
  delete copia.origen_total_ingresos;
  return copia;
}

function normalizarVeredicto(_: string) {
  return 'NORMALIZADO_SIN_COMPARACION_EXCEL';
}

function normalizarCobertura(cobertura: any) {
  if (!cobertura?.validaciones) return cobertura;

  const validaciones = cobertura.validaciones
    .filter((v: any) => !['V4', 'V10'].includes(v.codigo))
    .map((v: any) => ({
      codigo: v.codigo,
      estado: v.estado,
      afecta_veredicto: v.afecta_veredicto,
      ...(v.subvalidaciones
        ? {
            subvalidaciones: v.subvalidaciones.map((s: any) => ({
              codigo: s.codigo,
              estado: s.estado,
            })),
          }
        : {}),
    }));

  return {
    version: cobertura.version,
    nivel_cobertura: cobertura.nivel_cobertura,
    total_catalogo: validaciones.length,
    evaluadas: validaciones.filter((v: any) => v.estado !== 'NO_EVALUADA').length,
    no_evaluadas: validaciones.filter((v: any) => v.estado === 'NO_EVALUADA').length,
    validaciones,
  };
}

describe('Paridad funcional Python vs Node',()=>{
 const disponibles = CASOS.filter(([nombre, golden]) =>
   fs.existsSync(path.join(__dirname, '..', 'fixtures', nombre))
   && fs.existsSync(path.join(__dirname, golden)),
 );
 const testParidad = disponibles.length > 0 ? it.each(disponibles) : it.skip.each(CASOS);

 testParidad('%s conserva resultados a centavos',async(nombre,golden)=>{
   const buffer=fs.readFileSync(path.join(__dirname,'..','fixtures',nombre));
   const esperado=JSON.parse(fs.readFileSync(path.join(__dirname,golden),'utf8'));
   const liq=await excel.leer(buffer,nombre),actual=reporte.analizar(liq);
   expect(funcional(actual)).toEqual(funcional(esperado));
 });
});
