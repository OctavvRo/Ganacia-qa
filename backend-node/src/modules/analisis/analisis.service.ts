import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model, Types } from 'mongoose';
import { SheetjsExcelService } from '../excel/sheetjs-excel.service';
import { ContextoComplementarioService } from '../contexto-complementario/contexto-complementario.service';
import { ReporteService } from '../motor-ganancias/reporte.service';
import { AnalisisSnapshot, AnalisisSnapshotDocument } from './schemas/analisis-snapshot.schema';
import { ArchivoProcesado, ArchivoProcesadoDocument } from '../archivos/schemas/archivo-procesado.schema';
import { ListarAnalisisDto } from './dto/listar-analisis.dto';
import { ExplicacionesIaService } from '../explicaciones/explicaciones-ia.service';

@Injectable()
export class AnalisisService{
 constructor(private excel:SheetjsExcelService,private reporte:ReporteService,private contexto:ContextoComplementarioService,@InjectModel(AnalisisSnapshot.name)private snapshots:Model<AnalisisSnapshotDocument>,@InjectModel(ArchivoProcesado.name)private archivos:Model<ArchivoProcesadoDocument>,@Optional() private explicaciones?:ExplicacionesIaService){}
 async analizar(buffer:Buffer,nombre:string,mime:string,contexto?:any){const liq=await this.excel.leer(buffer,nombre);const contextoNormalizado=this.normalizarContextoSiExiste(contexto);this.aplicarMetadataManual(liq,contextoNormalizado);this.aplicarContextoManualEnLiquidacion(liq,contextoNormalizado);const resultado=this.reporte.analizar(liq,contextoNormalizado),hash=createHash('sha256').update(buffer).digest('hex'),s=resultado.snapshot??{},modoSaldoFavor=resultado.contexto_complementario?.datos_cliente?.modo_saldo_favor;const doc=await this.snapshots.create({origen:s.origen??'AUDITORIA_EXCEL',tipo_analisis:resultado.tipo_analisis,cliente:resultado.metadata?.cliente,legajo:resultado.metadata?.legajo,periodo:s.periodo,archivo_origen:nombre,hash_archivo:hash,fecha_analisis:new Date(s.fecha_analisis??Date.now()),motor_version:s.motor_version,escala_version:s.escala_art94_version,modalidad_sac:resultado.analisis_sac?.modalidad,modo_saldo_favor:modoSaldoFavor,estado:resultado.estado,veredicto:resultado.veredicto,resumen:s.resumen,calculo:resultado.calculo,composicion_ingresos:resultado.calculo?.total_ingresos_composicion,contexto_normativo:resultado.contexto_normativo,cobertura_reporte:resultado.cobertura_reporte,contexto_complementario:resultado.contexto_complementario,detalle_mensual:resultado.detalle_mensual,validaciones:resultado.validaciones,advertencias:s.advertencias??resultado.advertencias??[],faltantes:resultado.datos_faltantes??[],snapshot_original:resultado});await this.archivos.create({nombre,hash,tamano:buffer.length,mime,analisis_id:doc._id});return{...resultado,id:String(doc._id)};}
 async listar(q:ListarAnalisisDto){const filtro:any={};for(const k of ['cliente','legajo','periodo','estado','veredicto'] as const)if(q[k])filtro[k]=q[k];if(q.fechaDesde||q.fechaHasta)filtro.fecha_analisis={...(q.fechaDesde?{$gte:new Date(q.fechaDesde)}:{}),...(q.fechaHasta?{$lte:new Date(q.fechaHasta)}:{})};if(!q.incluir_eliminados){filtro.eliminado={$ne:true};}const [datos,total]=await Promise.all([this.snapshots.find(filtro).sort({fecha_analisis:-1}).skip((q.pagina-1)*q.limite).limit(q.limite).lean(),this.snapshots.countDocuments(filtro)]);return{datos:datos.map(d=>this.resumen(d)),pagina:q.pagina,limite:q.limite,total,paginas:Math.ceil(total/q.limite)};}
 async obtener(id:string){if(!Types.ObjectId.isValid(id))throw new NotFoundException('Análisis eliminado o inexistente.');const d=await this.snapshots.findById(id).lean();if(!d||d.eliminado===true)throw new NotFoundException('Análisis eliminado o inexistente.');return{...(d.snapshot_original as any),id:String(d._id)};}
 async explicar(id:string){const analisis=await this.obtener(id);if(!this.explicaciones)throw new NotFoundException('Servicio de explicaciones no disponible.');return this.explicaciones.explicar(analisis);}
 async actualizarContexto(id:string,entrada:any){const original=await this.obtener(id),resultado=structuredClone(original);delete resultado.id;this.contexto.aplicar(resultado,entrada);const anterior=await this.snapshots.findById(id).lean();if(!anterior)throw new NotFoundException();const modoSaldoFavor=resultado.contexto_complementario?.datos_cliente?.modo_saldo_favor;const doc=await this.snapshots.create({...anterior,_id:undefined,fecha_analisis:new Date(),tipo_analisis:resultado.tipo_analisis,modo_saldo_favor:modoSaldoFavor,contexto_complementario:resultado.contexto_complementario,cobertura_reporte:resultado.cobertura_reporte,snapshot_original:resultado});return{...resultado,id:String(doc._id),analisis_origen_id:id};}
 async diagnosticos(){const filtro={eliminado:{$ne:true}};const [total,porEstado,porVeredicto]=await Promise.all([this.snapshots.countDocuments(filtro),this.snapshots.aggregate([{$match:filtro},{$group:{_id:'$estado',cantidad:{$sum:1}}}]),this.snapshots.aggregate([{$match:filtro},{$group:{_id:'$veredicto',cantidad:{$sum:1}}}]),]);return{total,por_estado:porEstado,por_veredicto:porVeredicto};}
 async eliminar(id:string){if(!Types.ObjectId.isValid(id))throw new NotFoundException('Análisis no encontrado');const doc=await this.snapshots.findById(id).lean();if(!doc||doc.eliminado===true)throw new NotFoundException('Análisis no encontrado');await this.snapshots.collection.updateOne({_id:new Types.ObjectId(id)},{$set:{eliminado:true,eliminado_en:new Date(),eliminado_por:'usuario_local'}});return{mensaje:'Análisis eliminado correctamente',id};}
 private resumen(d:any){return{id:String(d._id),fecha_analisis:d.fecha_analisis,cliente:d.cliente,legajo:d.legajo,periodo:d.periodo,archivo:d.archivo_origen,estado:d.estado,veredicto:d.veredicto,diferencia:d.resumen?.diferencia_retencion};}
 private aplicarMetadataManual(liq:any,contexto?:any){
  const cliente=this.texto(contexto?.datos_cliente?.cliente_nombre);
  const legajo=this.texto(contexto?.datos_legajo?.legajo_numero);
  const periodo=this.entero(contexto?.datos_contexto?.periodo_fiscal);
  const mes=this.entero(contexto?.datos_contexto?.mes_liquidacion);
  const cambios:string[]=[];
  if(cliente&&liq.metadata?.cliente!==cliente){liq.metadata.cliente=cliente;cambios.push('cliente');}
  if(legajo&&liq.metadata?.legajo!==legajo){liq.metadata.legajo=legajo;cambios.push('legajo');}
  if(periodo&&liq.metadata?.periodo_fiscal!==periodo){liq.metadata.periodo_fiscal=periodo;cambios.push('periodo_fiscal');}
  if(mes&&mes>=1&&mes<=12&&liq.metadata?.mes_liquidacion!==mes){liq.metadata.mes_liquidacion=mes;liq.papel_trabajo_mes=mes;cambios.push('mes_liquidacion');}
  if(cambios.length){
   liq.advertencias??=[];
   liq.advertencias.push(`Metadata de analisis completada desde el formulario de carga: ${cambios.join(', ')}.`);
  }
 }
 private aplicarContextoManualEnLiquidacion(liq:any,contexto?:any){
  if(!contexto)return;
  const cliente=contexto.datos_cliente;
  const legajo=contexto.datos_legajo;
  if(cliente&&typeof cliente==='object'&&!Array.isArray(cliente)){
   liq.config_cliente={...(liq.config_cliente??{}),...Object.fromEntries(Object.entries(cliente).filter(([,v])=>v!==undefined&&v!==null&&v!==''&&v!=='desconocido'))};
  }
  if(legajo&&typeof legajo==='object'&&!Array.isArray(legajo)){
   liq.legajo_empleado={...(liq.legajo_empleado??{}),...Object.fromEntries(Object.entries(legajo).filter(([,v])=>v!==undefined&&v!==null&&v!==''&&v!=='desconocido'))};
  }
 }
 private normalizarContextoSiExiste(contexto?:any){if(!contexto)return undefined;const normalizado=this.contexto.normalizar(contexto);return{datos_cliente:this.limpiarGrupoContexto(normalizado.datos_cliente),datos_legajo:this.limpiarGrupoContexto(normalizado.datos_legajo),datos_siradig:this.limpiarGrupoContexto(normalizado.datos_siradig),datos_normativa:this.limpiarGrupoContexto(normalizado.datos_normativa),datos_novedades:this.limpiarGrupoContexto(normalizado.datos_novedades),datos_historial:this.limpiarGrupoContexto(normalizado.datos_historial),datos_ajuste_final:this.limpiarGrupoContexto(normalizado.datos_ajuste_final),datos_contexto:this.limpiarGrupoContexto(normalizado.datos_contexto)};}
 private limpiarGrupoContexto(grupo:any){if(!grupo||typeof grupo!=='object'||Array.isArray(grupo))return{};return Object.fromEntries(Object.entries(grupo).filter(([,v])=>this.tieneValorContexto(v)));}
 private tieneValorContexto(valor:any){return valor!==undefined&&valor!==null&&valor!==''&&String(valor).trim().toLowerCase()!=='desconocido';}
 private texto(valor:any){return valor!==undefined&&valor!==null&&String(valor).trim()!==''?String(valor).trim():null;}
 private entero(valor:any){if(valor===undefined||valor===null||valor==='')return null;const n=Number(valor);return Number.isInteger(n)?n:null;}
}
