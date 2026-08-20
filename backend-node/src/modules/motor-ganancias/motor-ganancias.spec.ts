import fs from 'node:fs';import path from 'node:path';
import { D } from '../../common/decimal/decimal.util';
import { NormalizadorService } from '../normalizacion/normalizador.service';import { SheetjsExcelService } from '../excel/sheetjs-excel.service';
import { ParserReporteExtendidoService } from '../excel/parser-reporte-extendido.service';
import { EscalaArt94Service } from './escala-art94.service';import { MotorGananciasService } from './motor-ganancias.service';import { DetectorSacService } from './detector-sac.service';import { ValidacionesService } from './validaciones.service';
import { CatalogoValidacionesService } from './catalogo-validaciones.service';
describe('MotorGananciasService',()=>{const normalizador=new NormalizadorService(),excel=new SheetjsExcelService(normalizador,new ParserReporteExtendidoService(normalizador)),escala=new EscalaArt94Service(),motor=new MotorGananciasService(escala),detector=new DetectorSacService(),validaciones=new ValidacionesService();const rutaFixture=(n:string)=>path.join(process.cwd(),'test','fixtures',n);const fixtureExiste=(n:string)=>fs.existsSync(rutaFixture(n));const itConFixture=(n:string)=>fixtureExiste(n)?it:it.skip;const cargar=async(n:string)=>excel.leer(fs.readFileSync(rutaFixture(n)),n);
 itConFixture('Review_Netser_Legajo_67_062026.xlsx')('calcula Netser con Decimal y detecta SAC devengado',async()=>{const l=await cargar('Review_Netser_Legajo_67_062026.xlsx'),s=detector.detectar(l),c=motor.calcular(l);expect(s.modalidad).toBe('devengado');expect(c.retencion_calculada.toFixed(2)).toBe('343568.63');expect(c.diferencia_retencion.toFixed(2)).toBe('-0.01');expect(validaciones.ejecutar(l,s,c,D('.05')).map(v=>v.estado)).toEqual(['OK','OK','OK','OK','OK']);});
 itConFixture('Review_Marinaro_Legajo_1_062026.xlsx')('calcula Marinaro con SAC percibido',async()=>{const l=await cargar('Review_Marinaro_Legajo_1_062026.xlsx'),s=detector.detectar(l),c=motor.calcular(l);expect(s.modalidad).toBe('percibido');expect(c.retencion_calculada.toFixed(2)).toBe('3756685.99');});
 it('resuelve extremos de la escala sin usar number',()=>{expect(escala.buscar(D(0),2026,1).tramo).toBe(1);expect(escala.buscar(D('40000000'),2026,6).tramo).toBe(8);});
 itConFixture('CMuniz_Legajo_180_M062026.xlsx')('ignora tablas laterales legacy que no son PapelTrabajo formal del spec',async()=>{
  const l=await cargar('CMuniz_Legajo_180_M062026.xlsx'),s=detector.detectar(l),c=motor.calcular(l),vs=validaciones.ejecutar(l,s,c,D('.05'));
  expect(Object.keys(l.papel_trabajo)).toHaveLength(0);
  expect(c.origen_total_ingresos).toBe('reconstruido_desde_base_y_deducciones');
  const v4=vs.find(v=>v.codigo==='V4_ESCALA_ART94');
 expect(v4?.estado).toBe('OK');
 expect(v4?.tipo_hallazgo).toBe('ESCALA_REFERENCIA_APLICADA');
  const v10=vs.find(v=>v.codigo==='V10_RETENCION');
  expect(v10?.estado).toBe('NO_EVALUADA');
  expect((v10 as any)?.datos_faltantes).toContain('config_cliente.modo_saldo_favor');
  expect((v10 as any)?.accion_recomendada).toBe('Completar modo_saldo_favor en Datos complementarios del cliente.');
  expect((v10 as any)?.detalle).toContain('pendiente por datos');
  const cobertura=new CatalogoValidacionesService().cobertura(vs);
  const catalogoV4:any=cobertura.validaciones.find((v:any)=>v.codigo==='V4');
  expect(catalogoV4?.estado).toBe('OK');
  expect(catalogoV4?.codigo_interno).toBe('V4_ESCALA_ART94');
  expect(catalogoV4?.afecta_veredicto).toBe(false);
 });
 itConFixture('Review_Netser_Legajo_67_062026.xlsx')('marca V4 cuando PapelTrabajo formal trae una escala distinta a la referencia',async()=>{
  const l:any=await cargar('Review_Netser_Legajo_67_062026.xlsx'),s=detector.detectar(l),c=motor.calcular(l);
  const minimo=D('3000045.13'),porcentaje=D('15'),fijo=D('260003.91'),sobre=c.ganancia_neta_base.minus(minimo),impuesto=fijo.plus(sobre.mul(porcentaje).div(100));
  l.papel_trabajo_asis={escala_minimo_tramo:minimo,escala_porcentaje:porcentaje,escala_importe_fijo:fijo,sobre_diferencia:sobre,impuesto_determinado:impuesto};
  const vs=validaciones.ejecutar(l,s,c,D('.05')),v4=vs.find(v=>v.codigo==='V4_ESCALA_ART94');
  expect(v4?.estado).toBe('ADVERTENCIA');
  expect(v4?.tipo_hallazgo).toBe('ESCALA_EXCEL_DISTINTA_A_ESCALA_REFERENCIA');
 });
 it('usa la cantidad de hijos informada en datos complementarios para V17',()=>{
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const valores=(julio:string)=>Object.fromEntries(meses.map(m=>[m,D(m==='julio'?julio:'0')]));
  const acumulador=(clave:string,julio:string)=>({clave,etiqueta_original:clave,tipo_original:null,valores:valores(julio),total:D(julio),fila_origen:1});
  const l:any={metadata:{archivo:'sintetico.xlsx',hoja:'Hoja1',cliente:'Prueba',legajo:'665',periodo_fiscal:2026,mes_liquidacion:7},acumuladores:{ganancia_no_imponible:acumulador('ganancia_no_imponible','3077540.53'),deduccion_especial:acumulador('deduccion_especial','14772194.56'),hijos:acumulador('hijos','2923373.54')},papel_trabajo:{},papel_trabajo_mes:7,hojas_detectadas:['Hoja1'],hojas_faltantes:[],advertencias:[],conceptos_no_reconocidos:[],legajo_empleado:{cargas_familia_cant_hijos:0}};
  const v17:any=validaciones.v17(l,D('.05'));
  const hijos=v17.comparaciones.find((c:any)=>String(c.concepto).startsWith('Hijos'));
  expect(v17.estado).toBe('ERROR');
  expect(hijos.esperado).toBe(0);
  expect(hijos.informado).toBe(2923373.54);
  expect(hijos.formula_valores.cantidad_hijos_detectada).toBe(0);
 expect(hijos.formula_valores.cantidad_hijos_origen).toBe('datos_complementarios');
  expect(hijos.formula_valores.cantidad_equivalente_informada).toBe(2);
 });
 it('usa evento de baja de hijos desde Datos Extras para V17',()=>{
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const valores=(porMes:Record<string,string>)=>Object.fromEntries(meses.map(m=>[m,D(porMes[m]??'0')]));
  const acumulador=(clave:string,porMes:Record<string,string>)=>({clave,etiqueta_original:clave,tipo_original:null,valores:valores(porMes),total:Object.values(porMes).reduce((s,v)=>s.plus(D(v)),D(0)),fila_origen:1});
  const l:any={
   metadata:{archivo:'sintetico.xlsx',hoja:'Hoja1',cliente:'Prueba',legajo:'56',periodo_fiscal:2026,mes_liquidacion:8},
   acumuladores:{
    ganancia_no_imponible:acumulador('ganancia_no_imponible',{agosto:'3579179.81'}),
    deduccion_especial:acumulador('deduccion_especial',{agosto:'17180063.10'}),
    hijos:acumulador('hijos',{enero:'203905.29',febrero:'203905.29',marzo:'203905.29',abril:'203905.29',mayo:'203905.29',junio:'203905.29'}),
   },
   papel_trabajo:{},papel_trabajo_mes:8,hojas_detectadas:['Hoja1'],hojas_faltantes:[],advertencias:[],conceptos_no_reconocidos:[],
   legajo_empleado:{
    cargas_familia_cant_hijos:1,
    cargas_familia_hijos_evento:'baja',
    cargas_familia_hijos_evento_cantidad:1,
    cargas_familia_hijos_desde_mes:'julio',
    cargas_familia_hijos_motivo:'baja_real',
   },
  };
  const v17:any=validaciones.v17(l,D('.05'));
  expect(v17.estado).toBe('OK');
 });
 it('usa hijos equivalentes mensuales para V17',()=>{
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const valores=(porMes:Record<string,string>)=>Object.fromEntries(meses.map(m=>[m,D(porMes[m]??'0')]));
  const acumulador=(clave:string,porMes:Record<string,string>)=>({clave,etiqueta_original:clave,tipo_original:null,valores:valores(porMes),total:Object.values(porMes).reduce((s,v)=>s.plus(D(v)),D(0)),fila_origen:1});
  const legajo_empleado:any={};
  for(const mes of meses.slice(0,8))legajo_empleado[`cargas_familia_hijos_equivalentes_${mes}`]=mes==='julio'||mes==='agosto'?0:1;
  const l:any={
   metadata:{archivo:'sintetico.xlsx',hoja:'Hoja1',cliente:'Prueba',legajo:'56',periodo_fiscal:2026,mes_liquidacion:8},
   acumuladores:{
    ganancia_no_imponible:acumulador('ganancia_no_imponible',{agosto:'3579179.81'}),
    deduccion_especial:acumulador('deduccion_especial',{agosto:'17180063.10'}),
    hijos:acumulador('hijos',{enero:'203905.29',febrero:'203905.29',marzo:'203905.29',abril:'203905.29',mayo:'203905.29',junio:'203905.29'}),
   },
   papel_trabajo:{},papel_trabajo_mes:8,hojas_detectadas:['Hoja1'],hojas_faltantes:[],advertencias:[],conceptos_no_reconocidos:[],legajo_empleado,
  };
  const v17:any=validaciones.v17(l,D('.05'));
  expect(v17.estado).toBe('OK');
 });
 it('explica que hacer cuando falla CTRL_ESTRUCTURA_EXCEL',()=>{
  const l:any={estructura_excel:{hoja:'Legajo nro 1',rango_detectado:'A1:N48',rango_hoja_detectado:'A1:N48',rango_tabla_esperado:'A1:O49',controla_solo_tabla:true,filas_esperadas:49,filas_detectadas:48,filas_1_49_detectadas:false,filas_faltantes:[49],filas_extras:[],columnas_esperadas:15,columnas_detectadas:14,columnas_esperadas_detalle:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O'],columnas_presentes:['A','B','C','D','E','F','G','H','I','J','K','L','M','N'],columnas_faltantes:['O'],columnas_extras:[],columnas_a_o_presentes:false,meses_esperados:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],meses_presentes:['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre'],meses_faltantes:['diciembre'],meses_enero_diciembre_presentes:false}};
  const ctrl:any=validaciones.controlEstructuraExcel(l);
  expect(ctrl.estado).toBe('ERROR');
  expect(ctrl.que_hacer).toContain('Agregar o restaurar 1 fila');
  expect(ctrl.que_hacer).toContain('Agregar o restaurar 1 columna');
  expect(ctrl.que_hacer).toContain('Completar los encabezados de mes faltantes');
  expect(ctrl.acciones_recomendadas).toHaveLength(3);
  expect(ctrl.cantidad_filas_faltantes).toBe(1);
  expect(ctrl.cantidad_columnas_faltantes).toBe(1);
  expect(ctrl.cantidad_meses_faltantes).toBe(1);
 });
});
