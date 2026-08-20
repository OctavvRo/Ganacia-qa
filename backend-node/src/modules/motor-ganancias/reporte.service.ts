import { Injectable } from '@nestjs/common';
import { D, numero } from '../../common/decimal/decimal.util';
import { ContextoComplementarioService } from '../contexto-complementario/contexto-complementario.service';
import { LiquidacionNormalizada } from './dominio';
import { ErrorEscalaNoSoportada, obtenerEscalaArt94, versionEscalaArt94 } from './escala-art94.service';
import { CatalogoValidacionesService } from './catalogo-validaciones.service';
import { DetalleMensualService } from './detalle-mensual.service';
import { DetectorSacService } from './detector-sac.service';
import { MotorGananciasService } from './motor-ganancias.service';
import { SnapshotService } from './snapshot.service';
import { ValidacionesService } from './validaciones.service';

@Injectable()
export class ReporteService{
 constructor(private detector:DetectorSacService,private motor:MotorGananciasService,private validaciones:ValidacionesService,private catalogo:CatalogoValidacionesService,private detalle:DetalleMensualService,private snapshot:SnapshotService,private contexto:ContextoComplementarioService){}
 analizar(liq:LiquidacionNormalizada,contexto?:any){
  const contextoAnalisis=this.combinarContextos(this.contextoDesdeLiquidacion(liq),contexto);
  const tol=D(process.env.TOLERANCIA_REDONDEO??'0.05');
  const entrada=this.validaciones.validarEntrada(liq);
  const controlEstructura=this.validaciones.controlEstructuraExcel(liq);
  const sac=this.detector.detectar(liq,tol);
  const metadata={...liq.metadata};
  const advertencias=[...(liq.advertencias??[])];
  let reporte:any;

  if(!entrada.es_procesable){
    reporte={estado:'no_procesable',tipo_analisis:'ANALISIS_BASICO',metadata,analisis_sac:this.resumenSac(sac),contexto_normativo:this.normativa(metadata.periodo_fiscal,metadata.mes_liquidacion),datos_faltantes:entrada.datos_faltantes,advertencias:[...advertencias,...entrada.advertencias],motivo:entrada.detalle,validacion_entrada:entrada,validaciones:[],cobertura_validaciones:this.catalogo.cobertura([]),controles_tecnicos:[controlEstructura]};
    reporte.detalle_mensual=this.detalle.generar(liq,sac,false,tol);
  }else try{
    const c=this.motor.calcular(liq),vs=this.validaciones.ejecutar(liq,sac,c,tol);
    reporte={estado:'analisis_completado',tipo_analisis:'ANALISIS_BASICO',metadata,analisis_sac:this.resumenSac(sac),calculo:this.motor.serializar(c),contexto_normativo:this.normativa(metadata.periodo_fiscal,metadata.mes_liquidacion),validacion_entrada:entrada,validaciones:vs,cobertura_validaciones:this.catalogo.cobertura(vs),controles_tecnicos:[...this.catalogo.controles(vs),controlEstructura],veredicto:this.validaciones.veredicto(vs),advertencias};
    reporte.detalle_mensual=this.detalle.generar(liq,sac,true,tol);
  }catch(e){
    if(!(e instanceof ErrorEscalaNoSoportada))throw e;
    reporte={estado:'analisis_no_soportado',tipo_analisis:'ANALISIS_BASICO',metadata,analisis_sac:this.resumenSac(sac),calculo_parcial:this.calculoParcial(liq),contexto_normativo:this.normativa(metadata.periodo_fiscal,metadata.mes_liquidacion),motivo:'Escala Art. 94 no cargada para este periodo/tramo.',datos_faltantes:['escala_art_94'],detalle_tecnico:e.message,validacion_entrada:entrada,validaciones:[],cobertura_validaciones:this.catalogo.cobertura([]),controles_tecnicos:[controlEstructura],advertencias};
    reporte.detalle_mensual=this.detalle.generar(liq,sac,true,tol);
  }

  reporte.hojas_detectadas=liq.hojas_detectadas;
  this.snapshot.agregar(reporte);
  this.contexto.aplicar(reporte,contextoAnalisis);
  delete reporte.hojas_detectadas;
  return reporte;
 }
 private resumenSac(s:any){return{modalidad:s.modalidad,confianza:s.confianza,motivo:s.motivo,advertencias:s.advertencias};}
 private calculoParcial(liq:LiquidacionNormalizada){const mes=liq.metadata.mes_liquidacion??0,c=this.motor.construccion(liq,mes),anteriores=this.motor.sumar(liq,'retencion_practicada',mes-1),retencionExcel=liq.acumuladores['retencion_practicada']?this.motor.valor(liq,'retencion_practicada',mes):D(0),totalSac=this.motor.sumar(liq,'sac',mes);return{calculo_completo:false,motivo_calculo_incompleto:'No se aplica escala Art. 94 porque el tramo o periodo requerido no esta cargado.',acumulados:{deducciones_art30_acumuladas:numero(c.deducciones_art30),deducciones_personales_acumuladas:numero(c.deducciones_personales),deducciones_generales_basicas:numero(c.deducciones_generales),total_remuneraciones_con_aporte:numero(c.remuneraciones_con_aporte),total_remuneraciones_sin_aporte:numero(c.remuneraciones_sin_aporte),total_haberes_no_habituales:numero(c.haberes_no_habituales),total_remuneraciones_otras_empresas:numero(c.remuneraciones_otras_empresas),total_sac:numero(totalSac)},total_ingresos_usado:numero(c.total_ingresos_usado),total_ingresos_composicion:{remuneraciones_con_aporte:numero(c.remuneraciones_con_aporte),remuneraciones_sin_aporte:numero(c.remuneraciones_sin_aporte),sac_computable:numero(c.sac_computable),haberes_no_habituales:numero(c.haberes_no_habituales),remuneraciones_otras_empresas:numero(c.remuneraciones_otras_empresas),total_ingresos_usado:numero(c.total_ingresos_usado),origen:'reconstruido_desde_base_y_deducciones'},origen_total_ingresos:'reconstruido_desde_base_y_deducciones',deducciones_personales:numero(c.deducciones_personales),deducciones_generales:numero(c.deducciones_generales),deducciones_art30:numero(c.deducciones_art30),ganancia_neta_base:numero(c.ganancia_neta_base),tramo_escala:null,impuesto_determinado_calculado:null,impuesto_sobre_excedente:null,retenciones_anteriores:numero(anteriores),retencion_calculada:null,retencion_excel:numero(retencionExcel),diferencia_retencion:null};}
 private normativa(periodo:number|null,mes:number|null){const p=periodo??2026,m=mes??6;let escala:any[]=[];try{escala=obtenerEscalaArt94(p,m).map(t=>({tramo:t.tramo,minimo:numero(t.minimo),maximo:t.maximo?numero(t.maximo):null,importe_fijo:numero(t.importe_fijo),porcentaje:numero(t.porcentaje)}));}catch{escala=[];}const esS2=p===2026&&m>=7&&m<=12;return{periodo_fiscal:p,mes_liquidacion:m,version_escala_art94:versionEscalaArt94(p,m),vigencia_desde:esS2?'2026-07-01':'2026-01-01',vigencia_hasta:esS2?'2026-12-31':'2026-06-30',fuente:esS2?'Tabla-Art-94-LIG-per-jul-a-dic-2026.pdf':'spec-controlador-ganancias-4ta.md - Anexo A',fuente_deducciones_art30_s2:'Deducciones-personales-art-30-jul-dic-2026.pdf',estado_validacion:'PENDIENTE_VALIDACION_NORMATIVA',es_oficial:false,advertencia:'Valores tomados de especificaciones/PDF provistos. Validar contra normativa oficial antes de produccion.',escala_art94:escala};}
 private contextoDesdeLiquidacion(liq:LiquidacionNormalizada){const base:any={...(liq.contexto_complementario_excel??{})};if(liq.config_cliente){base.datos_cliente={...(base.datos_cliente??{}),...this.soloCampos(liq.config_cliente,['modalidad_sac','modo_saldo_favor','poliza_seguro_cobra_sobre_sac','cct_default','zona_geografica_default'])};}if(liq.legajo_empleado){base.datos_legajo={...(base.datos_legajo??{}),...this.soloCampos(liq.legajo_empleado,['legajo_numero','empleado_cuil','fecha_ingreso','fecha_egreso','zona_geografica','regimen_previsional','cct_aplicable','categoria','situacion_revista','cargas_familia_conyuge','cargas_familia_cant_hijos','cargas_familia_otras','tiene_otros_empleadores','cargas_familia_hijos_evento','cargas_familia_hijos_evento_cantidad','cargas_familia_hijos_desde_mes','cargas_familia_hijos_motivo','cargas_familia_hijos_equivalentes','cargas_familia_hijos_equivalentes_enero','cargas_familia_hijos_equivalentes_febrero','cargas_familia_hijos_equivalentes_marzo','cargas_familia_hijos_equivalentes_abril','cargas_familia_hijos_equivalentes_mayo','cargas_familia_hijos_equivalentes_junio','cargas_familia_hijos_equivalentes_julio','cargas_familia_hijos_equivalentes_agosto','cargas_familia_hijos_equivalentes_septiembre','cargas_familia_hijos_equivalentes_octubre','cargas_familia_hijos_equivalentes_noviembre','cargas_familia_hijos_equivalentes_diciembre'])};}if(liq.metadata?.cliente){base.datos_cliente={...(base.datos_cliente??{}),cliente_nombre:liq.metadata.cliente};}if(liq.metadata?.legajo){base.datos_legajo={...(base.datos_legajo??{}),legajo_numero:liq.metadata.legajo};}if(liq.metadata?.periodo_fiscal||liq.metadata?.mes_liquidacion){base.datos_contexto={...(base.datos_contexto??{}),periodo_fiscal:liq.metadata.periodo_fiscal,mes_liquidacion:liq.metadata.mes_liquidacion,fuente_datos:'excel'};}return base;}
 private soloCampos(origen:any,permitidos:string[]){return Object.fromEntries(Object.entries(origen??{}).filter(([k,v])=>permitidos.includes(k)&&v!==undefined&&v!==null&&v!==''));}
 private combinarContextos(base:any={},prioritario:any={}){const salida:any={...base,...(prioritario??{})};for(const grupo of ['datos_cliente','datos_legajo','datos_siradig','datos_normativa','datos_novedades','datos_historial','datos_ajuste_final','datos_contexto']){if(base?.[grupo]||prioritario?.[grupo])salida[grupo]={...(base?.[grupo]??{}),...(prioritario?.[grupo]??{})};}return salida;}
}
